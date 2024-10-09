import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";
import { getBase64, getSockets } from "../lib/helper.js";


export const cookieOptions = {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true,
}

export const connectDB = (uri) => {
    mongoose
      .connect(uri,{ dbName: "YouChat"})
      .then((data)=> console.log(`Connected to DB: ${data.connection.host}`))
      .catch((err) => {
          throw err;
      })
}


export const sendToken = (res,user,code,message) => {
    const token = jwt.sign({_id:user._id}, process.env.JWT_SECRET);

    return res.status(code).cookie("YouChat-Token",token,cookieOptions).json({
        success:true,
        user,
        message,   
    })
}

export const emitEvent = (req,event,users,data) => {

    const io = req.app.get("io");
    const usersSocket = getSockets(users);
    io.to(usersSocket).emit(event,data);
    
}

export const uploadsFilesToCloudinary = async (files = []) => {

    const uploadPromises  = files.map((file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
                getBase64(file),
                {
                resource_type: "auto",
                public_id: uuid()
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            })
        })
    });

    try {
        const results = await Promise.all(uploadPromises);

        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url
       }));

        return formattedResults;

    } catch (error) {

        throw new Error("Error uploading files to cloudinary: ",error);
        
    }

}

export const deleteFilesfromCloudinary = async (public_ids) => {
      console.log("Delete Files from Cloudinary: ",public_ids);
      
}