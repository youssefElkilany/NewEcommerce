import mongoose, { Schema , Types, model } from "mongoose"

const addressSchema = new Schema({

    label:{
        type:String,
         enum: ["home", "work", "other"],
      default: "home"
    },
    name:{
        type:String,
        required:true
    },
    phone:{
        type:String,
        required:true
    },
    country:{
        type:String,
       default:'Egypt',
    },
    city:{
        type:String,
        required:true
    },
    street:{
        type:String,
        required:true
    },
    buildingNumber: {
      type: String,
      trim: true
    },
    district:String,
      apartmentNumber: {
      type: String,
      trim: true
    },
    floor:String,
    landmark:String,
     deliveryInstructions: {
      type: String,
      trim: true,
      maxlength: 300
    },
     location: {
      type: {
        type: String,
        enum: ["Point"],
          default: "Point"
      },

      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    },
    isDefault:{
        type:Boolean,
        default:false,
    },
    userId:{
        type:Types.ObjectId,
        ref:"User",
        required:true
    }

},{
    timestamps:true
})

// There is also a more MongoDB-native approach if you want to perform geospatial queries such as:
// Find the closest store to this customer.
// will search for GeoJSON 

//  location: {
//     latitude: 30.0566,
//     longitude: 31.3301
//   },
// are useful for maps, distance calculations, courier routing, and “use my current location.”

addressSchema.index({ location: "2dsphere" });

const addressModel =  mongoose.models.Address || model('Address' , addressSchema)
export default addressModel
