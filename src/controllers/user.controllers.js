import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { log } from "console";

const registerUser = asyncHandler(async (req, res) => {
  // get data from frontend
  // check all required fields are not empty
  // check if the user is not present already
  // check for images, check for avatar
  // upload them to cloudinary
  // create userObject - create entry in db
  // remove password and refresh token from response
  // check for usercreation does not have null response
  //return res
  const { fullName, email, username, password } = req.body;
  // console.log("email: ", email);
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
  // const coverImageLocalPath = req.files?.coverImage[0]?.path
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

export { registerUser };
