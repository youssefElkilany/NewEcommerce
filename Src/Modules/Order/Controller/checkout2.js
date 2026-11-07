// Alternative two-step checkout. Original checkout.js remains independent.
import mongoose from 'mongoose'
import Stripe from 'stripe'
import Order from '../../../../DB/Models/order.model.js'
import Product from '../../../../DB/Models/product.model.js'
import Cart from '../../../../DB/Models/cart.model.js'
import Coupon from '../../../../DB/Models/coupon.model.js'
import Address from '../../../../DB/Models/address.model.js'
import Attempt from '../../../../DB/Models/checkoutPayment.model.js'


const fail = (message, cause = 400) => new Error(message, { cause })
const route = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)
const cents = value => Math.round(Number(value) * 100)
const contains = (ids = [], id) => ids.some(value => String(value) === String(id))

export function calculateTotal(subtotal, coupon) {
    if (!coupon) return subtotal
    if (subtotal < cents(coupon.minOrderAmount || 0)) throw fail('Order is below the coupon minimum')
    let discount = coupon.discountType === 'percentage'
        ? Math.round(subtotal * coupon.discountValue / 100) : cents(coupon.discountValue)
    if (coupon.discountType === 'percentage' && coupon.maxDiscountAmount != null) {
        discount = Math.min(discount, cents(coupon.maxDiscountAmount))
    }
    return Math.max(0, subtotal - discount)
}

const currencyFor = attempt => attempt.stripeParams?.line_items?.[0]?.price_data?.currency || 'egp'
const checkoutResponse = (order,attempt,extra={}) => ({order,currency:currencyFor(attempt),...extra})

function stripeClient() {
    if (!process.env.STRIPE_SECRET_KEY) throw fail('Stripe is not configured', 503)
    return new Stripe(process.env.STRIPE_SECRET_KEY)
}
async function removePurchasedQuantities(order, session) {
    const cart = await Cart.findOne({ createdBy: order.createdBy }).session(session)
    if (!cart) return
    for (const item of order.products) {
        // Preserve quantities added to the cart after this order was created.
        const entry = cart.products.find(row => String(row.productId) === String(item.productId) && String(row.variantId) === String(item.variantId))
        if (entry) entry.quantity = Math.max(0, entry.quantity - item.quantity)
    }
    // Remove fully purchased entries.
    cart.products = cart.products.filter(item => item.quantity > 0)
    await cart.save({ session })
}

// The pending -> terminal transition and its effects share one transaction.
// Duplicate webhooks/cancel requests therefore cannot release stock twice.
export async function finishOrder(orderId, status, unstartedOnly = false) {
    return mongoose.connection.transaction(async session => {
        // This write serializes payment startup against cancellation/cleanup.
        const payment = await Attempt.findOneAndUpdate( // update payment attempt to closed
            { orderId, closed: false, ...(unstartedOnly ? { paymentStartedAt: null } : {}) },
            { $set: { closed: true } }, { session, returnDocument: 'after' }
        )
        if (!payment) return
        const order = await Order.findOneAndUpdate(
            { _id: orderId, status: 'pendingPayment' },
            { $set: { status } }, { session, returnDocument: 'after' }
        )
        if (!order) return
        if (status === 'placed') {
            await removePurchasedQuantities(order, session)
        } else {
            // increment stock again if order failed and remove user from coupon
            for (const item of order.products) {
                const result = await Product.updateOne(
                    { _id: item.productId, 'variants._id': item.variantId },
                    { $inc: { 'variants.$.stock': item.quantity } }, { session }
                )
                if (result.modifiedCount !== 1) throw fail('Reserved variant missing; stock recovery needs attention', 409)
            }
            if (order.couponId) await Coupon.updateOne(
                { _id: order.couponId }, { $pull: { usedBy: order.createdBy } }, { session }
            )
        }
    })
}

async function reserve(body, user, key) {
    // Ensure unique indexes exist before accepting concurrent requests.
    await Attempt.init()
    const existing = await Attempt.findOne({ userId: user.id, key })
    if (existing) return existing
    const orderId = new mongoose.Types.ObjectId()
    try {
        return await mongoose.connection.transaction(async session => {
            const items = body.products ?? (await Cart.findOne({ createdBy: user.id }).session(session))?.products
            if (!items?.length) throw fail('Cart is empty')
            if (new Set(items.map(item => String(item.variantId))).size !== items.length) throw fail('Duplicate variants')
            const address = await Address.findOne({ _id: body.addressId, userId: user.id }).session(session)
            if (!address) throw fail('Address not found', 404)
            let coupon
            if (body.code) {
                coupon = await Coupon.findOne({ code: body.code.trim().toUpperCase(), expireDate: { $gt: new Date() } }).session(session)
                if (!coupon) throw fail('Coupon not found or expired')
                if (contains(coupon.usedBy, user.id)) throw fail('Coupon already used or reserved by this user')
                if (coupon.usageLimit != null && coupon.usedBy.length >= coupon.usageLimit) throw fail('Coupon usage limit reached')
            }
            const products = []
            let subtotal = 0
            for (const item of items) {
                if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw fail('Invalid quantity')
                const product = await Product.findOne({ _id: item.productId, isDeleted: false }).session(session)
                const variant = product?.variants.id(item.variantId)
                if (!variant || variant.isActive === false || variant.stock < item.quantity) throw fail('Variant unavailable', 409)
                if (coupon) {
                    const restricted = coupon.applicableProducts.length || coupon.applicableCategories.length
                    if (contains(coupon.excludedProducts, product.id) || (restricted &&
                        !contains(coupon.applicableProducts, product.id) && !contains(coupon.applicableCategories, product.categoryId))) {
                        throw fail('Coupon is not applicable to every ordered product')
                    }
                }
                const price = cents(variant.finalPrice)
                if (!Number.isSafeInteger(price) || price < 0) throw fail('Invalid product price')
                subtotal += price * item.quantity
                // Snapshot product data; payment never reads current catalog prices.
                products.push({
                    productId: product._id, variantId: variant._id, name: variant.name,
                    unitPrice: variant.price, paymentPrice: price / 100, quantity: item.quantity
                })

                // Decrement stock for this variant atomically.
                const updated = await Product.updateOne({
                    _id: product._id,
                    variants: { $elemMatch: { _id: variant._id, stock: { $gte: item.quantity } } }
                },
                    { $inc: { 'variants.$.stock': -item.quantity } }, { session })
                if (updated.modifiedCount !== 1) throw fail('Insufficient stock', 409)
            }

            // check maxDiscountAmount and minOrderAmount if coupon is applied
            const total = calculateTotal(subtotal, coupon)

            if (!Number.isSafeInteger(total) || !Number.isSafeInteger(subtotal)) throw fail('Invalid order total')
            if (coupon) {
                // Concurrent reservations write the same coupon document and retry on conflict.
                coupon.usedBy.push(user._id)
                await coupon.save({ session })
            }
            const card = body.paymentMethod === 'Card'
            const [order] = await Order.create([{
                _id: orderId, createdBy: user._id, products,
                phone: body.phone, note: body.note, couponId: coupon?._id,
                subTotal: subtotal / 100, finalPrice: total / 100,
                paymentMethod: card ? 'Card' : 'Cash', status: card ? 'pendingPayment' : 'placed',
                shippingAddress: {
                    name: address.name, phone: address.phone, country: address.country,
                    city: address.city, street: address.street, buildingNumber: address.buildingNumber,
                    floor: address.floor, apartment: address.apartmentNumber, additionalInfo: address.deliveryInstructions
                }
            }], { session })
            let stripeParams
            if (card) {
                const successUrl = new URL(process.env.STRIPE_SUCCESS_URL)
                successUrl.searchParams.set('orderId', String(orderId))
                const cancelUrl = new URL(process.env.STRIPE_CANCEL_URL)
                cancelUrl.searchParams.set('orderId', String(orderId))
                stripeParams = {
                    mode: 'payment', payment_method_types: ['card'], customer_email: user.email,
                    success_url: successUrl.toString(), cancel_url: cancelUrl.toString(),
                    expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
                    metadata: { orderId: String(orderId) },
                    // A single summary item charges exactly the locally calculated coupon total.
                    line_items: [{
                        price_data: {
                            currency: 'egp', product_data: { name: `Order ${orderId}` },
                            unit_amount: total
                        }, quantity: 1
                    }]
                }
            } else await removePurchasedQuantities(order, session)
            const [attempt] = await Attempt.create([{ userId: user._id, key, orderId, stripeParams, reservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000), closed: !card }], { session })
            return attempt
        })
    } catch (error) {
        if (error.code === 11000) {
            const winner = await Attempt.findOne({ userId: user.id, key })
            if (winner) return winner
        }
        throw error
    }
}

export async function applyStripeSession(attempt, remote) {
    const order = await Order.findById(attempt.orderId)
    if (!order || remote.metadata?.orderId !== String(order._id) ||
        (attempt.stripeSessionId && attempt.stripeSessionId !== remote.id)) throw fail('Checkout session mismatch', 409)

        // check if the payment is completed and the amount and currency match the order
    if (remote.status === 'complete' && ['paid', 'no_payment_required'].includes(remote.payment_status)) {
        // not imp
        if (remote.currency !== currencyFor(attempt) || remote.amount_total !== cents(order.finalPrice)) throw fail('Payment amount mismatch', 409)
        await finishOrder(order.id, 'placed')
    } else if (remote.status === 'expired') await finishOrder(order.id, 'cancelled')
}

export async function getStripeSession(attempt, stripe = stripeClient()) {
    if (attempt.stripeSessionId) return stripe.checkout.sessions.retrieve(attempt.stripeSessionId)
    // Never recreate after Stripe may have pruned the idempotency key (24 hours).
    if (Date.now() - attempt.createdAt.getTime() > 22 * 3600 * 1000) {
        throw fail('Session outcome needs reconciliation in Stripe; stock remains reserved. Do not use a new key.', 409)
    }// need to be explained
    let remote
    try {// create here doesn't mean that it will create a new session, if the idempotency key is already used it will return the existing session
        // 1-in case of session is created and the user closes the browser and tries to create a new session with the same key, it will return the existing session
        // 2-in case of session is created but not saved at attempt model
        remote = await stripe.checkout.sessions.create(attempt.stripeParams, { idempotencyKey: `checkout2:${attempt.orderId}` })
    } catch (error) {
        // Timeouts, conflicts and server errors have an unknown outcome: retain reservations.
        if (error.type === 'StripeInvalidRequestError' && error.statusCode === 400 &&
            error.code !== 'idempotency_key_in_use' && error.param !== 'expires_at') {
            await finishOrder(attempt.orderId, 'cancelled')
            throw fail('Stripe rejected checkout; reservations were released. Correct the request/configuration and use a new key.', 400)
        }
        throw fail('Stripe outcome is uncertain. Retry with the same Idempotency-Key or reconcile this order.', 503)
    }
    await Attempt.updateOne({ _id: attempt._id }, { $set: { stripeSessionId: remote.id } })
    return remote
}

// First request: save an immutable order. Same creation key always returns
// the original order, even if the caller changes the request body.
export const createOrder = route(async (req, res) => {
    const key = req.get('Idempotency-Key')
    if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw fail('Provide an Idempotency-Key of 8-128 letters, digits, underscores or hyphens')
    const existing = await Attempt.findOne({ userId: req.user.id, key })
    if (existing) return res.json(checkoutResponse(await Order.findById(existing.orderId),existing))
    if (req.body.paymentMethod === 'Card') {
        stripeClient()
        if (!process.env.endpointSecret) throw fail('Stripe webhook secret is required', 503)
        for (const name of ['STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL']) {
            try { if (!['http:', 'https:'].includes(new URL(process.env[name]).protocol)) throw new Error() }
            catch { throw fail(name + ' must be an HTTP(S) URL', 503) }
        }
    }
    const attempt = await reserve(req.body, req.user, key)
    res.status(200).json(checkoutResponse(await Order.findById(attempt.orderId),attempt))
})

async function ownedCheckout(req) {
    const attempt = await Attempt.findOne({ orderId: req.params.orderId, userId: req.user.id })
    if (!attempt) throw fail('Checkout not found', 404)
    const order = await Order.findOne({ _id: attempt.orderId, createdBy: req.user.id })
    if (!order) throw fail('Order not found', 404)
    return { attempt, order }
}

// Persist that a Stripe call MAY occur before making it. Once claimed, cleanup
// must never assume that an absent session ID means no remote session exists.
export async function claimPayment(attempt) {
    return mongoose.connection.transaction(async session => {
        const current = await Attempt.findById(attempt._id).session(session)
        if (!current || current.closed) throw fail('Checkout is closed', 409)
        if (current.paymentStartedAt) return current
        if (current.reservationExpiresAt <= new Date()) throw fail('Reservation expired; reconcile to release it', 409)
        current.paymentStartedAt = new Date()
        await current.save({ session })
        return current
    })
}

// Second request: only the owned order ID is accepted; purchase details cannot
// be changed here. Repeated requests recover the same Stripe session.
export const payment = route(async (req, res) => {
    let { attempt, order } = await ownedCheckout(req)
    if (order.status !== 'pendingPayment') return res.json(checkoutResponse(order,attempt))
    // if he didn't start payment session and reservation expires then release stock and cancel order
    if (!attempt.paymentStartedAt && attempt.reservationExpiresAt <= new Date()) {
        await finishOrder(order.id, 'cancelled', true)
        throw fail('Reservation expired; create a new order with a new key', 409)
    }
    attempt = await claimPayment(attempt)
    const remote = await getStripeSession(attempt)
    await applyStripeSession(attempt, remote)
    res.json(checkoutResponse(await Order.findById(attempt.orderId),attempt,{
        session: { id: remote.id, url: remote.url, status: remote.status }
    }))
})
// to be checked Later
export const reconcile = route(async (req, res) => {
    const { attempt, order } = await ownedCheckout(req)
    if (order.status === 'pendingPayment') { // to check that payment succeded
        if (!attempt.paymentStartedAt) {
            // A conditional transaction makes this safe even if payment starts
            // concurrently. If startup wins, a later reconcile checks Stripe.
            if (req.body.cancel === true || attempt.reservationExpiresAt <= new Date()) {
                await finishOrder(order.id, 'cancelled', true)
            }
        } else {
            let remote = await getStripeSession(attempt)
            if (req.body.cancel === true && remote.status === 'open') {
                remote = await stripeClient().checkout.sessions.expire(remote.id)
            }
            await applyStripeSession(attempt, remote)
        }
    }
    res.json(checkoutResponse(await Order.findById(attempt.orderId),attempt))
})
// we need to check also payment that are open and didn't reach stripe
// Invoke from a scheduled worker. Never release uncertain Stripe reservations. => can use bullMQ
export async function expireUnstartedOrders() {
    const attempts = Attempt.find({
        closed: false, paymentStartedAt: null,
        reservationExpiresAt: { $lte: new Date() }
    }).cursor()
    for await (const attempt of attempts) {
        await finishOrder(attempt.orderId, 'cancelled', true)
    }
}

export const checkoutWebhook = route(async (req, res) => {
    if (!process.env.endpointSecret) throw fail('Checkout webhook not configured', 503)
    let event
    try { event = stripeClient().webhooks.constructEvent(req.body, req.get('stripe-signature'), process.env.endpointSecret) }
    catch { throw fail('Invalid Stripe signature') }
    if (!['checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
        return res.json({ received: true })}

    const remote = event.data.object

    if (!mongoose.isValidObjectId(remote.metadata.orderId)) throw fail('Invalid order metadata')

    const attempt = await Attempt.findOne({ orderId: remote.metadata.orderId })
    if (!attempt) throw fail('Checkout not found', 404)
        
    await applyStripeSession(attempt, remote)
    res.json({ received: true })
})
