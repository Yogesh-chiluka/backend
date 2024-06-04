import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {Comment} from "../models/comment.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose"



const getVideoComments= asyncHandler(async(req,res) => {

    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const  skip = (page - 1)*limit;

    const videoComments = await Comment.find({video:videoId}).skip(skip).limit(limit)
    const totalVideosComments = await Comment.countDocuments({video: videoId});

    return res.status(200).json(
        new ApiResponse(200, {videoComments, totalVideosComments}, "comment successfully fetched")
    )

})

const addComment = asyncHandler(async(req,res) => {
    
    const {videoId} = req.params
    const { comment } = req.body

    const owner = req.user._id

    if(!comment){
        throw new ApiError(400, "Comment is required")
    }

    const newComment = await Comment.create(
        {
            content: comment,
            video: videoId,
            owner,
        }
    )

    await newComment.save()

    return res.status(200).json(

        new ApiResponse(200, newComment, "Comment successfully added")
    )
})

const updateComment = asyncHandler(async(req,res) => {

    const {commentId} = req.params
    const { comment } = req.body

    if(!comment){
        throw new ApiError(400, "Comment is required")
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

    return res.status(200).json(
        200,
        new ApiResponse(200, updateComment, "Comment successfully updated")
    )
})

const deleteComment = asyncHandler(async(req,res) => {

    const {commentId} = req.params

    await Comment.deleteOne({ _id:commentId })


    return res.status(200).json(
        200,
        new ApiResponse(200, req.user, "Comment successfully deleted")
    )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment 
 }


