"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const attachmentSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    filename: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
});
const messageSchema = new mongoose_1.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
    },
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    chatRoom: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ChatRoom",
        required: true,
    },
    messageType: {
        type: String,
        enum: ["text", "image", "file", "system"],
        default: "text",
    },
    attachments: [attachmentSchema],
    isEdited: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
        default: null,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });
exports.default = (0, mongoose_1.model)("Message", messageSchema);
//# sourceMappingURL=Message.js.map