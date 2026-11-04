import mongoose from "mongoose";
const schema=new mongoose.Schema({
 product:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},
 user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
 order:{type:mongoose.Schema.Types.ObjectId,ref:"Order",required:true},
 rating:{type:Number,required:true,min:1,max:5,validate:Number.isInteger},
 comment:{type:String,trim:true,maxlength:1500,default:""},
 displayName:{type:String,trim:true,maxlength:80,required:true},
 verifiedPurchase:{type:Boolean,default:true,immutable:true},
 status:{type:String,enum:["pending","approved","rejected"],default:"pending",index:true},
 moderatedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null},
 moderatedAt:{type:Date,default:null},
},{timestamps:true});
schema.index({product:1,user:1},{unique:true});
schema.index({product:1,status:1,createdAt:-1});
schema.index({status:1,createdAt:-1});
export default mongoose.model("ProductReview",schema);