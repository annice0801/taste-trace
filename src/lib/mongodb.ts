import "server-only";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// 開發模式下 HMR 會重新執行模組，把連線存在 globalThis 避免每次存檔都開新連線
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose.mongooseCache ??= {
  conn: null,
  promise: null,
});

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("請在 .env.local 設定 MONGODB_URI");
  }

  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
