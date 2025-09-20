import { Server as SocketIOServer, Socket } from "socket.io";
import databaseConfig from "../config/database";
import Message from "../models/Message";
import User from "../models/User";
import ChatRoom from "../models/ChatRoom";
import mongoose from "mongoose";
import {
  ISocketData,
  IJoinData,
  ISendMessageData,
  ITypingData,
  ILeaveData,
  IMessageResponse,
  IUserJoinedData,
  IUserLeftData,
  IUserTypingData,
} from "../types";

// Store active users
const activeUsers = new Map<string, ISocketData>();

const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on("connection", (socket: Socket) => {
    console.log(`👤 User connected: ${socket.id}`);

    // Handle user joining
    socket.on("join", async (data: IJoinData) => {
      try {
        const { userId, username, chatRoomId } = data;

        console.log("Join attempt:", { userId, username, chatRoomId });

        // Validate ObjectIds
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          console.error("Invalid userId:", userId);
          socket.emit("error", { message: "Invalid user ID format" });
          return;
        }

        if (chatRoomId && !mongoose.Types.ObjectId.isValid(chatRoomId)) {
          console.error("Invalid chatRoomId:", chatRoomId);
          socket.emit("error", { message: "Invalid chat room ID format" });
          return;
        }

        // Store user info
        activeUsers.set(socket.id, {
          userId,
          username,
          chatRoomId,
          socketId: socket.id,
        });

        // Join the chat room
        if (chatRoomId) {
          socket.join(chatRoomId);

          // Find or create user
          let user = await User.findById(userId);
          if (!user) {
            // Create new user if doesn't exist
            user = new User({
              _id: userId,
              username: username,
              email: `${username}@temp.com`, // Temporary email
              isOnline: true,
              lastSeen: new Date(),
            });
            await user.save();
            console.log(`✅ Created new user: ${username} (${userId})`);
          } else {
            // Update existing user online status
            await User.findByIdAndUpdate(userId, {
              isOnline: true,
              lastSeen: new Date(),
            });
            console.log(
              `✅ Updated user online status: ${username} (${userId})`
            );
          }

          // Find or create chat room
          let chatRoom = await ChatRoom.findById(chatRoomId);
          if (!chatRoom) {
            // Create new chat room if doesn't exist
            chatRoom = new ChatRoom({
              _id: chatRoomId,
              name: `Chat Room ${chatRoomId.slice(-8)}`, // Use last 8 chars of ID
              description: "Auto-generated chat room",
              type: "group",
              createdBy: userId,
              participants: [
                {
                  user: new mongoose.Types.ObjectId(userId),
                  role: "admin",
                  joinedAt: new Date(),
                },
              ], // Add creator as admin participant
              lastActivity: new Date(),
            });
            await chatRoom.save();
            console.log(
              `✅ Created new chat room: ${chatRoom.name} (${chatRoomId}) with creator as admin`
            );
          } else {
            // Add user to existing chat room if not already a participant
            const isParticipant = chatRoom.participants.some(
              (p) => p.user.toString() === userId
            );
            if (!isParticipant) {
              chatRoom.participants.push({
                user: new mongoose.Types.ObjectId(userId),
                role: "member",
                joinedAt: new Date(),
              });
              await chatRoom.save();
              console.log(
                `✅ Added user to existing chat room: ${username} -> ${chatRoom.name}`
              );
            }
          }

          // Store online user in Redis
          const redisClient = databaseConfig.getRedisClient();
          if (redisClient) {
            await redisClient.sAdd(`online_users:${chatRoomId}`, userId);
            await redisClient.hSet(`user:${userId}`, {
              username,
              socketId: socket.id,
              lastSeen: new Date().toISOString(),
            });
          }

          // Notify others in the room
          const userJoinedData: IUserJoinedData = {
            userId,
            username,
            timestamp: new Date(),
          };
          socket.to(chatRoomId).emit("user_joined", userJoinedData);

          // Send recent messages to the user
          const recentMessages = await Message.find({ chatRoom: chatRoomId })
            .populate("sender", "username avatar")
            .sort({ createdAt: -1 })
            .limit(50);

          const formattedMessages: IMessageResponse[] = recentMessages
            .reverse()
            .map((message: any) => ({
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
      } catch (error) {
        console.error("Error in join handler:", error);
        socket.emit("error", { message: "Failed to join chat room" });
      }
    });

    // Handle sending messages
    socket.on("send_message", async (data: ISendMessageData) => {
      try {
        const { content, chatRoomId, senderId } = data;
        const userInfo = activeUsers.get(socket.id);

        if (!userInfo) {
          socket.emit("error", { message: "User not authenticated" });
          return;
        }

        // Validate ObjectIds
        if (!senderId || !mongoose.Types.ObjectId.isValid(senderId)) {
          console.error("Invalid senderId:", senderId);
          socket.emit("error", { message: "Invalid sender ID format" });
          return;
        }

        if (chatRoomId && !mongoose.Types.ObjectId.isValid(chatRoomId)) {
          console.error("Invalid chatRoomId:", chatRoomId);
          socket.emit("error", { message: "Invalid chat room ID format" });
          return;
        }

        // Create new message
        const message = new Message({
          content,
          sender: senderId,
          chatRoom: chatRoomId,
          messageType: "text",
        });

        await message.save();

        // Populate sender info
        await message.populate("sender", "username avatar");

        // Update chat room's last message and activity
        await ChatRoom.findByIdAndUpdate(chatRoomId, {
          lastMessage: message._id,
          lastActivity: new Date(),
        });

        // Broadcast message to all users in the room
        const messageResponse: IMessageResponse = {
          id: message._id.toString(),
          content: message.content,
          sender: {
            id: (message.sender as any)._id.toString(),
            username: (message.sender as any).username,
            avatar: (message.sender as any).avatar,
          },
          timestamp: message.createdAt,
          messageType: message.messageType,
        };

        io.to(chatRoomId).emit("new_message", messageResponse);

        console.log(
          `💬 Message sent in room ${chatRoomId} by ${userInfo.username}`
        );
      } catch (error) {
        console.error("Error in send_message handler:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (data: ITypingData) => {
      const userInfo = activeUsers.get(socket.id);
      if (userInfo && data.chatRoomId) {
        // Validate ObjectId
        if (
          data.chatRoomId &&
          !mongoose.Types.ObjectId.isValid(data.chatRoomId)
        ) {
          console.error("Invalid chatRoomId:", data.chatRoomId);
          socket.emit("error", { message: "Invalid chat room ID format" });
          return;
        }

        const typingData: IUserTypingData = {
          userId: userInfo.userId,
          username: userInfo.username,
          isTyping: true,
        };
        socket.to(data.chatRoomId).emit("user_typing", typingData);
      }
    });

    socket.on("typing_stop", (data: ITypingData) => {
      const userInfo = activeUsers.get(socket.id);
      if (userInfo && data.chatRoomId) {
        // Validate ObjectId
        if (
          data.chatRoomId &&
          !mongoose.Types.ObjectId.isValid(data.chatRoomId)
        ) {
          console.error("Invalid chatRoomId:", data.chatRoomId);
          socket.emit("error", { message: "Invalid chat room ID format" });
          return;
        }

        const typingData: IUserTypingData = {
          userId: userInfo.userId,
          username: userInfo.username,
          isTyping: false,
        };
        socket.to(data.chatRoomId).emit("user_typing", typingData);
      }
    });

    // Handle user leaving
    socket.on("leave", async (data: ILeaveData) => {
      try {
        const userInfo = activeUsers.get(socket.id);
        if (userInfo) {
          const { chatRoomId, userId } = userInfo;

          // Validate ObjectId
          if (chatRoomId && !mongoose.Types.ObjectId.isValid(chatRoomId)) {
            console.error("Invalid chatRoomId:", chatRoomId);
            socket.emit("error", { message: "Invalid chat room ID format" });
            return;
          }

          // Leave the room
          socket.leave(chatRoomId);

          // Update user offline status
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          // Remove from Redis
          const redisClient = databaseConfig.getRedisClient();
          if (redisClient) {
            await redisClient.sRem(`online_users:${chatRoomId}`, userId);
            await redisClient.del(`user:${userId}`);
          }

          // Notify others
          const userLeftData: IUserLeftData = {
            userId,
            username: userInfo.username,
            timestamp: new Date(),
          };
          socket.to(chatRoomId).emit("user_left", userLeftData);

          console.log(`👋 ${userInfo.username} left room ${chatRoomId}`);
        }
      } catch (error) {
        console.error("Error in leave handler:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      try {
        const userInfo = activeUsers.get(socket.id);
        if (userInfo) {
          const { chatRoomId, userId, username } = userInfo;

          // Update user offline status
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          // Remove from Redis
          const redisClient = databaseConfig.getRedisClient();
          if (redisClient) {
            await redisClient.sRem(`online_users:${chatRoomId}`, userId);
            await redisClient.del(`user:${userId}`);
          }

          // Notify others
          const userLeftData: IUserLeftData = {
            userId,
            username,
            timestamp: new Date(),
          };
          socket.to(chatRoomId).emit("user_left", userLeftData);

          // Remove from active users
          activeUsers.delete(socket.id);

          console.log(`👋 ${username} disconnected`);
        }
      } catch (error) {
        console.error("Error in disconnect handler:", error);
      }
    });
  });
};

export { setupSocketHandlers };
