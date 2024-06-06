import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.models.js"

import { ApiResponse } from "../utils/ApiResponse.js"
import {uploadOnCloudinary,
    destroyOnCloudinary }from "../utils/cloudinary.js"
import { Video } from "../models/video.models.js"
import mongoose, { isValidObjectId } from "mongoose"
import { getWatchHistory } from "./user.controllers.js"

const getAllVideos = asyncHandler(async(req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;


    const pipeline = []

    if(query){
        pipeline.push({
            $search: {
                index: "search-videos",
                $text: {
                    query: query,
                    path: ["title", "description"] // search from title and description
                }
            }
        })
    }

    if(userId){
       if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId")
       } 

       pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
       })
    }
   
    //fetch published videos only
    pipeline.push({
        $match: {
            isPublished: true
        }
    })

    if( sortBy && sortType ){
        pipeline.push({
            $sort: {
                [sortBy] : sortType === "asc" ? 1 : -1
            }
        })
    } else {
        pipeline.push({
            $sort: {createdAt: -1}
        })
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
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
            $unwind: "$ownerDetails"
        }
    )


    const videoAggregate = Video.aggregate(pipeline)


    const options = {
        page: parseInt(page,10),
        limit: parseInt(limit,10)
    }

    const video = await Video.aggregatePaginate(videoAggregate, options)

    if(!video){
        throw new ApiError(400, "Failed while fetching videos data")
    }

    return res.status(200).json(
        new ApiResponse(200,
            video ,
            "Videos successfully fetched")
    ); // Send response with videos and total count
});



const publishAVideo = asyncHandler(async(req,res) => {
    const { title, description} = req.body

    if(
        [title, description ].some((field) =>
        field?.trim() === "") 
    ){
        throw new ApiError(400, "All field are required")
    }
   
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if(!videoLocalPath){
        throw new ApiError(400,"VideoFile in local file path is missing")
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail in local file path is missing")
    }
    
 
    const videoFile = await uploadOnCloudinary(videoLocalPath)
   
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile.url){
        throw new ApiError(400, "Error while uploading on video")
    }
    if(!thumbnail.url){
        throw new ApiError(400, "Error while uploading on thumbnail")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail:  thumbnail.url,
        title: title,
        description: description,
        duration: videoFile.duration,
        owner: req.user._id,
        isPublished: false
    })

    const videoUploaded = await Video.findById(video._id)

    if(!videoUploaded){
        throw new ApiError(500, "Something went wrong while uploading video")
    }

    return res.status(201).json(
        new ApiResponse(201, videoUploaded, "Video uploaded Successfully")
    )
})

const updateVideo =  asyncHandler(async(req,res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }

    const thumbnail = req.file?.path

    if(!thumbnail){
        throw new ApiError(400, "Thumbnail is required")
    }

    if(!(title || description || thumbnail)){
        throw new ApiError(400, "title or description or thumbnail are required")
    }
    

    const video = await Video.findById(videoId)

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"Your can't update video. Only owner can do it")
    }

    const updateThumbnail = await uploadOnCloudinary(thumbnail)

    if(!updateThumbnail){
        throw new ApiError(400,"Thumnail not uploaded on cloudinary")
    }

    const  thumbnailUrl = video.thumbnail

    const thumbnailFilename = thumbnailUrl.split('/').pop().split('.')[0]
    const thumbnailFiletype = thumbnailUrl.split('/').pop().split('.')[1]
    
    await destroyOnCloudinary(thumbnailFilename,thumbnailFiletype)


    const updateVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title,
                description,
                thumbnail: updateThumbnail.url
            }
        }
    )

    const updatedDetails = {
        title: updateVideo.title,
        description: updateVideo.description,
        thumbnail: updatedvide.thumbnail
    }

    return res.status(200).json(
        new ApiResponse(200, updatedDetails, "Video details updated successfully")
    )
})

const deleteVideo = asyncHandler(async(req,res) => {
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400,"No video found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,
            "You can't delete this video. Only owner can delete"
        )
    }

    const videoDeleted = await Video.findByIdAndDelete(video?._id)

    if(!videoDeleted){
        throw new ApiError(400, "Failed to delete the vide, please try again")
    }

    //delete video
    const  videoUrl = video.videoFile

    const videoFilename = videoUrl.split('/').pop().split('.')[0]
    const videoFiletype = videoUrl.split('/').pop().split('.')[1]
    
    await destroyOnCloudinary(videoFilename,videoFiletype)

    //delete thumbnali
    const  thumbnailUrl = video.thumbnail

    const thumbnailFilename = thumbnailUrl.split('/').pop().split('.')[0]
    const thumbnailFiletype = thumbnailUrl.split('/').pop().split('.')[1]
    
    await destroyOnCloudinary(thumbnailFilename,thumbnailFiletype)

    await Like.deleteMany({video: video._id})

    await Comment.deleteMany({video: video._id})
    

    return res.status(200).json(
        new ApiResponse(200,"Video is successfully deleted")
    )
})

const getVideoById = asyncHandler(async(req,res) => {
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId")
    }

    if(!isValidObjectId(req.user._id)){
        throw new ApiError(400, "Invalid userId")
    }

    const videoExist = await Video.findById(videoId)

    if(!videoExist){
        throw new ApiError(400, "Video dosen't exist")
    }

 
    const videoDetails = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup:{
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id, // Value to check if it exists in the array
                                            "$subscribers.subscriber" // Array field to check against
                                        ]
                                    },
                                    then: true, // Value if condition is true
                                    else: false // Value if condition is false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }   
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner:{
                        $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                req.user._id, // Value to check if it exists in the array
                                "$likes.likedBy" // Array field to check against
                            ]
                        },
                        then: true, // Value if condition is true
                        else: false // Value if condition is false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
                owner: 1,
                createdAt: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
        
    ])

    if(!videoDetails){
        throw new ApiError(400,"Error while fetching video details")
    }

    // Increment view count on video only when video is fetched by other than owner

    if(!(videoId.toString() === req.user._id.toString())){
        const updateView = await Video.updateOne(
                {
                    _id: videoId
                },
                {
                    $inc: {
                        views: 1
                    }
                }
            )

        if(!updateView){
            throw new ApiError(400, "Error while updating view")
        }
    }

    //add this to user watch history
    await User.updateOne(
        {
            _id: req.user._id
        },
        {
            $push: {
                watchhistory: videoId
            }
        }
    )

    return res.status(200).json(
        new ApiResponse(200,videoDetails,"Video successfully loaded by Id")
    )
})


const togglePublishStatus =  asyncHandler(async(req,res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"You can't perform this action. Only owner can publish/unpublish")
    }
    
    const toggleVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !(video?.isPublished)
            }
        },
        { new: true }
    )

    if(!toggleVideoPublish){
        throw new ApiError(400, "Error while toggle publishing video Try again")
    }


    res.status(200).json(
        new ApiResponse(200, 
            { isPublished: toggleVideoPublish?.isPublished},
            `Video successfully ${(toggleVideoPublish.isPublished? "Published":"Unpublished")}`
        )
    )
})


export {
    getAllVideos,
    publishAVideo,
    deleteVideo,
    getVideoById,
    togglePublishStatus,
    updateVideo,
}