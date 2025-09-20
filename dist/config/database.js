"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = require("redis");
const connectMongoDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URL;
        await mongoose_1.default.connect(mongoUri, {
            dbName: "chat-app",
        });
        console.log("✅ MongoDB connected successfully");
        mongoose_1.default.connection.on("error", (err) => {
            console.error("❌ MongoDB connection error:", err);
        });
        mongoose_1.default.connection.on("disconnected", () => {
            console.log("⚠️ MongoDB disconnected");
        });
    }
    catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        process.exit(1);
    }
};
let redisClient = null;
const connectRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            console.log("⚠️ No REDIS_URL found in environment, skipping Redis connection");
            return;
        }
        console.log("🔄 Connecting to Redis...");
        redisClient = (0, redis_1.createClient)({
            url: redisUrl,
            socket: {
                connectTimeout: 10000,
                reconnectStrategy: (retries) => {
                    if (retries > 5) {
                        console.log("⚠️ Redis connection failed after 5 attempts, continuing without Redis");
                        return false;
                    }
                    const delay = Math.min(retries * 1000, 5000);
                    console.log(`🔄 Redis reconnect attempt ${retries} in ${delay}ms`);
                    return delay;
                },
            },
        });
        redisClient.on("error", (err) => {
            console.error("❌ Redis Client Error:", err.message);
        });
        redisClient.on("connect", () => {
            console.log("✅ Redis connected successfully");
        });
        redisClient.on("ready", () => {
            console.log("✅ Redis ready to receive commands");
        });
        redisClient.on("end", () => {
            console.log("⚠️ Redis connection ended");
        });
        redisClient.on("reconnecting", () => {
            console.log("🔄 Redis reconnecting...");
        });
        await redisClient.connect();
        await redisClient.ping();
        console.log("✅ Redis ping successful");
    }
    catch (error) {
        console.log("⚠️ Redis connection failed:", error.message);
        console.log("⚠️ App will continue without Redis caching");
        redisClient = null;
    }
};
const getRedisClient = () => {
    return redisClient;
};
const disconnectDatabases = async () => {
    try {
        if (redisClient) {
            await redisClient.quit();
            console.log("✅ Redis disconnected gracefully");
        }
        await mongoose_1.default.connection.close();
        console.log("✅ MongoDB disconnected gracefully");
    }
    catch (error) {
        console.error("❌ Error during database disconnection:", error);
    }
};
const databaseConfig = {
    connectMongoDB,
    connectRedis,
    getRedisClient,
    disconnectDatabases,
};
exports.default = databaseConfig;
//# sourceMappingURL=database.js.map