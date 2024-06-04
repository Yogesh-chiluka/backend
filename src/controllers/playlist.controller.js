import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Playlist } from "../models/playlist.model.js"
import mongoose from "mongoose"

const createPlaylist = asyncHandler(async(req,res) => {
    const { name, description } = req.body
    const userId = req.user._id

    if(!(name && description)){
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

    res.status(200).json(
        new ApiResponse(200, playlist, "Playlist created successfully" )
    )

})

const addVideoToPlaylist = asyncHandler(async(req,res) => {
    const { videoId, playlistId } = req.params

    if(!(videoId && playlistId)){
        throw new ApiError(400, "videoId and playlistId is required")
    }

    const addvideo = await Playlist.findByIdAndUpdate(
        playlistId,
        { 
            $push: { 
                    video: videoId 
            } 
        },
        { new: true } 
    ) 

    return res.status(200).json(
        new ApiResponse(200, addvideo, "Video successfully added")
    )
})

const getPlaylistById = asyncHandler(async(req,res) => {
    const {playlistId} = req.params

    if(!playlistId){
        throw new ApiError(400, "Playlist successfully deleted")
    }

    const getPlaylist = await Playlist.findById(playlistId)

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

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField:"owner",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        {
            $unwind: "$userDetails" // Flatten the userDetails array
        }
    ])

    console.log(userPlaylists)

    return res.status(200).json(
        new ApiResponse(200, userPlaylists, "User playlists successfully fetched")
    )
})

const deletePlaylist = asyncHandler(async(req,res) => {
    const { playlistId } = req.params
    
    if(!playlistId){
        throw new ApiError(400,"PlaylistId is required")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200).json(
        new ApiResponse(200, "Playlist successfully deleted")
    )
}) 

const removeVideoFromPlaylist = asyncHandler(async(req,res) => {
    const { videoId, playlistId} = req.params

    if(!( videoId && playlistId )){
        throw new ApiError(400,"videoId and playlistId is required")
    }

    await Playlist.findByIdAndUpdate(
        playlistId,
        { 
            $pull: { 
                video: videoId 
            } 
        },
        { new: true }  // Return the updated document
      )
  
      return res.status(200).json(
        new ApiResponse(200,"Video successfully removed from playlist")
      )
})

const updatePlaylist = asyncHandler(async(req,res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if(!playlistId){
        throw new ApiError(400, "PlaylistId is required")
    }
    if(!(name || description)){
        throw new ApiError(400, "name or description is required")
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description
            }
        }
    )

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