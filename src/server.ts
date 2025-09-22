import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import socketIo from "socket.io";
import cors from "cors";
import path from "path";
import databaseConfig from "./config/database";
import { setupSocketHandlers } from "./socket/socketHandlers";
import { IHealthCheckResponse, IErrorResponse } from "./types";
import userRoutes from "./routes/userRoutes";
import roomRoutes from "./routes/roomRoutes";

const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Middleware
// Support single or comma-separated list of frontend origins via FRONTEND_URL or FRONTEND_URLS
const configuredOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// Handle preflight requests
app.options("*", cors(corsOptions));
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://chat-app-front-phi.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Routes
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/api/health", (req: Request, res: Response) => {
  try {
    const healthResponse: IHealthCheckResponse = {
      status: "OK",
      timestamp: new Date().toISOString(),
      databases: {
        mongodb: "connected",
        redis: databaseConfig.getRedisClient() ? "connected" : "disconnected",
      },
    };
    res.json(healthResponse);
  } catch (error) {
    const errorResponse: IErrorResponse = {
      error: "Health check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    };
    res.status(500).json(errorResponse);
  }
});

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  const errorResponse: IErrorResponse = {
    error: "Internal server error",
    message: err.message,
  };
  res.status(500).json(errorResponse);
});

// 404 handler
app.use((req: Request, res: Response) => {
  const errorResponse: IErrorResponse = {
    error: "Route not found",
    message: `Cannot ${req.method} ${req.path}`,
  };
  res.status(404).json(errorResponse);
});

const PORT: number = parseInt(process.env.PORT || "3000", 10);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to databases
    await databaseConfig.connectMongoDB();
    await databaseConfig.connectRedis();

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Chat server running on port ${PORT}`);
      console.log(`📱 Open http://localhost:${PORT} to access the chat app`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`🛑 ${signal} received, shutting down gracefully`);
  await databaseConfig.disconnectDatabases();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
