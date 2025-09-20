import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { IUser } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthRequest extends Request {
  user?: IUser;
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

// Verify JWT token
export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("=== AUTH MIDDLEWARE CALLED ===");
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  console.log("Authorization header:", req.headers.authorization);

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    console.log("Extracted token:", token ? "Token present" : "No token");

    if (!token) {
      res.status(401).json({
        error: "Access denied",
        message: "No token provided",
        statusCode: 401,
      });
      return;
    }

    const decoded = verifyToken(token);
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

    // Import User model here to avoid circular dependency
    const User = (await import("../models/User")).default;
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
  } catch (error) {
    res.status(500).json({
      error: "Authentication error",
      message: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};
