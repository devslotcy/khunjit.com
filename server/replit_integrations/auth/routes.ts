import type { Express } from "express";
import { authStorage } from "./storage";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  // This endpoint does NOT use isAuthenticated middleware
  // to avoid returning 401 (which shows as error in browser console)
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      const user = req.user as any;
      const sessionUserId = (req.session as any)?.userId;

      // Check for session-based authentication (email/password login)
      if (sessionUserId) {
        const dbUser = await authStorage.getUser(sessionUserId);
        return res.json(dbUser);
      }

      // Check for Replit Auth
      if (req.isAuthenticated() && user?.claims?.sub) {
        const dbUser = await authStorage.getUser(user.claims.sub);
        return res.json(dbUser);
      }

      // Not authenticated - return null (200 OK, not 401)
      return res.json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
