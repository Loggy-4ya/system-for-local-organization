import type { DefaultSession } from "next-auth";
import type { PublicUser } from "@shared/domains/AuthDomain";

/**
 * @fileoverview NextAuth module augmentation for Nexus session user shape.
 */

declare module "next-auth" {
  interface Session {
    user: PublicUser & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
