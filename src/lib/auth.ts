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

// 登入回呼網址的根網址。部署到 Vercel 時若 BETTER_AUTH_URL 沒設定、誤設成 localhost
// （例如直接複製 .env.local）或根本不是網址，改用 Vercel 提供的網址，避免登入導錯地方或建置失敗
function isHttpURL(value: string | undefined): value is string {
  try {
    return Boolean(value) && /^https?:$/.test(new URL(value!).protocol);
  } catch {
    return false;
  }
}

function authBaseURL(): string {
  const configured = process.env.BETTER_AUTH_URL;
  const vercelHost =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  const usable = isHttpURL(configured) && !(process.env.VERCEL && /localhost|127\.0\.0\.1/.test(configured));
  if (usable) return configured!;
  if (process.env.VERCEL && vercelHost) return `https://${vercelHost}`;
  if (configured) console.warn("[auth] BETTER_AUTH_URL 不是有效的網址，改用 http://localhost:3000");
  return "http://localhost:3000";
}

export const auth = betterAuth({
  baseURL: authBaseURL(),
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
