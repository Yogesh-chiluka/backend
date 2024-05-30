import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req,res)=>{
    //  get uer details from input(frontend)

    //  validation - not empty

    //  check if user exist : userName and email
    //  check for images, check for avatar
    //  upload them to cloudinary, avatar
    //  create user object
    //  remove password and refresh token filed from response
    //  check for user creation
    // return response

    const {fullname, email, username, password} = req.body
    //console.log("email :",email)

    if(
        [fullname, email, username, password].some((field) =>
        field?.trim() === "") 
    ){
        throw new ApiError(400, "All field are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username alredy exist")
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

   
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
   
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    


    if(!avatar){
        throw new ApiError(400,"Avatar field required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshtoken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered Successfully")
    )
})  

export { registerUser }