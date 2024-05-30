import { Router } from "express";
import { loginUser, logoutUser, registerUser } from '../controllers/user.controllers.js'
import { upload } from "../middlewares/multer.middlewares.js"
import { User } from "../models/user.models.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";


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

export default router 
