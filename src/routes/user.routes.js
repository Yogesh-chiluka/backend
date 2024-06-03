import { Router } from "express";
import { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage, 
    getUserChannelProfile,
    getWatchHistory} from '../controllers/user.controllers.js'
import { upload } from "../middlewares/multer.middlewares.js"
import { User } from "../models/user.models.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";



const router = Router()



router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),       
    registerUser
)

router.route("/login").post(loginUser)

//router.route("/login").post(login)

//Secured routes
router.route('/logout').post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-account").patch(
    verifyJWT,
    updateAccountDetails)

router.route("/avatar").patch(
    verifyJWT, 
    upload.single("avatar"), 
    updateUserAvatar)

router.route("/cover-image").patch(verifyJWT,
     upload.single("coverImage"),
      updateUserCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistory)

//Test
router.route('/delete').post(
    upload.fields([
    {
        name:"avatar",
        maxCount:1
    }]),
    verifyJWT,
    updateUserAvatar)

export default router 
