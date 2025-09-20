import mongoose, { Schema, model } from "mongoose";
import { IChatRoom, IParticipant } from "../types";

const participantSchema = new Schema<IParticipant>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, 'User ID is required for participant'],
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: (props: any) => `Invalid user ID: ${props.value}`
    }
  },
  role: {
    type: String,
    enum: ["admin", "moderator", "member"],
    default: "member",
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });  // Disable _id for subdocuments

const chatRoomSchema = new Schema<IChatRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  type: {
    type: String,
    enum: ["private", "group", "public"],
    default: "group",
  },
  participants: [participantSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, 'createdBy is required'],
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: (props: any) => `Invalid createdBy ID: ${props.value}`
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better performance
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ type: 1 });
chatRoomSchema.index({ lastActivity: -1 });
chatRoomSchema.index({ createdBy: 1 });



export default model<IChatRoom>("ChatRoom", chatRoomSchema);
