import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {Comment} from "../models/comment.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.models.js"
import validateFields from "../utils/validateFields.js"
import mongoose, { isObjectIdOrHexString, isValidObjectId, mongo } from "mongoose"
import { Tweet } from "../models/tweet.model.js"


const toggleVideoLike = asyncHandler(async(req,res) => {
    const {videoId} = req.params
    const userId = req.user._id 

    const isValidated = validateFields(videoId)

    if(!isValidated){
        throw new ApiError(400, "videoId is required")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId")
    }

    const videoExist = await Video.findById(videoId)

    if(!videoExist){
        throw new ApiError(400, "video dosen't exist to like")
    }

    const toggleLike = await Like.findOne({  video:videoExist._id, likedBy: userId })

    if(toggleLike){
        await Like.findByIdAndDelete(toggleLike._id);
        return res.status(200).json(
            new ApiResponse(200,{ liked: false },"unLiked")
        )
    }else{
        const newLike = await Like.create(
            { 
                video: videoId, 
                likedBy: userId 
            }
        );
        await newLike.save();

        return res.status(200).json(
            new ApiResponse(200,{ liked: true },"Liked")
        )
    }
})


const toggleCommentLike = asyncHandler(async(req,res) => {
    const {commentId} = req.params
    const userId = req.user._id 

    const isValidated = validateFields(commentId)

    if(!isValidated){
        throw new ApiError(400, "commentId is required")
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid commentId")
    }

    const commentExist = await Comment.findOne(commentId)

    if(!commentExist){
        throw new ApiError(400, "commnent dosen't exist")
    }

    const toggleComment = await Like.findOne({ comment:commentId, likedBy: userId })

    if(toggleComment){
        await Comment.findByIdAndDelete(toggleComment._id);
        return res.status(200).json(
            new ApiResponse(200,{ liked: false },"unLiked")
        )
    }else{
        const newLike = await Like.create(
            { 
                comment: commentId, 
                likedBy: userId 
            }
        );
        await newLike.save();

        return res.status(200).json(
            new ApiResponse(200,{ liked: true },"Liked")
        )
    }
})

const toggleTweetLike = asyncHandler(async(req,res) => {
    const {tweetId} = req.params
    const userId = req.user._id 

    const isValidated = validateFields(tweetId)

    if(!isValidated){
        throw new ApiError(400, "tweetId is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetId")
    }

    const tweetExist = await Tweet.findOne(tweetId)

    if(!tweetExist){
        throw new ApiError(400, "tweet dosen't exist")
    }

    const toggleLike = await Like.findOne({ tweet:tweetId, likedBy: userId })

    if(toggleLike){
        await Like.findByIdAndDelete(toggleLike._id);
        return res.status(200).json(
            new ApiResponse(200,{ liked: false },"unLiked")
        )
    }else{
        const newLike = await new Like({ tweet: tweetId, likedBy: userId });
        await newLike.save();
        return res.status(200).json(
            new ApiResponse(200,{ liked: true },"Liked")
        )
    }
})

const getLikedVideos = asyncHandler(async(req,res) => {

    const userId = req.user._id
    
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$ownerDetails",
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideos",
                
        },
        {
            $project: {
                _id: 1,
                likedVideos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullname: 1,
                        avatar: 1,
                    }
                }
            }
        }
    ])
    
    

    return res.status(200).json(
        new ApiResponse(200, likedVideos ,"Extracted all liked videos")
    )   // Extract just the video data from each like
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}