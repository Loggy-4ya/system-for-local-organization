/**
 * @fileoverview Stateless MongoDB connection helper for Project Nexus.
 *
 * Uses a global cache to reuse an existing Mongoose connection across:
 *  - Next.js hot-reloads in development (prevents exhausting connections).
 *  - Long-lived Docker / EC2 processes in production (connection reuse).
 *
 * @module shared/lib/db
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI environment variable is not defined. " +
      "Set it in .env.local (development) or your hosting platform (production)."
  );
}

/**
 * Cached connection stored on the Node.js `global` object so it survives
 * Next.js hot-reloads without leaking connections.
 *
 * @internal
 */
interface MongooseCache {
  /** Active Mongoose connection, or null if not yet established. */
  conn: typeof mongoose | null;
  /** Pending connection Promise, or null if no connection is in progress. */
  promise: Promise<typeof mongoose> | null;
}

/* eslint-disable no-var */
declare global {
  /** Prevents TypeScript from complaining about the custom global key. */
  var mongooseCache: MongooseCache | undefined;
}
/* eslint-enable no-var */

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

/**
 * Opens (or reuses) a Mongoose connection to MongoDB.
 *
 * @returns Resolves with the active Mongoose instance once the connection
 *   is established. Subsequent calls return the same cached instance.
 *
 * @throws Will throw if `MONGODB_URI` is missing or the connection fails.
 *
 * @example
 * ```ts
 * import connectDB from "@/shared/lib/db";
 *
 * export async function GET() {
 *   await connectDB();
 *   // Mongoose models are now usable.
 * }
 * ```
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
      })
      .then((instance) => {
        console.log("[Nexus DB] MongoDB connection established.");
        return instance;
      })
      .catch((err: Error) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
