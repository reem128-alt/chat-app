"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const participantSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, 'User ID is required for participant'],
        validate: {
            validator: function (v) {
                return mongoose_1.default.Types.ObjectId.isValid(v);
            },
            message: (props) => `Invalid user ID: ${props.value}`
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
}, { _id: false });
const chatRoomSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, 'createdBy is required'],
        validate: {
            validator: function (v) {
                return mongoose_1.default.Types.ObjectId.isValid(v);
            },
            message: (props) => `Invalid createdBy ID: ${props.value}`
        }
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastMessage: {
        type: mongoose_1.Schema.Types.ObjectId,
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
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ type: 1 });
chatRoomSchema.index({ lastActivity: -1 });
chatRoomSchema.index({ createdBy: 1 });
exports.default = (0, mongoose_1.model)("ChatRoom", chatRoomSchema);
//# sourceMappingURL=ChatRoom.js.map