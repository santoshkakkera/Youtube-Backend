import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});


const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return "Couldnot Find the localFilePath"
    const response = await cloudinary.v2.uploader.upload(localFilePath, {
      resource_type: "auto",
    })
    console.log("File has been uploaded to Cloudinary!!", response.url);
    return response
  } catch (error) {
    fs.unlinkSync(localFilePath)
    return null;
  }
}

export {uploadOnCloudinary}