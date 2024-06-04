import mongoose, {Schema } from "mongoose";
import { User } from "./user.models.js";


const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId, //One who is subscribing
        ref:"User"
    },
    channel:{
        type: Schema.Types.ObjectId, // one to whoam subscriber subscribing
        ref:"User"
    }
},{timestamps: true})


export const Subscription = new mongoose.model("Subscription",subscriptionSchema)