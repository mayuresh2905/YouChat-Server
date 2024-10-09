import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { cookieOptions, emitEvent, sendToken, uploadsFilesToCloudinary } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";

// Create a new user and save it to the database and save token in cookie
export const newUser = TryCatch(async (req,res,next) => {
    const {name, username, password, bio} = req.body;

    const file = req.file;

    if(!file) return next(new ErrorHandler("Please Upload Avatar",404));
   
    const result = await uploadsFilesToCloudinary([file]);
  
    const avatar = {
        public_id: result[0].public_id,
        url: result[0].url
    }
    
    const user = await User.create({
        name,
        bio,
        username,
        password,
        avatar
    }) 

    sendToken(res, user, 201, "User Created Sucessfully");
})

// Login user and save token in cookie
export const login = TryCatch(async (req,res,next) => {
    const { username, password} = req.body;

    const user = await User.findOne({ username }).select("+password");

    if(!user) return next( new ErrorHandler("Invalid Username Or Password",404))

  
    
    const isMatch = await compare(password, user.password);

    if (!isMatch) return next( new ErrorHandler("Invalid Username Or Password",404));

    sendToken(res, user, 201, `Welcome Back, ${user.name}`);
   
});

export const getMyProfile =  TryCatch(async (req,res) => {
    const user = await User.findById(req.user);
    res.status(200).json({
        success: true,
        user,
    })
});

export const Logout =  TryCatch(async (req,res) => {
    
   return  res.status(200).cookie("YouChat-Token","",{...cookieOptions, maxAge: 0}).json({
        success: true,
        message: "Logged Out Successfully",
    })
});

export const searchUser =  TryCatch(async (req,res) => {
    
    const {name} = req.query;

    const myChats = await Chat.find({
        groupChat: false,
        members: req.user
    });

    //All Users from my chats means friends or people I have chatted with
    const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

    const allUsersExceptMeAndFriends = await User.find({
        _id: { $nin: allUsersFromMyChats},
        name: { $regex: name, $options: "i"}
    })

    const users = allUsersExceptMeAndFriends.map(({_id,name,avatar})=>({
        _id,
        name,
        avatar: avatar.url,
    }))



    return  res.status(200).json({
         success: true,
         message:name,
         users
     })
 });

export const sendFriendRequest = TryCatch( async (req,res,next) => {

    const { userId } = req.body;

    const request = await Request.findOne({
        $or: [
            {sender: req.user, receiver: userId},
            {sender: userId, receiver: req.user}
        ]
    });

    if(request) return next(new ErrorHandler("Request already sent",400));

    await Request.create({
        sender: req.user,
        receiver: userId
    });

    emitEvent(req,NEW_REQUEST, [userId]);

    return  res.status(200).json({
        success: true,
        message: "Friend Request Sent",
    })
});

export const acceptFriendRequest = TryCatch( async (req,res,next) => {
   const { requestId, accept } = req.body;

   const request = await Request.findById(requestId).populate("sender","name").populate("receiver","name");

   if(!request) return next(new ErrorHandler("Request not found",404));

   if(request.receiver._id.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not authorized to accept this request",401))

   if (!accept) {

    await request.remove();

    return res.status(200).json({
        success: true,
        message: "Friend Request Rejected"
       })
    
   }

   const members = [request.sender._id, request.receiver._id];

   await Promise.all([
    Chat.create({
        members,
        name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
   ]);

   emitEvent(req,REFETCH_CHATS,members);


   return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id
   });
});

export const getAllNotifications = TryCatch( async(req,res,next) => {

    const requests = await Request.find({ receiver: req.user}).populate(
        "sender",
        "name avatar"
    );

    const allRequests = requests.map(({_id, sender}) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
        }
    }))

    res.status(200).json({
        success: true,
        allRequests
    })
});

export const getMyFriends = TryCatch( async(req,res,next) => {

    const chatId = req.query.chatId;

    const chats = await Chat.find({
      members: req.user,
      groupChat: false,
    }).populate("members", "name avatar");
  
    const friends = chats.map(({ members }) => {
      const otherUser = getOtherMember(members, req.user);
  
      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    });
  
    if (chatId) {
      const chat = await Chat.findById(chatId);
  
      const availableFriends = friends.filter(
        (friend) => !chat.members.includes(friend._id)
      );
  
      return res.status(200).json({
        success: true,
        friends: availableFriends,
      });
    } else {
      return res.status(200).json({
        success: true,
        friends,
      });
    }
});