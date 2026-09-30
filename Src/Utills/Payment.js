import Stripe from "stripe";

async function payment({
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY),
     payment_method_types = ['card'],
        mode = 'payment',
        customer_email,
        metadata,
        success_url = process.env.STRIPE_SUCCESS_URL,
        cancel_url = process.env.STRIPE_CANCEL_URL,
        line_items,
        discounts = []
}={}){
    const session = await stripe.checkout.sessions.create({
        payment_method_types,
        mode,
        customer_email,
        metadata,
        success_url,
        cancel_url,
        line_items,
        discounts
    })
    return session
}

export default payment