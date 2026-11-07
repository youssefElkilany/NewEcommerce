import mongoose from 'mongoose'

// One immutable order per creation key; no request fingerprint in this flow.
const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    key: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    stripeParams: mongoose.Schema.Types.Mixed,
    stripeSessionId: String,
    reservationExpiresAt: { type: Date, required: true },
    paymentStartedAt: { type: Date, default: null },
    closed: { type: Boolean, default: false }
}, { timestamps: true })

schema.index({ userId: 1, key: 1 }, { unique: true })
schema.index({ closed: 1, paymentStartedAt: 1, reservationExpiresAt: 1 })
export default mongoose.models.CheckoutPayment || mongoose.model('CheckoutPayment', schema)