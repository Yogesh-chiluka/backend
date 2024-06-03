import mongoose, {Schema } from "mongoose";

const playlistSchema = Schema(
    {
        name:{
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true,
        },
        Videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        Owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)


export const Playlist = new mongoose.model("Playlist",playlistSchema)