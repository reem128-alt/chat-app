import multer from "multer";
import path from "path";
import { Request } from "express";

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    cb(null, "public/uploads/avatars");
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${fileExtension}`);
  },
});

// File filter for image validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  // Check if file is an image
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed for avatar uploads"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for single avatar upload
export const uploadAvatar = upload.single("avatar");

// Error handling middleware for multer
export const handleUploadError = (
  error: any,
  req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        message: "Avatar file must be less than 5MB",
        statusCode: 400,
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected file field",
        message: "Please use 'avatar' as the field name for file upload",
        statusCode: 400,
      });
    }
  }

  if (error.message === "Only image files are allowed for avatar uploads") {
    return res.status(400).json({
      error: "Invalid file type",
      message:
        "Only image files (jpg, png, gif, etc.) are allowed for avatar uploads",
      statusCode: 400,
    });
  }

  next(error);
};
