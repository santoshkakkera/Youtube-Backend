import {v2 as cloudinary} from 'cloudinary';
import { log } from 'console';
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});


const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return "Couldnot Find the localFilePath"
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    })
    // console.log("File has been uploaded to Cloudinary!!", response.url);
    fs.unlinkSync(localFilePath)
    return response
  } catch (error) {    
    console.log(error);
    fs.unlinkSync(localFilePath)
    return null;
  }
}

export {uploadOnCloudinary}