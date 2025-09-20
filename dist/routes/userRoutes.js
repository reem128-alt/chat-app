"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../utils/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            const errorResponse = {
                error: "Validation error",
                message: "Username, email, and password are required",
                statusCode: 400,
            };
            res.status(400).json(errorResponse);
            return;
        }
        if (password.length < 6) {
            const errorResponse = {
                error: "Validation error",
                message: "Password must be at least 6 characters long",
                statusCode: 400,
            };
            res.status(400).json(errorResponse);
            return;
        }
        const existingUser = await User_1.default.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            const errorResponse = {
                error: "User already exists",
                message: existingUser.email === email
                    ? "Email already registered"
                    : "Username already taken",
                statusCode: 409,
            };
            res.status(409).json(errorResponse);
            return;
        }
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        const newUser = new User_1.default({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        const token = (0, auth_1.generateToken)(newUser._id.toString());
        const authResponse = {
            user: {
                id: newUser._id.toString(),
                username: newUser.username,
                email: newUser.email,
                avatar: newUser.avatar,
                isOnline: newUser.isOnline,
            },
            token,
        };
        res.status(201).json({
            status: "success",
            data: authResponse,
            message: "User registered successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        const errorResponse = {
            error: "Registration failed",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        };
        res.status(500).json(errorResponse);
    }
});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            const errorResponse = {
                error: "Validation error",
                message: "Email and password are required",
                statusCode: 400,
            };
            res.status(400).json(errorResponse);
            return;
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            const errorResponse = {
                error: "Authentication failed",
                message: "Invalid email or password",
                statusCode: 401,
            };
            res.status(401).json(errorResponse);
            return;
        }
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            const errorResponse = {
                error: "Authentication failed",
                message: "Invalid email or password",
                statusCode: 401,
            };
            res.status(401).json(errorResponse);
            return;
        }
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        const token = (0, auth_1.generateToken)(user._id.toString());
        const authResponse = {
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                isOnline: user.isOnline,
            },
            token,
        };
        res.json({
            status: "success",
            data: authResponse,
            message: "Login successful",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Login error:", error);
        const errorResponse = {
            error: "Login failed",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        };
        res.status(500).json(errorResponse);
    }
});
router.get("/profile", auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            const errorResponse = {
                error: "Authentication error",
                message: "User not found",
                statusCode: 401,
            };
            res.status(401).json(errorResponse);
            return;
        }
        const userResponse = {
            id: req.user._id.toString(),
            username: req.user.username,
            email: req.user.email,
            avatar: req.user.avatar,
            isOnline: req.user.isOnline,
            lastSeen: req.user.lastSeen,
            createdAt: req.user.createdAt,
        };
        res.json({
            status: "success",
            data: userResponse,
            message: "Profile retrieved successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Profile error:", error);
        const errorResponse = {
            error: "Profile retrieval failed",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        };
        res.status(500).json(errorResponse);
    }
});
router.post("/logout", auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            const errorResponse = {
                error: "Authentication error",
                message: "User not found",
                statusCode: 401,
            };
            res.status(401).json(errorResponse);
            return;
        }
        await User_1.default.findByIdAndUpdate(req.user._id, {
            isOnline: false,
            lastSeen: new Date(),
        });
        res.json({
            status: "success",
            message: "Logout successful",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Logout error:", error);
        const errorResponse = {
            error: "Logout failed",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        };
        res.status(500).json(errorResponse);
    }
});
router.post("/avatar", auth_1.authenticateToken, upload_1.uploadAvatar, upload_1.handleUploadError, async (req, res) => {
    try {
        if (!req.user) {
            const errorResponse = {
                error: "Authentication error",
                message: "User not found",
                statusCode: 401,
            };
            res.status(401).json(errorResponse);
            return;
        }
        if (!req.file) {
            const errorResponse = {
                error: "No file uploaded",
                message: "Please select an image file to upload as avatar",
                statusCode: 400,
            };
            res.status(400).json(errorResponse);
            return;
        }
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const updatedUser = await User_1.default.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true, runValidators: true });
        if (!updatedUser) {
            const errorResponse = {
                error: "Update failed",
                message: "User not found",
                statusCode: 404,
            };
            res.status(404).json(errorResponse);
            return;
        }
        const userResponse = {
            id: updatedUser._id.toString(),
            username: updatedUser.username,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            isOnline: updatedUser.isOnline,
            lastSeen: updatedUser.lastSeen,
            createdAt: updatedUser.createdAt,
        };
        res.json({
            status: "success",
            data: userResponse,
            message: "Avatar uploaded successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Avatar upload error:", error);
        const errorResponse = {
            error: "Avatar upload failed",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        };
        res.status(500).json(errorResponse);
    }
});
router.get("/all", auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            const errorResponse = {
                error: "Authentication error",
                message: "User not found",
                statusCode: 401,
            };
            res.status(401).json(errorResponse);
            return;
        }
        const { search, limit = 50 } = req.query;
        let query = {};
        if (search && typeof search === "string") {
            query = {
                $or: [
                    { username: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            };
        }
        const users = await User_1.default.find(query)
            .select("-password")
            .limit(Number(limit))
            .sort({ username: 1 });
        const formattedUsers = users.map((user) => ({
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            createdAt: user.createdAt,
        }));
        res.json({
            status: "success",
            data: formattedUsers,
            message: "Users retrieved successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Get all users error:", error);
        const errorResponse = {
            error: "Failed to retrieve users",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        };
        res.status(500).json(errorResponse);
    }
});
router.put("/update", auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            const errorResponse = {
                error: "Authentication error",
                message: "User not found",
                statusCode: 401,
            };
            res.status(401).json(errorResponse);
            return;
        }
        const { username, email } = req.body;
        if (!username && !email) {
            const errorResponse = {
                error: "Validation error",
                message: "At least one field (username or email) must be provided. Use /avatar endpoint for avatar uploads.",
                statusCode: 400,
            };
            res.status(400).json(errorResponse);
            return;
        }
        if (username) {
            if (username.length < 3 || username.length > 20) {
                const errorResponse = {
                    error: "Validation error",
                    message: "Username must be between 3 and 20 characters",
                    statusCode: 400,
                };
                res.status(400).json(errorResponse);
                return;
            }
            const existingUser = await User_1.default.findOne({
                username,
                _id: { $ne: req.user._id },
            });
            if (existingUser) {
                const errorResponse = {
                    error: "Validation error",
                    message: "Username is already taken",
                    statusCode: 409,
                };
                res.status(409).json(errorResponse);
                return;
            }
        }
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                const errorResponse = {
                    error: "Validation error",
                    message: "Please provide a valid email address",
                    statusCode: 400,
                };
                res.status(400).json(errorResponse);
                return;
            }
            const existingUser = await User_1.default.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user._id },
            });
            if (existingUser) {
                const errorResponse = {
                    error: "Validation error",
                    message: "Email is already registered",
                    statusCode: 409,
                };
                res.status(409).json(errorResponse);
                return;
            }
        }
        const updateData = {};
        if (username)
            updateData.username = username;
        if (email)
            updateData.email = email.toLowerCase();
        const updatedUser = await User_1.default.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
        if (!updatedUser) {
            const errorResponse = {
                error: "Update failed",
                message: "User not found",
                statusCode: 404,
            };
            res.status(404).json(errorResponse);
            return;
        }
        const userResponse = {
            id: updatedUser._id.toString(),
            username: updatedUser.username,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            isOnline: updatedUser.isOnline,
            lastSeen: updatedUser.lastSeen,
            createdAt: updatedUser.createdAt,
        };
        res.json({
            status: "success",
            data: userResponse,
            message: "User profile updated successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Update user error:", error);
        const errorResponse = {
            error: "Update failed",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        };
        res.status(500).json(errorResponse);
    }
});
exports.default = router;
//# sourceMappingURL=userRoutes.js.map