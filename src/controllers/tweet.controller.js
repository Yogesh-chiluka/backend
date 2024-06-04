import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose"
import { Tweet } from "../models/tweet.model.js"

const createTweet = asyncHandler(async(req,res) => {
    const { content } = req.body
    const userId = req.user.id

    if(!content){
        throw new ApiError(400,"content is required")
    }

    const tweet = await Tweet.create(
        {
            content: content,
            owner: userId
        }
    )

    await tweet.save()

    return res.status(200).json(
        new ApiResponse(200, tweet, "Tweet successfully created")
    )
})

const updateTweet = asyncHandler(async(req,res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if(!tweetId){
        throw new ApiError(400, "tweetId is required")
    }


    if(!content){
        throw new ApiError(400, "content is required")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },
        { new: true, runValidators: true }// Ensure you get the updated document
    )

    return res.status(200).json(
        new ApiResponse(200, updatedTweet,"tweet is successfully updated")
    )
})

const deleteTweet = asyncHandler(async(req,res) => {
    const { tweetId } = req.params

    if(!tweetId){
        throw new ApiError(400,"tweetId is required")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json(
        new ApiResponse(200,"Tweet successfully deleted")
    )
})

const getUserTweets = asyncHandler(async(req,res) => {
    const { userId } = req.params

    if(!userId){
        throw new ApiError(400,"userId is required")
    }
    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from:"users",
                localField: "owner",
                foreignField: "_id",
                as:"owner"
            }
        },
        {
            $unwind: "$owner" // Flatten the content array
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, userTweets, "userTweets successfully fetched   ")
    )
})

export {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet
}