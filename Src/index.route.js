import connectDB from "../DB/connection.js"
import userRouter from './Modules/User/user.route.js'
import brandRouter from './Modules/Brand/brand.route.js'
import productRouter from './Modules/Product/product.route.js'
import categoryRouter from './Modules/Category/category.route.js'
import subCategoryRouter from './Modules/SubCategory/subCategory.route.js'
import reviewRouter from './Modules/Review/review.route.js'
import couponRouter from './Modules/Coupon/coupon.route.js'
import cartRouter from './Modules/Cart/cart.route.js'
import orderRouter from './Modules/Order/order.route.js'
import authRouter from './Modules/Auth/auth.route.js'
import addressRouter from './Modules/Address/address.route.js'
import { globalErrorHandling } from "./Utills/errorHandler.js"
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


const Bootstrap = (app,express)=>{

    app.use(express.json())
    
  //   app.use(
  //   '/uploads',
  //   express.static(path.join(__dirname, '/uploads'))
  // )

    app.use('/auth',authRouter)
    app.use('/user',userRouter)
    app.use('/brand',brandRouter)
    app.use('/product',productRouter)
    app.use('/category',categoryRouter)
    app.use('/subcategory',subCategoryRouter)
    app.use('/review',reviewRouter)
    app.use('/coupon',couponRouter)
    app.use('/cart',cartRouter)
    app.use('/order',orderRouter)
    app.use('/address',addressRouter)
    app.use(globalErrorHandling)
    connectDB()

}

export default Bootstrap
