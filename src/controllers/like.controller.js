import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {Comment} from "../models/comment.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.models.js"


const toggleVideoLike = asyncHandler(async(req,res) => {
    const {videoId} = req.params
    const userId = req.user._id 

    const toggleLike = await Like.findOne({  video:videoId, likedBy: userId })

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
    
    const liked = await Like.find({likedBy: req.user._id})
    
    let likedVideos = [];
    for (const like of liked) {
        // Check if the like is for a video
        if (like.video) {
            const video = await Video.findById(like.video);
            if (video) {
                likedVideos.push(video);
            }
        }
    }

      return res.status(200).json(
        new ApiResponse(200,likedVideos,"Extracted all liked videos")
      )   // Extract just the video data from each like
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}