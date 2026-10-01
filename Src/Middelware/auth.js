import userModel from "../../DB/Models/user.model.js"
import { asyncHandler } from "../Utills/errorHandler.js"
import { verifyToken } from "../Utills/token.js"
import { roles } from "./validation.js"

const Auth =  (roles = [])=>{
    return asyncHandler(async (req,res,next) =>{

        const {authorization} = req.headers

        if(!authorization?.startsWith(process.env.BEARER_KEY))
        {
            return next(new Error("invalid bearer key"))
        }
        const token = authorization.split(process.env.BEARER_KEY)[1]
         if (!token) {
            return res.json({ message: "In-valid token" })
        }
        
         const decodedToken = verifyToken({token})
         
         if(!decodedToken?.id)
         {
            return next( new Error("invalid token"))
         }

          const user = await userModel.findById(decodedToken.id)
          if(!user)
          {
            return next(new Error("user not found"))
          }
          

          if(parseInt(user.forgetPassTime?.getTime() / 1000) > decodedToken.iat)
          {
            return next(new Error("expired Token you need to sign in again",{cause:400}))
          }
          
          if(!roles?.includes(user.role))
          {
             return next(new Error( "u are not authorized" ,{cause:403}))
          }

          // authorization here check roles

          req.user = user
          return next()
    }
)
}


export default Auth