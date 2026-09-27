import express from 'express'
import Bootstrap from './Src/index.route.js'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
//set directory dirname 
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, './config/.env') })
const app = express()


const port = process.env.PORT || 3000

Bootstrap(app , express)

// const dataMethods = ['body' , 'params' , 'query' , 'headers' , 'file']
// let applicableProducts = [1,2,3,4,5]
// let excludedProducts = [10,7,8,9,1]

// let data = {

//     body:{
//         name:"aaa"
//     },
//     params:{
//         age:10
//     }
// }

// dataMethods.forEach(methods =>{
//     if(data[methods])
//     {
//         console.log(data[methods]);

        
//     }
// })

//  if(applicableProducts?.some(id => excludedProducts?.includes(id)))
//     {
//         console.log("gg");   
//     }



    app.listen(port,()=>{
        console.log(`Server is running on port ${port}`);
    })


export default app
