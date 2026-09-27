import { asyncHandler } from "../Utills/errorHandler.js"

export const roles = {
    'Admin':'Admin',
    'User':'User'
}

// const dataMethods = ['body' , 'params' , 'query' , 'headers' , 'file']


// export const validation = (joiSchema)=>{
//     return async (req,res,next)=>{

    

//     let validationErrors = []

//     dataMethods.forEach(method => {
//         if(joiSchema[method])
//         {
//             const validationResult = joiSchema[method].validate(req[method],{abortEarly:false})
//             if(validationResult.error)
//             {
//                 validationErrors.push(validationResult.error.details)
//             }
//         }
//     });
// if(validationErrors.length > 0)
// {
//     return next(new Error(validationErrors).cause(404))
// }

// }}


export const validationn = (schema)=>{
    return async(req,res,next)=>{

        let data = {...req.body , ...req.params , ...req.query}
        if(req.file || req.files)
        {
            data.file = req.file || req.files
        }

        const validationResult = schema.validate(data,{abortEarly:false})
        if(validationResult.error?.details)
        {
            return res.status(400).json({message:"Validation Error",validationErr:validationResult.error?.details})
        }
         return next()
    }
   
}




// 3ndy object gowah kaza object w 3arf asamy objects deh ehh fna 3ayz data elgowa elobject
// to access data b3ml array feh asamy objects el3ayz data bta3tha