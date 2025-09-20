"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = void 0;
const database_1 = __importDefault(require("../config/database"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
const mongoose_1 = __importDefault(require("mongoose"));
const activeUsers = new Map();
const setupSocketHandlers = (io) => {
    io.on("connection", (socket) => {
        console.log(`👤 User connected: ${socket.id}`);
        socket.on("join", async (data) => {
            try {
                const { userId, username, chatRoomId } = data;
                console.log("Join attempt:", { userId, username, chatRoomId });
                if (!userId || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
                    console.error("Invalid userId:", userId);
                    socket.emit("error", { message: "Invalid user ID format" });
                    return;
                }
                if (chatRoomId && !mongoose_1.default.Types.ObjectId.isValid(chatRoomId)) {
                    console.error("Invalid chatRoomId:", chatRoomId);
                    socket.emit("error", { message: "Invalid chat room ID format" });
                    return;
                }
                activeUsers.set(socket.id, {
                    userId,
                    username,
                    chatRoomId,
                    socketId: socket.id,
                });
                if (chatRoomId) {
                    socket.join(chatRoomId);
                    let user = await User_1.default.findById(userId);
                    if (!user) {
                        user = new User_1.default({
                            _id: userId,
                            username: username,
                            email: `${username}@temp.com`,
                            isOnline: true,
                            lastSeen: new Date(),
                        });
                        await user.save();
                        console.log(`✅ Created new user: ${username} (${userId})`);
                    }
                    else {
                        await User_1.default.findByIdAndUpdate(userId, {
                            isOnline: true,
                            lastSeen: new Date(),
                        });
                        console.log(`✅ Updated user online status: ${username} (${userId})`);
                    }
                    let chatRoom = await ChatRoom_1.default.findById(chatRoomId);
                    if (!chatRoom) {
                        chatRoom = new ChatRoom_1.default({
                            _id: chatRoomId,
                            name: `Chat Room ${chatRoomId.slice(-8)}`,
                            description: "Auto-generated chat room",
                            type: "group",
                            createdBy: userId,
                            participants: [
                                {
                                    user: new mongoose_1.default.Types.ObjectId(userId),
                                    role: "admin",
                                    joinedAt: new Date(),
                                },
                            ],
                            lastActivity: new Date(),
                        });
                        await chatRoom.save();
                        console.log(`✅ Created new chat room: ${chatRoom.name} (${chatRoomId}) with creator as admin`);
                    }
                    else {
                        const isParticipant = chatRoom.participants.some((p) => p.user.toString() === userId);
                        if (!isParticipant) {
                            chatRoom.participants.push({
                                user: new mongoose_1.default.Types.ObjectId(userId),
                                role: "member",
                                joinedAt: new Date(),
                            });
                            await chatRoom.save();
                            console.log(`✅ Added user to existing chat room: ${username} -> ${chatRoom.name}`);
                        }
                    }
                    const redisClient = database_1.default.getRedisClient();
                    if (redisClient) {
                        await redisClient.sAdd(`online_users:${chatRoomId}`, userId);
                        await redisClient.hSet(`user:${userId}`, {
                            username,
                            socketId: socket.id,
                            lastSeen: new Date().toISOString(),
                        });
                    }
                    const userJoinedData = {
                        userId,
                        username,
                        timestamp: new Date(),
                    };
                    socket.to(chatRoomId).emit("user_joined", userJoinedData);
                    const recentMessages = await Message_1.default.find({ chatRoom: chatRoomId })
                        .populate("sender", "username avatar")
                        .sort({ createdAt: -1 })
                        .limit(50);
                    const formattedMessages = recentMessages
                        .reverse()
                        .map((message) => ({
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
                    socket.emit("recent_messages", formattedMessages);
                    console.log(`👤 ${username} joined room ${chatRoomId}`);
                }
            }
            catch (error) {
                console.error("Error in join handler:", error);
                socket.emit("error", { message: "Failed to join chat room" });
            }
        });
        socket.on("send_message", async (data) => {
            try {
                const { content, chatRoomId, senderId } = data;
                const userInfo = activeUsers.get(socket.id);
                if (!userInfo) {
                    socket.emit("error", { message: "User not authenticated" });
                    return;
                }
                if (!senderId || !mongoose_1.default.Types.ObjectId.isValid(senderId)) {
                    console.error("Invalid senderId:", senderId);
                    socket.emit("error", { message: "Invalid sender ID format" });
                    return;
                }
                if (chatRoomId && !mongoose_1.default.Types.ObjectId.isValid(chatRoomId)) {
                    console.error("Invalid chatRoomId:", chatRoomId);
                    socket.emit("error", { message: "Invalid chat room ID format" });
                    return;
                }
                const message = new Message_1.default({
                    content,
                    sender: senderId,
                    chatRoom: chatRoomId,
                    messageType: "text",
                });
                await message.save();
                await message.populate("sender", "username avatar");
                await ChatRoom_1.default.findByIdAndUpdate(chatRoomId, {
                    lastMessage: message._id,
                    lastActivity: new Date(),
                });
                const messageResponse = {
                    id: message._id.toString(),
                    content: message.content,
                    sender: {
                        id: message.sender._id.toString(),
                        username: message.sender.username,
                        avatar: message.sender.avatar,
                    },
                    timestamp: message.createdAt,
                    messageType: message.messageType,
                };
                io.to(chatRoomId).emit("new_message", messageResponse);
                console.log(`💬 Message sent in room ${chatRoomId} by ${userInfo.username}`);
            }
            catch (error) {
                console.error("Error in send_message handler:", error);
                socket.emit("error", { message: "Failed to send message" });
            }
        });
        socket.on("typing_start", (data) => {
            const userInfo = activeUsers.get(socket.id);
            if (userInfo && data.chatRoomId) {
                if (data.chatRoomId &&
                    !mongoose_1.default.Types.ObjectId.isValid(data.chatRoomId)) {
                    console.error("Invalid chatRoomId:", data.chatRoomId);
                    socket.emit("error", { message: "Invalid chat room ID format" });
                    return;
                }
                const typingData = {
                    userId: userInfo.userId,
                    username: userInfo.username,
                    isTyping: true,
                };
                socket.to(data.chatRoomId).emit("user_typing", typingData);
            }
        });
        socket.on("typing_stop", (data) => {
            const userInfo = activeUsers.get(socket.id);
            if (userInfo && data.chatRoomId) {
                if (data.chatRoomId &&
                    !mongoose_1.default.Types.ObjectId.isValid(data.chatRoomId)) {
                    console.error("Invalid chatRoomId:", data.chatRoomId);
                    socket.emit("error", { message: "Invalid chat room ID format" });
                    return;
                }
                const typingData = {
                    userId: userInfo.userId,
                    username: userInfo.username,
                    isTyping: false,
                };
                socket.to(data.chatRoomId).emit("user_typing", typingData);
            }
        });
        socket.on("leave", async (data) => {
            try {
                const userInfo = activeUsers.get(socket.id);
                if (userInfo) {
                    const { chatRoomId, userId } = userInfo;
                    if (chatRoomId && !mongoose_1.default.Types.ObjectId.isValid(chatRoomId)) {
                        console.error("Invalid chatRoomId:", chatRoomId);
                        socket.emit("error", { message: "Invalid chat room ID format" });
                        return;
                    }
                    socket.leave(chatRoomId);
                    await User_1.default.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen: new Date(),
                    });
                    const redisClient = database_1.default.getRedisClient();
                    if (redisClient) {
                        await redisClient.sRem(`online_users:${chatRoomId}`, userId);
                        await redisClient.del(`user:${userId}`);
                    }
                    const userLeftData = {
                        userId,
                        username: userInfo.username,
                        timestamp: new Date(),
                    };
                    socket.to(chatRoomId).emit("user_left", userLeftData);
                    console.log(`👋 ${userInfo.username} left room ${chatRoomId}`);
                }
            }
            catch (error) {
                console.error("Error in leave handler:", error);
            }
        });
        socket.on("disconnect", async () => {
            try {
                const userInfo = activeUsers.get(socket.id);
                if (userInfo) {
                    const { chatRoomId, userId, username } = userInfo;
                    await User_1.default.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen: new Date(),
                    });
                    const redisClient = database_1.default.getRedisClient();
                    if (redisClient) {
                        await redisClient.sRem(`online_users:${chatRoomId}`, userId);
                        await redisClient.del(`user:${userId}`);
                    }
                    const userLeftData = {
                        userId,
                        username,
                        timestamp: new Date(),
                    };
                    socket.to(chatRoomId).emit("user_left", userLeftData);
                    activeUsers.delete(socket.id);
                    console.log(`👋 ${username} disconnected`);
                }
            }
            catch (error) {
                console.error("Error in disconnect handler:", error);
            }
        });
    });
};
exports.setupSocketHandlers = setupSocketHandlers;
//# sourceMappingURL=socketHandlers.js.map