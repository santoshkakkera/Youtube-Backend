import { Router } from "express";
import { loginUser, logOutUser, registerUser, refreshAccessToken} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    }
  ]),
  registerUser
)

router.route("/login").post(loginUser)

//securedRoutes

router.route("/logout").post(verifyJWT,logOutUser)
router.route("/refreshToken").post(refreshAccessToken)

export default router