import { Router, Request, Response } from "express";
import User from "../models/User";
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
  AuthRequest,
} from "../utils/auth";
import { uploadAvatar, handleUploadError } from "../middleware/upload";
import {
  IRegisterRequest,
  ILoginRequest,
  IAuthResponse,
  IUserResponse,
  IErrorResponse,
  IUpdateAvatarRequest,
  IUpdateUserRequest,
} from "../types";

const router = Router();

// Register endpoint
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password }: IRegisterRequest = req.body;

    // Validation
    if (!username || !email || !password) {
      const errorResponse: IErrorResponse = {
        error: "Validation error",
        message: "Username, email, and password are required",
        statusCode: 400,
      };
      res.status(400).json(errorResponse);
      return;
    }

    if (password.length < 6) {
      const errorResponse: IErrorResponse = {
        error: "Validation error",
        message: "Password must be at least 6 characters long",
        statusCode: 400,
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const errorResponse: IErrorResponse = {
        error: "User already exists",
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
        statusCode: 409,
      };
      res.status(409).json(errorResponse);
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id.toString());

    // Return user data (without password) and token
    const authResponse: IAuthResponse = {
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        isOnline: newUser.isOnline,
      },
      token,
    };

    res.status(201).json({
      status: "success",
      data: authResponse,
      message: "User registered successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    const errorResponse: IErrorResponse = {
      error: "Registration failed",
      message: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
});

// Login endpoint
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: ILoginRequest = req.body;

    // Validation
    if (!email || !password) {
      const errorResponse: IErrorResponse = {
        error: "Validation error",
        message: "Email and password are required",
        statusCode: 400,
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      const errorResponse: IErrorResponse = {
        error: "Authentication failed",
        message: "Invalid email or password",
        statusCode: 401,
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      const errorResponse: IErrorResponse = {
        error: "Authentication failed",
        message: "Invalid email or password",
        statusCode: 401,
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Update user online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    // Return user data (without password) and token
    const authResponse: IAuthResponse = {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
      },
      token,
    };

    res.json({
      status: "success",
      data: authResponse,
      message: "Login successful",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    const errorResponse: IErrorResponse = {
      error: "Login failed",
      message: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    };
    res.status(500).json(errorResponse);
  }
});

// Get current user profile (protected route)
router.get(
  "/profile",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const errorResponse: IErrorResponse = {
          error: "Authentication error",
          message: "User not found",
          statusCode: 401,
        };
        res.status(401).json(errorResponse);
        return;
      }

      const userResponse: IUserResponse = {
        id: req.user._id.toString(),
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
        isOnline: req.user.isOnline,
        lastSeen: req.user.lastSeen,
        createdAt: req.user.createdAt,
      };

      res.json({
        status: "success",
        data: userResponse,
        message: "Profile retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Profile error:", error);
      const errorResponse: IErrorResponse = {
        error: "Profile retrieval failed",
        message: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

// Logout endpoint (update online status)
router.post(
  "/logout",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const errorResponse: IErrorResponse = {
          error: "Authentication error",
          message: "User not found",
          statusCode: 401,
        };
        res.status(401).json(errorResponse);
        return;
      }

      // Update user offline status
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });

      res.json({
        status: "success",
        message: "Logout successful",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Logout error:", error);
      const errorResponse: IErrorResponse = {
        error: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

// Upload avatar endpoint (protected route)
router.post(
  "/avatar",
  authenticateToken,
  uploadAvatar,
  handleUploadError,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const errorResponse: IErrorResponse = {
          error: "Authentication error",
          message: "User not found",
          statusCode: 401,
        };
        res.status(401).json(errorResponse);
        return;
      }

      if (!req.file) {
        const errorResponse: IErrorResponse = {
          error: "No file uploaded",
          message: "Please select an image file to upload as avatar",
          statusCode: 400,
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Generate the avatar URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // Update user's avatar
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: avatarUrl },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        const errorResponse: IErrorResponse = {
          error: "Update failed",
          message: "User not found",
          statusCode: 404,
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Return updated user data (without password)
      const userResponse: IUserResponse = {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen,
        createdAt: updatedUser.createdAt,
      };

      res.json({
        status: "success",
        data: userResponse,
        message: "Avatar uploaded successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      const errorResponse: IErrorResponse = {
        error: "Avatar upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

// Get all users endpoint (protected route)
router.get(
  "/all",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const errorResponse: IErrorResponse = {
          error: "Authentication error",
          message: "User not found",
          statusCode: 401,
        };
        res.status(401).json(errorResponse);
        return;
      }

      const { search, limit = 50 } = req.query;

      // Build query
      let query: any = {};
      if (search && typeof search === "string") {
        query = {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        };
      }

      // Get users (excluding password field)
      const users = await User.find(query)
        .select("-password")
        .limit(Number(limit))
        .sort({ username: 1 });

      // Format users for response
      const formattedUsers = users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
      }));

      res.json({
        status: "success",
        data: formattedUsers,
        message: "Users retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get all users error:", error);
      const errorResponse: IErrorResponse = {
        error: "Failed to retrieve users",
        message: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

// Update user profile endpoint (protected route)
router.put(
  "/update",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const errorResponse: IErrorResponse = {
          error: "Authentication error",
          message: "User not found",
          statusCode: 401,
        };
        res.status(401).json(errorResponse);
        return;
      }

      const { username, email }: IUpdateUserRequest = req.body;

      // Validation - at least one field must be provided
      if (!username && !email) {
        const errorResponse: IErrorResponse = {
          error: "Validation error",
          message:
            "At least one field (username or email) must be provided. Use /avatar endpoint for avatar uploads.",
          statusCode: 400,
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validate username if provided
      if (username) {
        if (username.length < 3 || username.length > 20) {
          const errorResponse: IErrorResponse = {
            error: "Validation error",
            message: "Username must be between 3 and 20 characters",
            statusCode: 400,
          };
          res.status(400).json(errorResponse);
          return;
        }

        // Check if username is already taken by another user
        const existingUser = await User.findOne({
          username,
          _id: { $ne: req.user._id },
        });

        if (existingUser) {
          const errorResponse: IErrorResponse = {
            error: "Validation error",
            message: "Username is already taken",
            statusCode: 409,
          };
          res.status(409).json(errorResponse);
          return;
        }
      }

      // Validate email if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          const errorResponse: IErrorResponse = {
            error: "Validation error",
            message: "Please provide a valid email address",
            statusCode: 400,
          };
          res.status(400).json(errorResponse);
          return;
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({
          email: email.toLowerCase(),
          _id: { $ne: req.user._id },
        });

        if (existingUser) {
          const errorResponse: IErrorResponse = {
            error: "Validation error",
            message: "Email is already registered",
            statusCode: 409,
          };
          res.status(409).json(errorResponse);
          return;
        }
      }

      // Prepare update object
      const updateData: any = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email.toLowerCase();

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        const errorResponse: IErrorResponse = {
          error: "Update failed",
          message: "User not found",
          statusCode: 404,
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Return updated user data (without password)
      const userResponse: IUserResponse = {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen,
        createdAt: updatedUser.createdAt,
      };

      res.json({
        status: "success",
        data: userResponse,
        message: "User profile updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Update user error:", error);
      const errorResponse: IErrorResponse = {
        error: "Update failed",
        message: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

export default router;
