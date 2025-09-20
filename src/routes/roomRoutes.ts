import express from "express";
import { Request, Response } from "express";
import ChatRoom from "../models/ChatRoom";
import User from "../models/User";
import Message from "../models/Message";
import { authenticateToken } from "../utils/auth";
import mongoose from "mongoose";

const router = express.Router();

// Test endpoint to debug room queries
router.get(
  "/debug/:userId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      console.log("🔍 DEBUG: Testing room query for user:", userId);

      // Test the exact query we use
      const rooms = await ChatRoom.find({
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
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({
        status: "error",
        message: "Debug failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Get user's rooms
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id.toString();

    // Find rooms where user is a participant OR where user is the creator
    console.log("🔍 Fetching rooms for user:", userId);
    console.log("🔍 Query will search for:", {
      "participants.user": userId,
      createdBy: userId,
    });

    // Debug: Let's see all rooms first
    const allRooms = await ChatRoom.find({ isActive: true });
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
        isUserInThisRoom:
          room.participants.some((p) => p.user.toString() === userId) ||
          room.createdBy.toString() === userId,
      });
    });

    // Debug: Test individual query parts

    // Test 1: Find rooms where user is a participant
    const participantRooms = await ChatRoom.find({
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

    // Test 2: Find rooms where user is creator
    const creatorRooms = await ChatRoom.find({
      createdBy: userId,
      isActive: true,
    });
    creatorRooms.forEach((room, index) => {
      
    });

    // Test with ObjectId conversion
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const rooms = await ChatRoom.find({
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
        isUserParticipant: room.participants.some(
          (p) => p.user.toString() === userId
        ),
        isUserCreatorObjId: room.createdBy.toString() === userIdObj.toString(),
        isUserParticipantObjId: room.participants.some(
          (p) => p.user.toString() === userIdObj.toString()
        ),
      });
    });

    // Manual check: Let's manually verify which rooms the user should have access to
    console.log("🔍 Manual verification:");
    const manualCheck = allRooms.filter((room) => {
      const isParticipant = room.participants.some(
        (p) => p.user.toString() === userId
      );
      const isCreator = room.createdBy.toString() === userId;
      return isParticipant || isCreator;
    });
    console.log("🔍 Manual check found rooms:", manualCheck.length);
    manualCheck.forEach((room, index) => {
      console.log(`Manual Room ${index + 1}:`, {
        id: room._id.toString(),
        name: room.name,
        reason:
          room.createdBy.toString() === userId ? "creator" : "participant",
      });
    });

    // Format the response
    const formattedRooms = rooms.map((room) => ({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      type: room.type,
      participants: room.participants.map((p: any) => ({
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
            id: (room.lastMessage as any)._id.toString(),
            content: (room.lastMessage as any).content,
            sender: {
              id: (room.lastMessage as any).sender.toString(),
              username: (room.lastMessage as any).sender.username,
            },
            timestamp: (room.lastMessage as any).createdAt,
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
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch rooms",
      timestamp: new Date().toISOString(),
    });
  }
});

// Create a new room
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user || !user._id) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated or invalid user ID",
        timestamp: new Date().toISOString(),
      });
    }

    const userId = user._id.toString();
    const { name, description, type = "group" } = req.body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Room name is required and must be a non-empty string",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate type
    if (!["private", "group", "public"].includes(type)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid room type. Must be 'private', 'group', or 'public'",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID format",
        timestamp: new Date().toISOString(),
      });
    }

    // Create ObjectId instances first to ensure they're valid
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Prepare room data with explicit type casting
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
      ], // Add creator as admin participant
      isActive: true,
      lastActivity: new Date(),
      createdAt: new Date(),
    };

    // Log the raw data being used to create the room
    console.log("Creating room with data:", {
      name: roomData.name,
      type: roomData.type,
      createdBy: roomData.createdBy.toString(),
      participants: "Creator added as admin participant",
    });

    // Create and save the room
    const newRoom = new ChatRoom(roomData);
    await newRoom.save();

    // Populate the room data with user details
    await newRoom.populate({
      path: "participants.user",
      select: "username avatar isOnline",
    });

    // Format the response
    const formattedRoom = {
      id: newRoom._id.toString(),
      name: newRoom.name,
      description: newRoom.description,
      type: newRoom.type,
      participants: newRoom.participants.map((p: any) => ({
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
  } catch (error) {
    console.error("Error creating room:", error);

    // Handle specific error types
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: messages,
        timestamp: new Date().toISOString(),
      });
    }

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        status: "error",
        message: `Invalid ${error.path}: ${error.value}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Default error response
    return res.status(500).json({
      status: "error",
      message: "Failed to create room",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get room by ID
router.get(
  "/:roomId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user._id.toString();
      const roomId = req.params.roomId;

      // Validate room ID
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid room ID",
          timestamp: new Date().toISOString(),
        });
      }

      const room = await ChatRoom.findOne({
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

      // Format the response
      const formattedRoom = {
        id: room._id.toString(),
        name: room.name,
        description: room.description,
        type: room.type,
        participants: room.participants.map((p: any) => ({
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
              id: (room.lastMessage as any)._id.toString(),
              content: (room.lastMessage as any).content,
              sender: {
                id: (room.lastMessage as any).sender.toString(),
                username: (room.lastMessage as any).sender.username,
              },
              timestamp: (room.lastMessage as any).createdAt,
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
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch room",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Join a room
router.post(
  "/:roomId/join",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = (req as any).user._id.toString();

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid room ID",
          timestamp: new Date().toISOString(),
        });
      }

      const room = await ChatRoom.findById(roomId);

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

      // Check if user is already a participant
      const isParticipant = room.participants.some(
        (p) => p.user.toString() === userId
      );

      if (!isParticipant) {
        // Add user to room
        room.participants.push({
          user: new mongoose.Types.ObjectId(userId),
          role: "member",
          joinedAt: new Date(),
        });

        room.lastActivity = new Date();
        await room.save();
      }

      // Populate the room data
      await room.populate("participants.user", "username avatar isOnline");

      // Format the response
      const formattedRoom = {
        id: room._id.toString(),
        name: room.name,
        description: room.description,
        type: room.type,
        participants: room.participants.map((p: any) => ({
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
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to join room",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Leave a room
router.post(
  "/:roomId/leave",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = (req as any).user._id.toString();

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid room ID",
          timestamp: new Date().toISOString(),
        });
      }

      const room = await ChatRoom.findById(roomId);

      if (!room) {
        return res.status(404).json({
          status: "error",
          message: "Room not found",
          timestamp: new Date().toISOString(),
        });
      }

      // Remove user from participants
      room.participants = room.participants.filter(
        (p) => p.user.toString() !== userId
      );

      // If no participants left, deactivate room
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
    } catch (error) {
      console.error("Error leaving room:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to leave room",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Add participant to room
router.post(
  "/:roomId/participants",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { userId: newParticipantId, role = "member" } = req.body;
      const currentUserId = (req as any).user._id.toString();

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid room ID",
          timestamp: new Date().toISOString(),
        });
      }

      if (!mongoose.Types.ObjectId.isValid(newParticipantId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid user ID",
          timestamp: new Date().toISOString(),
        });
      }

      // Find the room
      const room = await ChatRoom.findById(roomId);

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

      // Debug: Log all participants and their roles
      console.log(
        "🔍 Room participants:",
        room.participants.map((p) => ({
          user: p.user.toString(),
          role: p.role,
        }))
      );

      // Find current user in participants
      const currentUserParticipant = room.participants.find(
        (p) => p.user?.toString() === currentUserId
      );

      console.log("Current user participant:", currentUserParticipant);

      // Check if current user has permission to add participants
      // Allow if user is room creator OR if user is admin/moderator participant
      const isRoomCreator = room.createdBy.toString() === currentUserId;
      const isAdminOrModerator =
        currentUserParticipant &&
        ["admin", "moderator"].includes(currentUserParticipant.role);

      if (!isRoomCreator && !isAdminOrModerator) {
        console.log(
          "Permission denied - User is not room creator or admin/moderator"
        );

        return res.status(403).json({
          status: "error",
          message:
            "Only room creators, admins and moderators can add participants",
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is already a participant
      const isAlreadyParticipant = room.participants.some(
        (p) => p.user.toString() === newParticipantId
      );

      if (isAlreadyParticipant) {
        console.log("User is already a participant:", newParticipantId);
        return res.status(400).json({
          status: "error",
          message: "User is already a participant in this room",
          timestamp: new Date().toISOString(),
        });
      }

      // Verify the user exists
      const user = await User.findById(newParticipantId);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
          timestamp: new Date().toISOString(),
        });
      }

      // Add user to room
      console.log("➕ Adding participant:", {
        userId: newParticipantId,
        role: role,
        roomId: roomId,
      });

      room.participants.push({
        user: new mongoose.Types.ObjectId(newParticipantId),
        role: role as "admin" | "moderator" | "member",
        joinedAt: new Date(),
      });

      room.lastActivity = new Date();
      await room.save();

      console.log(
        "✅ Participant added successfully. Room now has",
        room.participants.length,
        "participants"
      );

      // Populate the room data
      await room.populate("participants.user", "username avatar isOnline");

      // Format the response
      const formattedRoom = {
        id: room._id.toString(),
        name: room.name,
        description: room.description,
        type: room.type,
        participants: room.participants.map((p: any) => ({
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
    } catch (error) {
      console.error("Error adding participant:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to add participant",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Get room messages
router.get(
  "/:roomId/messages",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = (req as any).user._id.toString();
      const { page = 1, limit = 50 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid room ID",
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is a participant or creator
      const room = await ChatRoom.findOne({
        _id: roomId,
        $or: [
          { "participants.user": userId }, // User is a participant
          { createdBy: userId }, // User created the room
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

      // Get messages
      const messages = await Message.find({ chatRoom: roomId })
        .populate("sender", "username avatar")
        .sort({ createdAt: -1 })
        .limit(Number(limit) * Number(page))
        .skip((Number(page) - 1) * Number(limit));

      // Format messages
      const formattedMessages = messages.reverse().map((message: any) => ({
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
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch messages",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
