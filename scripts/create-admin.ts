import dotenv from "dotenv";
// Load environment variables FIRST
dotenv.config();

import { db } from "../server/db.js";
import { users, userProfiles } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function createAdmin() {
  try {
    const adminEmail = "dev@khunjit.com";
    const adminPassword = "KhunJit2024";

    console.log("🔍 Checking for existing admin...");

    // Check if admin exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, adminEmail));

    if (existingUser) {
      console.log("⚠️  Admin user already exists!");
      console.log("📧 Email:", adminEmail);
      console.log("🔐 Resetting password to:", adminPassword);

      // Update password
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.update(users)
        .set({ passwordHash })
        .where(eq(users.email, adminEmail));

      console.log("✅ Password updated successfully!");
    } else {
      console.log("📝 Creating new admin user...");

      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userId = randomUUID();

      try {
        await db.insert(users).values({
          id: userId,
          email: adminEmail,
          username: "khunjit_admin",
          passwordHash,
          firstName: "Admin",
          lastName: "User",
        });

        // Check if profile exists
        const [existingProfile] = await db.select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId));

        if (!existingProfile) {
          await db.insert(userProfiles).values({
            userId,
            role: "admin",
            phone: null,
            birthDate: null,
            gender: null,
            city: "Bangkok",
            profession: "Platform Admin",
            bio: "KhunJit Platform Administrator",
          });
        }

        console.log("✅ Admin user created successfully!");
      } catch (error: any) {
        if (error.code === '23505' && error.constraint === 'users_email_unique') {
          console.log("⚠️  User with this email already exists in a different account");
          console.log("❌ Please delete the existing user first or use a different email");
        } else {
          throw error;
        }
      }
    }

    console.log("\n📋 Login Credentials:");
    console.log("   Email:", adminEmail);
    console.log("   Password:", adminPassword);
    console.log("\n🌐 Admin Login URL: http://localhost:5055/admin/login");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createAdmin();
