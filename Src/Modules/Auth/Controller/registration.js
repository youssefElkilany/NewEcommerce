
// signup , login , confirmEmail , forgetPass , 

import { compare } from "bcryptjs";
import userModel from "../../../../DB/Models/user.model.js";
import sendEmail from "../../../Utills/emailSender.js";
import { asyncHandler } from "../../../Utills/errorHandler.js";
import { hash } from "../../../Utills/hashing.js";
import { generateToken, verifyToken } from "../../../Utills/token.js";
import { nanoid , customAlphabet } from "nanoid";



export const signUp = asyncHandler(async (req,res,next)=>{

    const {email , name , password , cPassword , phone } = req.body


    if(password !== cPassword)
    {
        return next(new Error("password mismatch"))
    }

    const checkUser = await userModel.findOne({email})
    if(checkUser)
    {
        return next(new Error("email already exist"))
    }

    
const emailtoken =  generateToken({payload:{email}})
const token2 = generateToken({payload:{email}})


//body of email
 const html = `<a href = "${req.protocol}://${req.headers.host}/auth/emailConfirmation/${emailtoken}">EmailConfirmation </a>
                <br>
                <br>
                <a href = "${req.protocol}://${req.headers.host}/auth/newconfirmationemail/${token2}">Reconfirmation Email </a>`

    await sendEmail({to:email,subject:"email Confirmation",html}).catch((err)=>{
     return next(new Error(err))
   })

    const hashedPassword = hash({plainText:password})
    

    const user = await userModel.create({email,password:hashedPassword,userName:name,phoneNo:phone}).catch((err)=>{
       return next(new Error(err))
    })

    const cart = await cartModel.create({createdBy:user._id})

    return res.status(201).json({message:"sign up successfully" , user })
})


export const login = asyncHandler(async (req,res,next)=>{

    const {email , password} = req.body

    const user = await userModel.findOne({email,confirmEmail:true})
    if(!user)
    {
        return next(new Error("email not found"))
    }
    const flag = compare(password, user.password)//wrong here
    if(!flag)
    {
        return next(new Error("wrong password"))
    }

    const token = generateToken({payload:{id:user._id, email}})
    

    return res.status(200).json({message:"login successfully" , token})
})


export const confirmEmail = asyncHandler(async(req,res,next)=>{

    const {token} = req.params

    const {email} = verifyToken({token})
    if(!email)
    {
        return next(new Error("invalid token",{cause:404}))
    }

    const user = await userModel.findOne({email})
    if(!user)
    { // go to sign up page
        return next(new Error("email not found",{cause:404}))
    }
    if(user.status == 'blocked')
    {
        return next(new Error("you are not able to verify ur email",{cause:404}))
    }
    if(user.confirmEmail == false)
    {
        user.confirmEmail = true
   await user.save()
    }
    // send to login page

   return res.json({message:"verification completed"})
})


export const ResendEmail = asyncHandler(async(req,res,next)=>{

    const {token} = req.params

    const decodedToken = verifyToken({token})
    if(!decodedToken)
    {
        return next(new Error("invalid token",{cause:404}))
    }
     const user = await userModel.findOne({email:decodedToken.email})
    if(!user)
    {
        return next(new Error("email not found",{cause:404}))
    }
     if(user.confirmEmail == true)
    {
       // send him to login page
       return res.json("go to login page")
    }
    if(user.confirmationCount === 5)
    {
         user.status = 'blocked'
        await user.save()
        return next(new Error("your account is blocked can't verify ur email")) // ask about it 
    }

    const emailtoken =  generateToken({payload:{email:user.email}})
const token2 = generateToken({payload:{email:user.email}})


    const html = `<a href = "${req.protocol}://${req.headers.host}/auth/emailConfirmation/${emailtoken}">EmailConfirmation </a>
                <br>
                <br>
                <a href = "${req.protocol}://${req.headers.host}/auth/newconfirmationemail/${token2}">Reconfirmation Email </a>`

            //     user.confirmationCount = (0 || parseInt(user.confirmationCount)) + 1
            //   await  user.save()
            const updateUser = await userModel.updateOne({email:user.email},{$inc:{confirmationCount:1}})
    await sendEmail({to:user.email,subject:"email Confirmation",html}).catch((err)=>{
     return next(new Error(err))
   })

   
    return res.status(200).json({message:"email is sent"})
})


// forget password with sending link 
export const forgetPasswordLink = asyncHandler(async(req,res,next)=>{

    const {email} = req.body

    const user  = await userModel.findOne({email})
    if(!user)
    {
        return next(new Error("email not found",{cause:409}))
    }

    const emailtoken =  generateToken({payload:{email}})


    const html = `<a href = "${req.protocol}://${req.headers.host}/auth/resetpass/${emailtoken}">reset password </a>`

    await sendEmail({to:email,subject:"reset password",html}).catch((err)=>{
     return next(new Error(err))
   })

 return res.status(200).json({message:"email is sent"})

})

// reset password using link
export const resetPasswordLink = asyncHandler(async (req,res,next)=>{

    const {password , cPassword } = req.body
    const {token} = req.params

    const {email} = verifyToken({token})
    if(!email)
    {
        return next(new Error("invalid token"))
    }

    const user = await userModel.findOne({email})
    if(!user)
    {
        return next(new Error("email not found"))
    }

    if(password != cPassword)
    {
         return next(new Error("password mismatch"))
    }

    const hashedPassword = hash({plainText:password})

    user.password = hashedPassword
    user.forgetPassTime = Date.now() // to let user log out from every device to log in again with new password
    await user.save()

    return res.json({message:"password updated successfully"})
})




// forget password with sending Code
export const forgetPasswordCode = asyncHandler(async(req,res,next)=>{
     const {email} = req.body

    const user  = await userModel.findOne({email})
    if(!user)
    {
        return next(new Error("email not found",{cause:409}))
    }
    const nanoId = customAlphabet('1203456789',4)
    const forgetCode = nanoId()

user.forgetOtp = forgetCode
await user.save()


 const html = ` your otp is here  ${forgetCode}`

    await sendEmail({to:email,subject:"reset password",html}).catch((err)=>{
     return next(new Error(err))
   })

return res.json({message:"done"})
})


// reset password using otp
// add expiration for otp
export const resetPasswordCode = asyncHandler(async (req,res,next)=>{

    const {email , password , cPassword , otp } = req.body

    const user = await userModel.findOne({email,status:{$ne:"blocked"}})
    if(!user)
    {
        return next(new Error("email not found"))
    }
    if(user.forgetOtp !== otp || !otp)
    {
         return next(new Error("wrong OTP"))
    }

    if(password != cPassword)
    {
         return next(new Error("password mismatch"))
    }

    const hashedPassword = hash({plainText:password})

    user.password = hashedPassword
    user.forgetOtp = null
    user.forgetPassTime = Date.now()
    await user.save()

    return res.json({message:"password updated successfully"})
})