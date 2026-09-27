import connectDB from "../DB/connection.js"
import cors from 'cors'
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

  app.use(cors())

// let whiteList = [] // FE link
//   app.use(async (req, res, next) => {
//     let origin = req.headers.origin
//     if(!whiteList.includes(origin))
//     {
//       return next(new Error('Not allowed by CORS'))
//     }
//     await  res.setHeader('Access-Control-Allow-Origin',origin)
//    await res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE')
//    await res.setHeader('Access-Control-Allow-Headers','*')
//    await res.setHeader('Access-Control-Allow-Private-Network',true)
//     next()
//   })

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
    app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the E-Commerce API' })
})
app.all('/{*splat}', (req, res) => {
    return res.status(404).json({ message: 'Route not found' })
})
    app.use(globalErrorHandling)
    connectDB()

}

export default Bootstrap
