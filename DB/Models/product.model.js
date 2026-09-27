import mongoose, { Schema , Types, model } from "mongoose";


const productSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    slug:{
        type:String,
        required:true
    },

     specifications: [
      {
        name: String,
        value: mongoose.Schema.Types.Mixed,
        _id:false
      //    validate: {
      //   validator: function (value) {
      //     return (
      //       typeof value === "string" ||
      //       typeof value === "number" ||
      //       typeof value === "boolean"
      //     );
      //   },
      //   message: "Specification value must be string, number, or boolean"
      // }
    
      }
    ],
     variants: [
      { // sku , options , price , discount , stock , mainImage , subImages
        sku: {
         type: String,
         required: true,
         unique:true,
         uppercase: true,
         trim: true
        },

        options: {
          type: Map,
          of: String
        },

        price: {
          type: Number,
          required: true,
          min:0
        },
        finalPrice:{
          type:Number,
          required:true,
          min:0
    },

        discount: {
          type:Number,
          min:0,
          max:100
        },

        stock: {
          type: Number,
          default: 1,
          min:0
        },

         mainImage:{
        type:Object,
    },
         subImages:[{
        type:Object
    }],

        // isActive: {
        //   type: Boolean,
        //   default: true
        // }
      }
    ],
     ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },

      count: {
        type: Number,
        default: 0
      }
    },
    isDeleted:{
      type:Boolean,
      default:false
    },
    cloudId:String,

    subCategoryId:{
        type:Types.ObjectId,
        ref:'Subcategory',
        required:true
    },
    brandId:{
        type:Types.ObjectId,
        ref:'Brand',
        required:true
    },
    createdBy:{
        type:Types.ObjectId,
        ref:'User',
         required:true
    },
},{
    timestamps:true
})


const productModel =  mongoose.models.Product || model('Product',productSchema)
export default productModel


// make empty schema for all models like user schema 

// what is upgradable in the future 

// inventory if there are many warehouse having same items


// ProductVariant {
//   productId,
//   sku,

//   options: {
//     color: "Black",
//     size: "M"
//   },

//   price: 500,
//   discount: 10,
//   image: "..."
// }


// Inventory {
//   productId,

//   variants: [
//     {
//       variantId,

//       warehouses: [
//         {
//           warehouseId,
//           stock: 20,
//           reservedStock: 2
//         }
//       ]
//     }
//   ]
// }