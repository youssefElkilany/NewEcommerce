// import multer from "multer"
// import { nanoid } from "nanoid"
// import fs from 'fs'
// import { fileURLToPath } from "url"
// import path from "path"
// // const __dirname = fileURLToPath(import.meta.url)

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)

//  const fileValidation = {
//     image:[],
//     file:[],
// }

//  function fileUpload(customPath = "general"){
    
//      const basePath = `uploads/${customPath}`
//     const filePath = path.join(__dirname,`../${basePath}`) // elmkan elana wa2f feeh lel mkan el3ayz elswr yt7at feeh
//     console.log({filePath});
    
//      if(!fs.existsSync(filePath))
//         {
//             fs.mkdirSync(filePath,{recursive:true}) // if path not found create path
//         }


//     const storage = multer.diskStorage({
        
//         destination:(req,file,cb)=>{
//             cb(null,filePath)
//         },
//         filename:(req,file,cb)=>{
//             console.log({file:file.originalname});
//             const finalName = nanoid() + '_' + file.originalname
//             file.finalDest = basePath + '/' + finalName // destination that will be stored in database
//             console.log({dest:file.finalDest});
            
//             cb(null , finalName)
//         }
//     })

//     const upload  = multer({dest:filePath,storage})
//     return upload
// }

// export default fileUpload




// ---------------------------------------------------------------------------------
import multer from "multer"
import { nanoid } from "nanoid"
import fs from 'fs'
import { fileURLToPath } from "url"
import path from "path"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function fileUpload(customPath){

    const filePath = `uploads/${customPath}`
    const fullPath = path.join(__dirname,`../${filePath}`)
    console.log({fullPath});
    console.log({filePath});
    
    if(!fs.existsSync(fullPath))
    {
        fs.mkdirSync(fullPath,{recursive:true})
    }

    const storage = multer.diskStorage({

        destination:(req,file,cb)=>{
            cb(null,fullPath)
        },
        filename:(req,file,cb)=>{
            const finalName = nanoid() + '_' + file.originalname
            file.finalDest = `${filePath}/${finalName}` 
            cb(null,finalName)
        }
    })
    const upload = multer({storage})
    return upload
}


export default fileUpload