import { Document, Types } from "mongoose";
import { Socket } from "socket.io";

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
}

// Message Types
export interface IMessage extends Document {
  _id: Types.ObjectId;
  content: string;
  sender: Types.ObjectId | IUser;
  chatRoom: Types.ObjectId | IChatRoom;
  messageType: "text" | "image" | "file" | "system";
  attachments?: IAttachment[];
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

// Chat Room Types
export interface IChatRoom extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  type: "private" | "group" | "public";
  participants: IParticipant[];
  createdBy: Types.ObjectId | IUser;
  isActive: boolean;
  lastMessage?: Types.ObjectId | IMessage;
  lastActivity: Date;
  createdAt: Date;
}

// Participant Types
export interface IParticipant {
  user: Types.ObjectId | IUser;
  role: "admin" | "moderator" | "member";
  joinedAt: Date;
}

// Attachment Types
export interface IAttachment {
  url: string;
  filename: string;
  fileType: string;
  fileSize: number;
}

// Socket Types
export interface ISocketData {
  userId: string;
  username: string;
  chatRoomId: string;
  socketId: string;
}

// Socket Event Types
export interface IJoinData {
  userId: string;
  username: string;
  chatRoomId: string;
}

export interface ISendMessageData {
  content: string;
  chatRoomId: string;
  senderId: string;
}

export interface ITypingData {
  chatRoomId: string;
}

export interface ILeaveData {
  chatRoomId: string;
}

// Message Response Types
export interface IMessageResponse {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: Date;
  messageType: string;
}

// User Event Types
export interface IUserJoinedData {
  userId: string;
  username: string;
  timestamp: Date;
}

export interface IUserLeftData {
  userId: string;
  username: string;
  timestamp: Date;
}

export interface IUserTypingData {
  userId: string;
  username: string;
  isTyping: boolean;
}

// Database Connection Types
export interface IDatabaseConfig {
  connectMongoDB: () => Promise<void>;
  connectRedis: () => Promise<void>;
  getRedisClient: () => any;
  disconnectDatabases: () => Promise<void>;
}

// Environment Variables
export interface IEnvConfig {
  MONGODB_URI: string;
  REDIS_URL: string;
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
}

// API Response Types
export interface IApiResponse<T = any> {
  status: string;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface IHealthCheckResponse {
  status: string;
  timestamp: string;
  databases: {
    mongodb: string;
    redis: string;
  };
}

// Error Types
export interface IErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
}

// Authentication Types
export interface IRegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    isOnline: boolean;
  };
  token: string;
}

export interface IUserResponse {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
}

export interface IUpdateAvatarRequest {
  avatar: string;
}

export interface IUpdateUserRequest {
  username?: string;
  email?: string;
}
