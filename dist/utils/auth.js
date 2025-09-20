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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.verifyToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcryptjs_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hashedPassword) => {
    return await bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
const authenticateToken = async (req, res, next) => {
    console.log("=== AUTH MIDDLEWARE CALLED ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Authorization header:", req.headers.authorization);
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];
        console.log("Extracted token:", token ? "Token present" : "No token");
        if (!token) {
            res.status(401).json({
                error: "Access denied",
                message: "No token provided",
                statusCode: 401,
            });
            return;
        }
        const decoded = (0, exports.verifyToken)(token);
        console.log("Decoded token:", decoded);
        if (!decoded) {
            console.log("Token verification failed");
            res.status(401).json({
                error: "Access denied",
                message: "Invalid token",
                statusCode: 401,
            });
            return;
        }
        const User = (await Promise.resolve().then(() => __importStar(require("../models/User")))).default;
        const user = await User.findById(decoded.userId).select("-password");
        console.log("Found user:", user ? "User found" : "User not found");
        if (!user) {
            res.status(401).json({
                error: "Access denied",
                message: "User not found",
                statusCode: 401,
            });
            return;
        }
        req.user = user;
        console.log("User set in request, calling next()");
        next();
    }
    catch (error) {
        res.status(500).json({
            error: "Authentication error",
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
        });
    }
};
exports.authenticateToken = authenticateToken;
//# sourceMappingURL=auth.js.map