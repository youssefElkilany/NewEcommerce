import dotenv from 'dotenv'
import mongoose from 'mongoose'
import connectDB from '../DB/connection.js'
import { expireUnstartedOrders } from '../Src/Modules/Order/Controller/checkout2.js'

dotenv.config({ path: new URL('../config/.env', import.meta.url) })
try {
    await connectDB()
    await expireUnstartedOrders()
    console.log('Expired unstarted checkout2 reservations processed')
} finally {
    await mongoose.disconnect()
}
