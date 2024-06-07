import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Playlist } from "../models/playlist.model.js"
import mongoose, { isValidObjectId } from "mongoose"
import validateFields from "../utils/validateFields.js"
import { Video } from "../models/video.models.js"
import { use } from "bcrypt/promises.js" 
import { User } from "../models/user.models.js"

const createPlaylist = asyncHandler(async(req,res) => {
    const { name, description } = req.body
    const userId = req.user._id

    const isValidated = validateFields(name,description)

    if(!isValidated){
        throw new ApiError(400,"Name and description  is required")
    }

    const playlist = await Playlist.create(
        {
            name,
            description,
            owner: userId
        }
    )
    await playlist.save()

    if(!playlist){
        throw new ApiError(400,"Error while creating playlist")
    }

    res.status(200).json(
        new ApiResponse(200, playlist, "Playlist created successfully" )
    )

})

const addVideoToPlaylist = asyncHandler(async(req,res) => {
    const { videoId, playlistId } = req.params

    const isValidated = validateFields(videoId,playlistId)

    if(!isValidated){
        throw new ApiError(400, "videoId and playlistId is required")
    }

    if(!(isValidObjectId(videoId) && isValidObjectId(playlistId))){
        throw new ApiError(400, "Invalid videoId or playlistId")
    }

    const playlistExist = await Playlist.findById(playlistId)

    const videoExist = await Video.findById(videoId)

    if(!(playlistExist && videoExist)){
        throw new ApiError(400, "Invalid playlistExist or videoExist")
    }

    if(playlistExist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "Only owner can update playlist")
    }

    const addVideo = await Playlist.findByIdAndUpdate(
        playlistExist._id,
        { 
            $push: { 
                    video: videoId 
            } 
        },
        { new: true } 
    ) 

    if(!addVideo){
        throw new ApiError(400, "Error while adding video to playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, addVideo, "Video successfully added")
    )
})

const getPlaylistById = asyncHandler(async(req,res) => {
    const {playlistId} = req.params

    const isValidated = validateFields(playlistId)

    if(!isValidated){
        throw new ApiError(400, "playlistId is requires")
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlistId")
    }

    const playlistExist = await Playlist.findById(playlistId)

    if(!playlistExist){
        throw new ApiError(400, "Playlist dosen't exist")
    }

    const getPlaylist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistExist._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField:"_id",
                as: "videosInPlaylist",
                pipeline: [
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "video",
                            as: "videoLikeDetails"
                        }
                    },
                    {
                        $addFields: {
                            totalLikes: {
                                $size:"$videoLikeDetails"
                            }
                        }
                    }
                ]
            }
        },
        {
            $match: {
                "videosInPlaylist.isPublished": true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "videoOwner"
            }
        },
        {
            $addFields:{
                totalVideos: {
                    $size: "$videosInPlaylist"
                },
                totalViews: {
                    $sum: "$videosInPlaylist.views"
                },
                owner: {
                    $first: "$videoOwner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,

                videosInPlaylist: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        VideoFile: 1,
                        thumbnail: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                        totalLikes: 1
                },
                videoOwner: {
                    username: 1,
                    fullname: 1,
                    avatar: 1
                }

            }
        }
    ])

    if(!getPlaylist){
        throw new ApiError(400,"Error while getting playlist or playlist dosen't exist or deleted")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            getPlaylist,
            "Playlist successfully fetched"
        )
    )

})

const getUserPlaylists = asyncHandler(async(req,res) => {
    const { userId } = req.params

    const isValidated = validateFields(userId)

    if(!isValidated){
        throw new ApiError(400, "userId is requires")
    }

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid userId")
    }

    const userExist = await User.findById(userId)

    if(!userExist){
        throw new ApiError(400, "user dosen't exist")
    }

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videosInUserPlaylist",
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videosInUserPlaylist"
                },
                totalViews: {
                    $sum: "$videosInUserPlaylist.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
       
    ])

    if(!userPlaylists){
        throw new ApiError(400, "playlists dosen't exist or deleted")
    }

    return res.status(200).json(
        new ApiResponse(200, userPlaylists, "User playlists successfully fetched")
    )
})

const deletePlaylist = asyncHandler(async(req,res) => {
    const { playlistId } = req.params

    const isValidated = validateFields(playlistId)
    
    if(!isValidated){
        throw new ApiError(400,"playlistId is required")
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlistId")
    }

    const playlistExist = await Playlist.findById(playlistId)

    if(!playlistExist){
        throw new ApiError(400, "Playllist doesn't exist or deleted")
    }

    if(playlistExist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "Only owner can delete playlist")
    }

    const isPlaylistDeleted = await Playlist.findByIdAndDelete(playlistId)

    if(!isPlaylistDeleted){
        throw new ApiError(400, "Error while deleting playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, "Playlist successfully deleted")
    )
}) 

const removeVideoFromPlaylist = asyncHandler(async(req,res) => {
    const { videoId, playlistId} = req.params

    const isValidated = validateFields(videoId,playlistId)

    if(!isValidated){
        throw new ApiError(400,"videoId and playlistId is required")
    }

    if(!(isValidObjectId(videoId) && isValidObjectId(playlistId))){
        throw new ApiError(400, "Invalid videoId or playlistId")
    }

    const playlistExist = await Playlist.findById(playlistId)

    if(!playlistExist){
        throw new ApiError(400, "playlist doesnot exist")
    }

    if(playlistExist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "Only owner can remove video playlist")
    }

    const videoExistInPlaylist = await Playlist.findOne({_id:playlistExist._id, video:videoId})

    if(!videoExistInPlaylist){
        throw new ApiError(400, "video doesnot exist in playlist")
    }

    const isPlaylistUpdated= await Playlist.findByIdAndUpdate(
                                playlistId,
                                { 
                                    $pull: { 
                                        video: videoId 
                                    } 
                                },
                                { new: true }  // Return the updated document
                            )

      if(!isPlaylistUpdated){
            throw new ApiError(400,"Error while updating playlist")
      }
  
      return res.status(200).json(
        new ApiResponse(200,"Video successfully removed from playlist")
      )
})

const updatePlaylist = asyncHandler(async(req,res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    const isValidated = validateFields(playlistId)

    if(!isValidated){
        throw new ApiError(400, "PlaylistId is required")
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(200, "Invalid playlistId")
    }

    if(!(name || description)){
        throw new ApiError(400, "name or description is required")
    }

    const playlistExist = await Playlist.findById(playlistId)

    if(!playlistExist){
        throw new ApiError(400, "Playlist dosen't exist")
    }

    if(playlistExist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "Only owner can update playlist")
    }

    const updatePlaylist = await Playlist.updateOne(
        {
            _id:playlistExist._id
        },
        {
            $set: {
                name,
                description
            }
        }
    )

    if(!updatePlaylist){
        throw new ApiError(400, "Error while updating playllist")
    }

    return res.status(200).json(
        new ApiResponse(200,updatePlaylist,"Playlist updated successfully")
    )
})

export {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist
}