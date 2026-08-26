import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

declare global {
  var __mongooseConn: {
    promise: Promise<typeof mongoose> | null;
    conn: typeof mongoose | null;
  } | undefined;
}

const globalCache = globalThis.__mongooseConn ?? {
  promise: null,
  conn: null,
};

globalThis.__mongooseConn = globalCache;

export async function connectMongo(): Promise<typeof mongoose> {
  if (globalCache.conn) return globalCache.conn;

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(getEnv().MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
