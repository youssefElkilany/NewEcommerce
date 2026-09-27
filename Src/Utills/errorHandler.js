
export const asyncHandler = (fn)=>{
    return  (req,res,next)=>{
        return  fn(req,res,next).catch((err)=>{
            return next(new Error(err,{cause:500}))
        })
    }
}


export const globalErrorHandling = (err,req,res,next)=>{
return res.status(err.cause || 400).json({ msgError: err.message, stack: err.stack })
}