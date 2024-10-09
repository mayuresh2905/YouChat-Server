import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import jwt from "jsonwebtoken";
import { adminSecretKey } from "../app.js";
import { YOU_CHAT_TOKEN } from "../constants/config.js";
import { User } from "../models/user.js";


export const  isAuthenticated =  (req,res,next) => {
const token = req.cookies[YOU_CHAT_TOKEN];

if(!token) return next(new ErrorHandler("Please login to access this route", 401));

const decodedData = jwt.verify(token,process.env.JWT_SECRET);

req.user = decodedData._id;

next();
    
};

export const  adminOnly =  (req,res,next) => {
    const token = req.cookies["YouChat-admin-token"];
    
    if(!token) return next(new ErrorHandler("Only admin can access this route", 401));
    
    const secretKey= jwt.verify(token,process.env.JWT_SECRET);
    
    const isMatch = secretKey === adminSecretKey;

    if(!isMatch) return next(new ErrorHandler("Invalid Admin Key",401));
    
    next();
        
};

export const socketAuthenticator = async (err, socket, next) =>  {
    try {
        if (err)
            return next(err);
        const authToken = socket.request.cookies[YOU_CHAT_TOKEN];

        if (!authToken)
            return next(new ErrorHandler("Please login to access this route", 401));

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

        const user = await User.findById(decodedData._id);

        if (!user)
            return next(new ErrorHandler("Please login to access this route", 401));

        socket.user = user;

        return next();


    } catch (error) {
        console.log(error);
        
        return next(new ErrorHandler("Please login to access this route", 401));
    }
};