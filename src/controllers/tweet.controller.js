import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import validateFields from "../utils/validateFields.js"

const createTweet = asyncHandler(async(req,res) => {
    const { content } = req.body
    const userId = req.user.id

    const isValidated = validateFields(content) 

    if(!isValidated){
        throw new ApiError(400,"content is required")
    }

    const tweet = await Tweet.create(
        {
            content: content,
            owner: userId
        }
    )
    await tweet.save()

    if(!tweet){
        throw new ApiError(400, "Error while creating tweet")
    }

    return res.status(200).json(
        new ApiResponse(200, tweet, "Tweet successfully created")
    )
})

const updateTweet = asyncHandler(async(req,res) => {
    const { tweetId } = req.params
    const { content } = req.body

    const isValidated = validateFields(tweetId,content)

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetId")
    }

    if(!isValidObjectId){
        throw new ApiError(400, "tweetId and content is required")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400, "Tweet dosen't exist to update")
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "Only owner can update the tweet")
    }

    const updatedTweet = await Tweet.updateOne(
        {
            _id:tweetId,
        },
        {
            $set: {
                content
            }
        },
        { new: true, runValidators: true }// Ensure you get the updated document
    )

    if(!updateTweet){
        throw new ApiError(400,"Error while updating tweet")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedTweet,"tweet is successfully updated")
    )
})

const deleteTweet = asyncHandler(async(req,res) => {
    const { tweetId } = req.params

    const isValidated = validateFields(tweetId) 

    if(!isValidated){
        throw new ApiError(400,"tweetId is required")
    }

    const findTweet = await Tweet.findById(tweetId)

    if(!findTweet){
        throw new ApiError(400, "Tweet dosen't exist")
    }

    if(findTweet?.owner.toString() !== req?.user._id.toString()){
        throw new ApiError(400, "Only owner can delete the tweet")
    }

    const deletedTweet = await Tweet.deleteOne({_id:tweetId})

    if(!deletedTweet){
        throw new ApiError(400, "Error while deleting tweet. Try again")
    }

    return res.status(200).json(
        new ApiResponse(200,
            deletedTweet,
            "Tweet successfully deleted"
        )
    )
})

const getUserTweets = asyncHandler(async(req,res) => {
    const { userId } = req.params

    const isValidated = validateFields(userId)

    if(!isValidated){
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
                as:"ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails"
                },
                ownerDetails: {
                    $first: "$ownerDetails"
                },
                isLikedBy: {
                    $cond: {
                        if: {
                            $in : [
                                req.user._id,
                                "$likeDetails.likedBy"
                            ]
                        },
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
           $project: {
                content: 1,
                ownerDetails: 1,
                createdAt: 1,
                isLiked: 1 ,
                likesCount: 1
           } 
        }
    ])

    if(!userTweets){
        throw new ApiError(400, "Error while fetching tweets")
    }

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