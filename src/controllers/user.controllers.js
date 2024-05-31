import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) =>{
    try{
        
        const user= await User.findById(userId)
       
        const accessToken =  user.generateAccessToken()
        console.log(accessToken)
        const refreshToken = user.generateRefreshToken()
        
        user.refreshtoken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken,refreshToken}

    }catch(error){
       // console.log(error)
        throw new ApiError(500,"Something went wrong while generating token")
    }

}   
    //  get uer details from input(frontend)
    //  validation - not empty
    //  check if user exist : userName and email
    //  check for images, check for avatar
    //  upload them to cloudinary, avatar
    //  create user object
    //  remove password and refresh token filed from response
    //  check for user creation
    // return response

const registerUser = asyncHandler(async (req,res)=>{

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
    //req ->body
    //username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie
const loginUser = asyncHandler(async (req,res)=>{
    
    const {email, username, password} = req.body

    if(!(username || email)){
        throw new ApiError(400,"Username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!User){
        throw new ApiError(404,"User dosen't exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }
    console.log("start generatig token ---------------------------")
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    

    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshtoken: undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly: true,
        secure: true    
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(200,{},"User logged out")
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    
    const incomingRefreshTokenn = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshTokenn){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshTokenn,
            process.env.ACCESS_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshTokenn !== user?.refreshtoken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken : newRefreshToken 
                },
                "Access token refreshed"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token" )
    }
})


export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
 }