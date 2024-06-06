import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

import { ApiResponse } from "../utils/ApiResponse.js"

import {uploadOnCloudinary,
    destroyOnCloudinary }from "../utils/cloudinary.js"

import { Subscription } from "../models/subscription.models.js"
import mongoose, { isValidObjectId } from "mongoose"
import validateFields from "../utils/validateFields.js"
import { User } from "../models/user.models.js"

const toggleSubscription = asyncHandler(async(req,res) => {
    const { channelId } = req.params
    const userId = req.user._id 

    const isValidated = validateFields(channelId)

    if(!isValidated){
        throw new ApiError(400, "channelId is required")
    }

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "channelId isn't valid")
    }

    const channelExist = await User.findById(channelId)
    console.log(channelExist)
    if(!channelExist){
        throw new ApiError(400, "channel dosen't exist")
    }
   
    const toggleSubscription = await Subscription.findOne({ subscriber: userId, channel: channelId})
    
    if(toggleSubscription){
        await Subscription.findByIdAndDelete(toggleSubscription._id)
        return res.status(200).json(
            new ApiResponse(200,{ subscribed: false },"Successfully Unsubscribed")
        )
    }else{
        const newSubscription = await Subscription.create(
            {
                subscriber: userId,
                channel: channelId
            }
        )
        await newSubscription.save()

        if(!newSubscription){
            throw new ApiError(400,"Error while subscribing to channel")
        }

        return res.status(200).json(
            new ApiResponse(200,{ subscribed: true },"Successfully Subscribed")
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
                                        pipeline: [
                                            {
                                                $lookup: {
                                                    from:"subscriptions",
                                                    localField: "_id",
                                                    foreignField: "channel",
                                                    as: "subscribedToSubscriber"
                                                }
                                            },
                                            {
                                                $addFields: {
                                                    subscribedToSubscriber:{
                                                        $cond: {
                                                            if: {
                                                                $in : [
                                                                    channelId,
                                                                    "$subscribedToSubscriber.channel"
                                                                ]
                                                            },
                                                            then: true,
                                                            else: false
                                                        }
                                                    },
                                                    subscribersCount: {
                                                        $size: "$subscribedToSubscriber"
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                
                                },
                                {
                                    $unwind : "$subscriber"
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        subscriber: {
                                            _id:1,
                                            username:1,
                                            avatar:1,
                                            fullname:1,
                                            subscribedToSubscriber: 1,
                                            subscriber:1 
                                        }
                                    }
                                }
    ])

    res.status(200).json(
        new ApiResponse(200,subscribers,"Subscribers")
    )

})

const getSubscribedChannels = asyncHandler(async(req,res) => {
    const { subscriberId } = req.params

    const isValidated = validateFields(subscriberId)

    if(!isValidated){
        throw new ApiError(400,"Enter subscriber Id")
    }

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"subscriberId is Invalid")
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
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "subscribedChannelVideos",
                            
                        }
                    },
                    {
                        $addFields: {
                            totalVideos:{
                                $size: "$subscribedChannelVideos"
                            },
                            latestVideo: {
                                $last: "$subscribedChannelVideos",
                            },
                        }
                    },
                    
                ]
            },
        },
        {
            $unwind: "$subscribedChannel"
        },
        {
            $project: {
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    totalVideos: 1,
            
                    latestVideo: {
                        _id: 1,
                        videoFile: 1,
                        thumbnail: 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                    },
                },
            },
        },
    
        
       
        
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