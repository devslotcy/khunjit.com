import jsonwebtoken from "jsonwebtoken";

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "khunjit-jwt-secret";
const JWT_EXPIRES_IN = "7d";

export function generateToken(userId: string): string {
  return jsonwebtoken.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jsonwebtoken.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
