"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
const User_1 = __importDefault(require("../models/User"));
const Message_1 = __importDefault(require("../models/Message"));
const auth_1 = require("../utils/auth");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
router.get("/debug/:userId", auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("🔍 DEBUG: Testing room query for user:", userId);
        const rooms = await ChatRoom_1.default.find({
            $or: [{ "participants.user": userId }, { createdBy: userId }],
            isActive: true,
        });
        console.log("🔍 DEBUG: Found rooms:", rooms.length);
        rooms.forEach((room, index) => {
            console.log(`DEBUG Room ${index + 1}:`, {
                id: room._id.toString(),
                name: room.name,
                participants: room.participants.map((p) => ({
                    user: p.user.toString(),
                    role: p.role,
                })),
                createdBy: room.createdBy.toString(),
            });
        });
        res.status(200).json({
            status: "success",
            data: {
                userId,
                roomsFound: rooms.length,
                rooms: rooms.map((room) => ({
                    id: room._id.toString(),
                    name: room.name,
                    participants: room.participants.map((p) => ({
                        user: p.user.toString(),
                        role: p.role,
                    })),
                    createdBy: room.createdBy.toString(),
                })),
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Debug error:", error);
        res.status(500).json({
            status: "error",
            message: "Debug failed",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
        });
    }
});
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        console.log("🔍 Fetching rooms for user:", userId);
        console.log("🔍 Query will search for:", {
            "participants.user": userId,
            createdBy: userId,
        });
        const allRooms = await ChatRoom_1.default.find({ isActive: true });
        console.log("🔍 All active rooms in database:", allRooms.length);
        allRooms.forEach((room, index) => {
            console.log(`All Room ${index + 1}:`, {
                id: room._id.toString(),
                name: room.name,
                participants: room.participants.map((p) => ({
                    user: p.user.toString(),
                    role: p.role,
                })),
                createdBy: room.createdBy.toString(),
                isUserInThisRoom: room.participants.some((p) => p.user.toString() === userId) ||
                    room.createdBy.toString() === userId,
            });
        });
        const participantRooms = await ChatRoom_1.default.find({
            "participants.user": userId,
            isActive: true,
        });
        console.log("🔍 Rooms where user is participant:", participantRooms.length);
        participantRooms.forEach((room, index) => {
            console.log(`Participant Room ${index + 1}:`, {
                id: room._id.toString(),
                name: room.name,
                participants: room.participants.map((p) => ({
                    user: p.user.toString(),
                    role: p.role,
                })),
            });
        });
        const creatorRooms = await ChatRoom_1.default.find({
            createdBy: userId,
            isActive: true,
        });
        creatorRooms.forEach((room, index) => {
        });
        const userIdObj = new mongoose_1.default.Types.ObjectId(userId);
        const rooms = await ChatRoom_1.default.find({
            $or: [
                { "participants.user": userId },
                { "participants.user": userIdObj },
                { createdBy: userId },
                { createdBy: userIdObj },
            ],
            isActive: true,
        })
            .populate({
            path: "participants.user",
            select: "username avatar isOnline",
            model: "User",
        })
            .populate({
            path: "lastMessage",
            populate: {
                path: "sender",
                select: "username",
                model: "User",
            },
        })
            .populate("createdBy", "username")
            .sort({ lastActivity: -1 });
        console.log("📋 Found rooms:", rooms.length);
        rooms.forEach((room, index) => {
            console.log(`Room ${index + 1}:`, {
                id: room._id.toString(),
                name: room.name,
                participants: room.participants.length,
                createdBy: room.createdBy.toString(),
                participantIds: room.participants.map((p) => p.user.toString()),
                isUserCreator: room.createdBy.toString() === userId,
                isUserParticipant: room.participants.some((p) => p.user.toString() === userId),
                isUserCreatorObjId: room.createdBy.toString() === userIdObj.toString(),
                isUserParticipantObjId: room.participants.some((p) => p.user.toString() === userIdObj.toString()),
            });
        });
        console.log("🔍 Manual verification:");
        const manualCheck = allRooms.filter((room) => {
            const isParticipant = room.participants.some((p) => p.user.toString() === userId);
            const isCreator = room.createdBy.toString() === userId;
            return isParticipant || isCreator;
        });
        console.log("🔍 Manual check found rooms:", manualCheck.length);
        manualCheck.forEach((room, index) => {
            console.log(`Manual Room ${index + 1}:`, {
                id: room._id.toString(),
                name: room.name,
                reason: room.createdBy.toString() === userId ? "creator" : "participant",
            });
        });
        const formattedRooms = rooms.map((room) => ({
            id: room._id.toString(),
            name: room.name,
            description: room.description,
            type: room.type,
            participants: room.participants.map((p) => ({
                user: p.user._id.toString(),
                username: p.user.username,
                avatar: p.user.avatar,
                isOnline: p.user.isOnline,
                role: p.role,
                joinedAt: p.joinedAt,
            })),
            createdBy: room.createdBy.toString(),
            isActive: room.isActive,
            lastMessage: room.lastMessage
                ? {
                    id: room.lastMessage._id.toString(),
                    content: room.lastMessage.content,
                    sender: {
                        id: room.lastMessage.sender.toString(),
                        username: room.lastMessage.sender.username,
                    },
                    timestamp: room.lastMessage.createdAt,
                }
                : null,
            lastActivity: room.lastActivity,
            createdAt: room.createdAt,
        }));
        res.status(200).json({
            status: "success",
            data: formattedRooms,
            message: "Rooms retrieved successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error fetching user rooms:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch rooms",
            timestamp: new Date().toISOString(),
        });
    }
});
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user._id) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated or invalid user ID",
                timestamp: new Date().toISOString(),
            });
        }
        const userId = user._id.toString();
        const { name, description, type = "group" } = req.body;
        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Room name is required and must be a non-empty string",
                timestamp: new Date().toISOString(),
            });
        }
        if (!["private", "group", "public"].includes(type)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid room type. Must be 'private', 'group', or 'public'",
                timestamp: new Date().toISOString(),
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid user ID format",
                timestamp: new Date().toISOString(),
            });
        }
        const userIdObj = new mongoose_1.default.Types.ObjectId(userId);
        const roomData = {
            name: name.trim(),
            description: description?.trim() || "",
            type,
            createdBy: userIdObj,
            participants: [
                {
                    user: userIdObj,
                    role: "admin",
                    joinedAt: new Date(),
                },
            ],
            isActive: true,
            lastActivity: new Date(),
            createdAt: new Date(),
        };
        console.log("Creating room with data:", {
            name: roomData.name,
            type: roomData.type,
            createdBy: roomData.createdBy.toString(),
            participants: "Creator added as admin participant",
        });
        const newRoom = new ChatRoom_1.default(roomData);
        await newRoom.save();
        await newRoom.populate({
            path: "participants.user",
            select: "username avatar isOnline",
        });
        const formattedRoom = {
            id: newRoom._id.toString(),
            name: newRoom.name,
            description: newRoom.description,
            type: newRoom.type,
            participants: newRoom.participants.map((p) => ({
                user: p.user._id.toString(),
                username: p.user.username,
                avatar: p.user.avatar,
                isOnline: p.user.isOnline,
                role: p.role,
                joinedAt: p.joinedAt,
            })),
            createdBy: newRoom.createdBy.toString(),
            isActive: newRoom.isActive,
            lastMessage: null,
            lastActivity: newRoom.lastActivity,
            createdAt: newRoom.createdAt,
        };
        return res.status(201).json({
            status: "success",
            data: formattedRoom,
            message: "Room created successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error creating room:", error);
        if (error instanceof mongoose_1.default.Error.ValidationError) {
            const messages = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                status: "error",
                message: "Validation failed",
                errors: messages,
                timestamp: new Date().toISOString(),
            });
        }
        if (error instanceof mongoose_1.default.Error.CastError) {
            return res.status(400).json({
                status: "error",
                message: `Invalid ${error.path}: ${error.value}`,
                timestamp: new Date().toISOString(),
            });
        }
        return res.status(500).json({
            status: "error",
            message: "Failed to create room",
            error: error instanceof Error ? error.message : "Unknown error occurred",
            timestamp: new Date().toISOString(),
        });
    }
});
router.get("/:roomId", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const roomId = req.params.roomId;
        if (!mongoose_1.default.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid room ID",
                timestamp: new Date().toISOString(),
            });
        }
        const room = await ChatRoom_1.default.findOne({
            _id: roomId,
            $or: [{ "participants.user": userId }, { createdBy: userId }],
        })
            .populate({
            path: "participants.user",
            select: "username avatar isOnline",
            model: "User",
        })
            .populate({
            path: "lastMessage",
            populate: {
                path: "sender",
                select: "username",
                model: "User",
            },
        })
            .populate("createdBy", "username");
        if (!room) {
            return res.status(404).json({
                status: "error",
                message: "Room not found or access denied",
                timestamp: new Date().toISOString(),
            });
        }
        const formattedRoom = {
            id: room._id.toString(),
            name: room.name,
            description: room.description,
            type: room.type,
            participants: room.participants.map((p) => ({
                user: p.user._id.toString(),
                username: p.user.username,
                avatar: p.user.avatar,
                isOnline: p.user.isOnline,
                role: p.role,
                joinedAt: p.joinedAt,
            })),
            createdBy: room.createdBy.toString(),
            isActive: room.isActive,
            lastMessage: room.lastMessage
                ? {
                    id: room.lastMessage._id.toString(),
                    content: room.lastMessage.content,
                    sender: {
                        id: room.lastMessage.sender.toString(),
                        username: room.lastMessage.sender.username,
                    },
                    timestamp: room.lastMessage.createdAt,
                }
                : null,
            lastActivity: room.lastActivity,
            createdAt: room.createdAt,
        };
        res.status(200).json({
            status: "success",
            data: formattedRoom,
            message: "Room retrieved successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error fetching room:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch room",
            timestamp: new Date().toISOString(),
        });
    }
});
router.post("/:roomId/join", auth_1.authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id.toString();
        if (!mongoose_1.default.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid room ID",
                timestamp: new Date().toISOString(),
            });
        }
        const room = await ChatRoom_1.default.findById(roomId);
        if (!room) {
            return res.status(404).json({
                status: "error",
                message: "Room not found",
                timestamp: new Date().toISOString(),
            });
        }
        if (!room.isActive) {
            return res.status(400).json({
                status: "error",
                message: "Room is not active",
                timestamp: new Date().toISOString(),
            });
        }
        const isParticipant = room.participants.some((p) => p.user.toString() === userId);
        if (!isParticipant) {
            room.participants.push({
                user: new mongoose_1.default.Types.ObjectId(userId),
                role: "member",
                joinedAt: new Date(),
            });
            room.lastActivity = new Date();
            await room.save();
        }
        await room.populate("participants.user", "username avatar isOnline");
        const formattedRoom = {
            id: room._id.toString(),
            name: room.name,
            description: room.description,
            type: room.type,
            participants: room.participants.map((p) => ({
                user: p.user._id.toString(),
                username: p.user.username,
                avatar: p.user.avatar,
                isOnline: p.user.isOnline,
                role: p.role,
                joinedAt: p.joinedAt,
            })),
            createdBy: room.createdBy.toString(),
            isActive: room.isActive,
            lastMessage: null,
            lastActivity: room.lastActivity,
            createdAt: room.createdAt,
        };
        res.status(200).json({
            status: "success",
            data: formattedRoom,
            message: "Successfully joined room",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error joining room:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to join room",
            timestamp: new Date().toISOString(),
        });
    }
});
router.post("/:roomId/leave", auth_1.authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id.toString();
        if (!mongoose_1.default.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid room ID",
                timestamp: new Date().toISOString(),
            });
        }
        const room = await ChatRoom_1.default.findById(roomId);
        if (!room) {
            return res.status(404).json({
                status: "error",
                message: "Room not found",
                timestamp: new Date().toISOString(),
            });
        }
        room.participants = room.participants.filter((p) => p.user.toString() !== userId);
        if (room.participants.length === 0) {
            room.isActive = false;
        }
        room.lastActivity = new Date();
        await room.save();
        res.status(200).json({
            status: "success",
            message: "Successfully left room",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error leaving room:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to leave room",
            timestamp: new Date().toISOString(),
        });
    }
});
router.post("/:roomId/participants", auth_1.authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId: newParticipantId, role = "member" } = req.body;
        const currentUserId = req.user._id.toString();
        if (!mongoose_1.default.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid room ID",
                timestamp: new Date().toISOString(),
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(newParticipantId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid user ID",
                timestamp: new Date().toISOString(),
            });
        }
        const room = await ChatRoom_1.default.findById(roomId);
        if (!room) {
            return res.status(404).json({
                status: "error",
                message: "Room not found",
                timestamp: new Date().toISOString(),
            });
        }
        if (!room.isActive) {
            return res.status(400).json({
                status: "error",
                message: "Room is not active",
                timestamp: new Date().toISOString(),
            });
        }
        console.log("🔍 Room participants:", room.participants.map((p) => ({
            user: p.user.toString(),
            role: p.role,
        })));
        const currentUserParticipant = room.participants.find((p) => p.user?.toString() === currentUserId);
        console.log("Current user participant:", currentUserParticipant);
        const isRoomCreator = room.createdBy.toString() === currentUserId;
        const isAdminOrModerator = currentUserParticipant &&
            ["admin", "moderator"].includes(currentUserParticipant.role);
        if (!isRoomCreator && !isAdminOrModerator) {
            console.log("Permission denied - User is not room creator or admin/moderator");
            return res.status(403).json({
                status: "error",
                message: "Only room creators, admins and moderators can add participants",
                timestamp: new Date().toISOString(),
            });
        }
        const isAlreadyParticipant = room.participants.some((p) => p.user.toString() === newParticipantId);
        if (isAlreadyParticipant) {
            console.log("User is already a participant:", newParticipantId);
            return res.status(400).json({
                status: "error",
                message: "User is already a participant in this room",
                timestamp: new Date().toISOString(),
            });
        }
        const user = await User_1.default.findById(newParticipantId);
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User not found",
                timestamp: new Date().toISOString(),
            });
        }
        console.log("➕ Adding participant:", {
            userId: newParticipantId,
            role: role,
            roomId: roomId,
        });
        room.participants.push({
            user: new mongoose_1.default.Types.ObjectId(newParticipantId),
            role: role,
            joinedAt: new Date(),
        });
        room.lastActivity = new Date();
        await room.save();
        console.log("✅ Participant added successfully. Room now has", room.participants.length, "participants");
        await room.populate("participants.user", "username avatar isOnline");
        const formattedRoom = {
            id: room._id.toString(),
            name: room.name,
            description: room.description,
            type: room.type,
            participants: room.participants.map((p) => ({
                user: p.user._id.toString(),
                username: p.user.username,
                avatar: p.user.avatar,
                isOnline: p.user.isOnline,
                role: p.role,
                joinedAt: p.joinedAt,
            })),
            createdBy: room.createdBy.toString(),
            isActive: room.isActive,
            lastMessage: null,
            lastActivity: room.lastActivity,
            createdAt: room.createdAt,
        };
        res.status(200).json({
            status: "success",
            data: formattedRoom,
            message: "Participant added successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error adding participant:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to add participant",
            timestamp: new Date().toISOString(),
        });
    }
});
router.get("/:roomId/messages", auth_1.authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id.toString();
        const { page = 1, limit = 50 } = req.query;
        if (!mongoose_1.default.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid room ID",
                timestamp: new Date().toISOString(),
            });
        }
        const room = await ChatRoom_1.default.findOne({
            _id: roomId,
            $or: [
                { "participants.user": userId },
                { createdBy: userId },
            ],
            isActive: true,
        });
        if (!room) {
            return res.status(404).json({
                status: "error",
                message: "Room not found or access denied",
                timestamp: new Date().toISOString(),
            });
        }
        const messages = await Message_1.default.find({ chatRoom: roomId })
            .populate("sender", "username avatar")
            .sort({ createdAt: -1 })
            .limit(Number(limit) * Number(page))
            .skip((Number(page) - 1) * Number(limit));
        const formattedMessages = messages.reverse().map((message) => ({
            id: message._id.toString(),
            content: message.content,
            sender: {
                id: message.sender._id.toString(),
                username: message.sender.username,
                avatar: message.sender.avatar,
            },
            timestamp: message.createdAt,
            messageType: message.messageType,
        }));
        res.status(200).json({
            status: "success",
            data: formattedMessages,
            message: "Messages retrieved successfully",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch messages",
            timestamp: new Date().toISOString(),
        });
    }
});
exports.default = router;
//# sourceMappingURL=roomRoutes.js.map