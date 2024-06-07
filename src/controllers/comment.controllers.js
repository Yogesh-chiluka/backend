import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {Comment} from "../models/comment.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"
import validateFields from "../utils/validateFields.js"
import { Video } from "../models/video.models.js"
import cookieParser from "cookie-parser"



const getVideoComments = asyncHandler(async(req,res) => {

    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const isValidated = validateFields(videoId)

    if(!isValidated){
        throw new ApiError(200, "videoId is required")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(200, "Invalid videoId")
    }

    const videoExist = await Video.findById(videoId)

    if(!videoExist){
        throw new ApiError(400, "Video dosen't exist or deleted")
    }


    const videoComments = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoExist._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "commentLikes",
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "commentOwner",
            }
        },
        {
            $unwind: {
                path: "$commentOwner",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$commentLikes"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                req.user?._id, 
                                "$commentLikes.likedBy"
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
                createdAt: 1,
                likesCount: 1,
                commentOwner: {
                    username: 1,
                    fullname: 1,
                    avatar: 1
                },
                isLiked: 1
            }
        }
    ])
   
    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    }

    const paginatedVideoComments = await Comment.aggregatePaginate(videoComments,options)

    // const videoComments = await Comment.find({video:videoExist._id}).skip(skip).limit(limit)
    // const totalVideosComments = await Comment.countDocuments({video: videoId});

    return res.status(200).json(
        new ApiResponse(200, paginatedVideoComments, "comment successfully fetched")
    )

})

const addComment = asyncHandler(async(req,res) => {
    
    const {videoId} = req.params
    const { comment } = req.body

    const isValidated = validateFields(videoId,comment)

    if(!isValidated){
        throw new ApiError(400, "videoId and comment is required")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "videoId is Invalid")
    }

    const owner = req.user._id


    const newComment = await Comment.create(
        {
            content: comment,
            video: videoId,
            owner,
        }
    )

    await newComment.save()

    if(!newComment){
        throw new ApiError(400, "Error while creating comment")
    }

    return res.status(200).json(

        new ApiResponse(200, newComment, "Comment successfully added")
    )
})

const updateComment = asyncHandler(async(req,res) => {

    const {commentId} = req.params
    const { comment } = req.body

    const isValidated = validateFields(commentId,comment)

    if(!isValidated){
        throw new ApiError(400, "commentId and  comment is required")
    } 

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid commentId")
    }

    const commentExist = await Comment.findById(commentId)
    
    if(!commentExist){
        throw new ApiError(400, "comment doesnot exist")
    }

    if(commentExist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "Only owner can update comment")
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content: comment
            }
        },
        {new: true}
    )
    await updateComment.save()

    if(!updateComment){
        throw new ApiError(400, "Error while updating comment")
    }

    return res.status(200).json(
        new ApiResponse(200, updateComment, "Comment successfully updated")
    )
})

const deleteComment = asyncHandler(async(req,res) => {
    const {commentId} = req.params

    const isValidated = validateFields(commentId)

    if(!isValidated){
        throw new ApiError(400, "commentId is required")
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid commentId")
    }

    const commentExist = await Comment.findById(commentId)

    if(!commentExist){
        throw new ApiError(400, "comment doesn't exist")
    }

    const commentDeleted = await Comment.deleteOne({ _id: commentExist._id})

    if(!commentDeleted){
        throw new ApiError(400, "Error while deleting comment")
    }

    return res.status(200).json(
        new ApiResponse(200, commentDeleted , "Comment successfully deleted")
    )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment 
 }


