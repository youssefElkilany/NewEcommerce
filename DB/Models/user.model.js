import mongoose, { Schema , Types, model } from "mongoose";


const userSchema = new Schema({
    // firstName:{
    //     type:String,
    //     required:true
    // },
    // lastName:{
    //     type:String,
    //     required:true
    // },
    userName:{
        type:String
    },
    email:{
        type:String,
        unique:true,
        required:true,
        lowercase:true
    },
    password:{
        type:String,
        required:true
    },
    confirmEmail:{
        type:Boolean,
        default:false
    },
    age:{
        type:String,
        min:[15,"minimum age is 15"],
        max:[90,"Maximum age is 90"]
    },
    // whishList:[{
    //     productId:Types.ObjectId,
    //     ref:'Product'
    // }],

    phoneNo:{
        type:String,
        // minLength:11,
        // maxLength:11
    },
    status:{
        type:String,
        enum:['blocked','online']
    },
     role: {
        type: String,
        default: 'User',
        enum: ['User', 'Admin' , 'Seller']
    },
    confirmationCount:Number, // relatedTo confirmation of email
    forgetOtp:String,
    forgetPassTime:Date


},{
    timestamps:true
})


const userModel = mongoose.models.User || model('User',userSchema)
export default userModel


// make empty schema for all models like user schema 
