import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

import { ApiResponse } from "../utils/ApiResponse.js"
import {uploadOnCloudinary,
    destroyOnCloudinary }from "../utils/cloudinary.js"
import { Subscription } from "../models/subscription.models.js"
import mongoose from "mongoose"

const toggleSubscription = asyncHandler(async(req,res) => {
    const { channelId } = req.params
    const userId = req.user._id 

    const toggleSubscription = await Subscription.findOne({ subscriber: userId, channel: channelId})
    
    if(toggleSubscription){
        await Subscription.findByIdAndDelete(toggleSubscription._id)
        return res.status(200).json(
            new ApiResponse(200,{ liked: false },"Successfully Unsubscribed")
        )
    }else{
        const newSubscription = await Subscription.create(
            {
                subscriber: userId,
                channel: channelId
            }
        )
        await newSubscription.save()
        return res.status(200).json(
            new ApiResponse(200,{ liked: true },"Successfully Subscribed")
        )
    }
})

const getUserChannelSubscribers = asyncHandler(async(req,res) => {
    const { channelId } = req.params

    if(!channelId){
        throw new ApiError(400,channelId)
    }

    const subscribers  = await Subscription.aggregate([
                                {
                                    $match: {
                                        channel: new mongoose.Types.ObjectId(channelId)
                                    }
                                },
                                {
                                    $lookup:{
                                        from: "users",
                                        localField: "subscriber",
                                        foreignField: "_id",
                                        as: "subscriber",
                                        
                                    }
                                
                                }
    ])

    res.status(200).json(
        new ApiResponse(200,subscribers,"Subscribers")
    )

})

const getSubscribedChannels = asyncHandler(async(req,res) => {
    const { subscriberId } = req.params

    if(!subscriberId){
        throw new ApiError(400,"Enter subscriber Id")
    }

    const channelsSubscribed = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
            }
        }
    ])

    res.status(200).json(
        new ApiResponse(200,channelsSubscribed,"get subscribed details")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}