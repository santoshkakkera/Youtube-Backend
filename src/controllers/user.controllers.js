import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { log } from "console";
import jwt from "jsonwebtoken";
import { use } from "react";

const generateAccessAndRefreshTokens = async(userId) => {
  try {
    // console.log(userId);
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return {accessToken,refreshToken}
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access Token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser)
    throw new ApiError(400, "User with email or username Already Exists");

  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) throw new ApiError(400, "Avatar is required");

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdId = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdId) {
    throw new ApiError(500, "Something gone wrong while registering User");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, createdId, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  /*
  req body -> data
  check Username and password and validate with the database
  if correct assign accessToken and refreshToken
  send cookies to user
  send response
  */
 const {email, username, password} = req.body;

 if(!username && !email){
  throw new ApiError(400, "Username or Email is required")
 }

 const searchUser = await User.findOne({
  $or:[{username},{email}]
 })
 if(!searchUser){
  throw new ApiError(404, "user does not exist")
 }

 const isPasswordValid = await searchUser.isPasswordCorrect(password)
 if(!isPasswordValid){
  throw new ApiError(401, "Password is Incorrect")
 }

 const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(searchUser._id)

 const loggedInUser = await User.findById(searchUser._id).select("-password -refreshToken")

 const options = {
  httpOnly: true,
  secure: true
 }
// console.log("loginAccessToken", accessToken, refreshToken);

 return res
 .status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",refreshToken, options)
 .json(
  new ApiResponse(
    200, 
    {
    user: loggedInUser, accessToken, refreshToken
  }, 
  "UserLoggedIn successfully")
 )
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
  httpOnly: true,
  secure: true
 }
 return res
 .status(200)
 .clearCookie("accessToken", options)
 .clearCookie("refreshToken", options)
 .json(new ApiResponse(200, "User Logged Out Successfully"))
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401, "unothourized Request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id)
    
    if(!user){
      throw new ApiError(401, "Invalid Refresh Token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh Token is expired")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    res
    .status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200,{accessToken, newRefreshToken}, "Access tokens are refreshed"))
  } catch (error) {
    throw new ApiError(400, error?.message || "Invalid Refresh Token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body
  const user = await User.findById(req.user._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  
  if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid Old password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "password Changed Successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "Curremt User fetched successfully"))
})

const updateAccountDetials = asyncHandler(async (req, res) => {
  const {fullName, email} = req.body

  if(!fullName || !email){
    throw new ApiError(400, "All fields are required")
  }
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated Successfully"))
})

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url){
    throw new ApiError(400, "Eror while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "avatar Updated successfully"))
})

const updatecoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
    throw new ApiError(400, "CoverImage file is missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!avatar.url){
    throw new ApiError(400, "Eror while uploading on Cloudinary")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Cover Image Updated successfully"))
})

export { 
  registerUser, 
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetials,
  updateAvatar,
  updatecoverImage,
};
