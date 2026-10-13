import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient, ObjectId } from "mongodb";
import { headers } from "next/headers";

// Better Auth 用自己的 MongoClient，使用者、session、帳號會存在同一個資料庫的
// user、session、account、verification collection
const globalForAuth = globalThis as typeof globalThis & {
  authMongoClient?: MongoClient;
};

const client = (globalForAuth.authMongoClient ??= new MongoClient(
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/taste-trace",
));

export const auth = betterAuth({
  database: mongodbAdapter(client.db(), { client }),
  user: {
    // 後台停權：被停權的帳號不能登入，現有的登入也會失效
    additionalFields: {
      banned: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await client
            .db()
            .collection("user")
            .findOne({ _id: new ObjectId(String(session.userId)) }, { projection: { banned: 1 } });
          if (user?.banned) return false;
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [nextCookies()],
});

// Server Component 用：取得目前登入的使用者，未登入回傳 null
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session && !session.user.banned ? session.user : null;
}

// Route Handler 用：從請求取得使用者 id，未登入回傳 null
export async function getUserIdFromRequest(
  request: Request,
): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session && !session.user.banned ? session.user.id : null;
}

// Route Handler 用：取得完整的使用者資料（後台判斷管理員用）
export async function getUserFromRequest(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session && !session.user.banned ? session.user : null;
}
