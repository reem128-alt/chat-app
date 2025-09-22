"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("./config/database"));
const socketHandlers_1 = require("./socket/socketHandlers");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const roomRoutes_1 = __importDefault(require("./routes/roomRoutes"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.default.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
});
const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const allowedOrigins = [
    ...configuredOrigins,
    "http://localhost:3000",
    "http://localhost:3001",
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
app.use((0, cors_1.default)(corsOptions));
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(process.cwd(), "public")));
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(process.cwd(), "public", "index.html"));
});
app.use("/api/users", userRoutes_1.default);
app.use("/api/rooms", roomRoutes_1.default);
app.get("/api/health", (req, res) => {
    try {
        const healthResponse = {
            status: "OK",
            timestamp: new Date().toISOString(),
            databases: {
                mongodb: "connected",
                redis: database_1.default.getRedisClient() ? "connected" : "disconnected",
            },
        };
        res.json(healthResponse);
    }
    catch (error) {
        const errorResponse = {
            error: "Health check failed",
            message: error instanceof Error ? error.message : "Unknown error",
        };
        res.status(500).json(errorResponse);
    }
});
(0, socketHandlers_1.setupSocketHandlers)(io);
app.use((err, req, res, next) => {
    console.error("Error:", err);
    const errorResponse = {
        error: "Internal server error",
        message: err.message,
    };
    res.status(500).json(errorResponse);
});
app.use((req, res) => {
    const errorResponse = {
        error: "Route not found",
        message: `Cannot ${req.method} ${req.path}`,
    };
    res.status(404).json(errorResponse);
});
const PORT = parseInt(process.env.PORT || "3000", 10);
const startServer = async () => {
    try {
        await database_1.default.connectMongoDB();
        await database_1.default.connectRedis();
        server.listen(PORT, () => {
            console.log(`🚀 Chat server running on port ${PORT}`);
            console.log(`📱 Open http://localhost:${PORT} to access the chat app`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    console.log(`🛑 ${signal} received, shutting down gracefully`);
    await database_1.default.disconnectDatabases();
    server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
    });
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
startServer();
//# sourceMappingURL=server.js.map