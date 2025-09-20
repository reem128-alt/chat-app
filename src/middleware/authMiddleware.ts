import { authenticateToken } from "../utils/auth";

// Export the protect function that room routes expect
export const protect = authenticateToken;

