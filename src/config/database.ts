import mongoose from "mongoose";
import { createClient, RedisClientType } from "redis";
import { IDatabaseConfig } from "../types";

// MongoDB Connection
const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URL;

    await mongoose.connect(mongoUri, {
      dbName: "chat-app",
    });

    console.log("✅ MongoDB connected successfully");

    // Handle connection events
    mongoose.connection.on("error", (err: Error) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Redis Connection
let redisClient: RedisClientType | null = null;

const connectRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.log(
        "⚠️ No REDIS_URL found in environment, skipping Redis connection"
      );
      return;
    }

    console.log("🔄 Connecting to Redis...");

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000, // 10 second timeout
        reconnectStrategy: (retries: number) => {
          if (retries > 5) {
            console.log(
              "⚠️ Redis connection failed after 5 attempts, continuing without Redis"
            );
            return false; // Stop trying to reconnect
          }
          const delay = Math.min(retries * 1000, 5000); // Max 5 second delay
          console.log(`🔄 Redis reconnect attempt ${retries} in ${delay}ms`);
          return delay;
        },
      },
    });

    redisClient.on("error", (err: Error) => {
      console.error("❌ Redis Client Error:", err.message);
      // Don't exit the process, just log the error
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

    // Connect to Redis
    await redisClient.connect();

    // Test the connection
    await redisClient.ping();
    console.log("✅ Redis ping successful");
  } catch (error: any) {
    console.log("⚠️ Redis connection failed:", error.message);
    console.log("⚠️ App will continue without Redis caching");
    redisClient = null;
  }
};

const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};

// Graceful shutdown
const disconnectDatabases = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log("✅ Redis disconnected gracefully");
    }

    await mongoose.connection.close();
    console.log("✅ MongoDB disconnected gracefully");
  } catch (error) {
    console.error("❌ Error during database disconnection:", error);
  }
};

const databaseConfig: IDatabaseConfig = {
  connectMongoDB,
  connectRedis,
  getRedisClient,
  disconnectDatabases,
};

export default databaseConfig;
