import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.models.js"

import { ApiResponse } from "../utils/ApiResponse.js"
import {uploadOnCloudinary,
    destroyOnCloudinary }from "../utils/cloudinary.js"
import { Video } from "../models/video.models.js"

const getAllVideos = asyncHandler(async(req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const queryObject = {};
    if (query) {
        queryObject.$text = { $search: query };
    }
    if (userId) {
        queryObject.userId = userId;
    }

    // Sorting options
    let sortOptions = {};
    if (sortBy) {
        sortOptions[sortBy] = sortType === 'desc' ? -1 : 1;
    } else {
        sortOptions = { _id: 1 };
    }
    const skip = (page - 1) * limit;

    const videos = await Video.find(queryObject).skip(skip).limit(limit).sort(sortOptions);
    const totalVideos = await Video.countDocuments(queryObject); // Get total count for pagination

    res.status(200).json(
        new ApiResponse(200,{ videos, totalVideos },"Videos successfully fetched")
    ); // Send response with videos and total count
});

const publishAVideo = asyncHandler(async(req,res) => {
    const { title, description} = req.body
   
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if(!(videoLocalPath && thumbnailLocalPath)){
        throw new ApiError(400,"Video and Thumbnail is required")
    }
 
    const videoFile = await uploadOnCloudinary(videoLocalPath)
   
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    // const url = videoFile.url

    // const filename = url.split('/').pop().split('.')[0]

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
        owner: req.user._id
    })

    if(!video){
        throw new ApiError(500, "Something went wrong while publishing videos the user")
    }

    return res.status(201).json(
        new ApiResponse(201, video, "Video published Successfully")
    )
})

const updateVideo =  asyncHandler(async(req,res) => {
    const { videoId } = req.params
    //const {title, description, thumbnail} = req.body
    const thumbnail = req.file?.path

    console.log(videoId)

    if(!thumbnail){
        throw new ApiError(400, "Thumbnail is required")
    }

    const video = await Video.findById(videoId)


    const filename = video.videoFile.split('/').pop().split('.')[0]
    const type = video.videoFile.split('/').pop().split('.')[1]
    console.log(filename,type)

    await destroyOnCloudinary(filename,type)

    const setThumbnail = await uploadOnCloudinary(thumbnail)

    const getVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                thumbnail:setThumbnail.url
            }
        }
    )

    return res.status(200).json(
        new ApiResponse(200, getVideo, "Video details updated successfully")
    )
})

const deleteVideo = asyncHandler(async(req,res) => {
    const {videoId} = req.params

    const video = await Video.findById(videoId)

    const  videoUrl = video.videoFile

    const filename = videoUrl.split('/').pop().split('.')[0]
    const type = videoUrl.split('/').pop().split('.')[1]
    //console.log("file name: " +filename+ " type:"+type )
    await destroyOnCloudinary(filename,type)

    await Video.findByIdAndDelete(videoId)

    return res.status(200).json(
        new ApiResponse(200,"Video is successfully deleted")
    )
})

const getVideoById = asyncHandler(async(req,res) => {
    const {videoId} = req.params
 
    const video = await Video.findById(videoId)


    return res.status(200).json(
        new ApiResponse(200,video,"Video successfully loaded by Id")
    )
})


const togglePublishStatus =  asyncHandler(async(req,res) => {
    const { videoId } = req.params

    const getVideo = await Video.findById(videoId)

    let published = getVideo.isPublished 

    published = !published


    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: published
            }
        }
    )
    console.log(video.isPublished)
    res.status(200).json(
        new ApiResponse(200,published? "Published":"unpublished")
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