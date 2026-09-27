import mongoose from "mongoose";


const connectDB = async()=>{
    return await mongoose.connect(process.env.DB_ATLAS)
    .then(()=>{
        console.log(`DB connected successfully`);
    })
    .catch((err)=>{
        console.log(`DB failed ${err}`);
    })
}

export default connectDB