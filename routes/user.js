import express from "express";
import { acceptFriendRequest, getAllNotifications, getMyFriends, getMyProfile, login, Logout, newUser, searchUser, sendFriendRequest } from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validateHandler } from "../lib/validators.js";


const app = express.Router();

app.post("/new", singleAvatar,registerValidator(),validateHandler,newUser);
app.post("/login",loginValidator(),validateHandler, login);

// After here user must be logged in to access routes
app.use(isAuthenticated);
app.get("/me",getMyProfile);
app.get("/logout",Logout);
app.get("/search",searchUser);
app.put("/sendrequest",sendRequestValidator(),validateHandler,sendFriendRequest);
app.put("/acceptrequest",acceptRequestValidator(),validateHandler,acceptFriendRequest);
app.get("/notifications",getAllNotifications);
app.get("/friends",getMyFriends);

export default app; 