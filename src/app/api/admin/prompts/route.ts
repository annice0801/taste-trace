import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-ops";
import { connectDB } from "@/lib/mongodb";
import {
  invalidatePrompt,
  isPromptKey,
  missingPlaceholders,
  PROMPT_DEFINITIONS,
  PROMPT_KEYS,
} from "@/lib/prompts";
import { PromptVersionModel } from "@/models/PromptVersion";

// Prompt CMS：列出每個提示詞的內建預設、所有版本，以及目前生效的版本
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "prompts");
  if (admin instanceof Response) return admin;

  await connectDB();
  const versions = await PromptVersionModel.find().sort({ key: 1, version: -1 }).lean();
  return Response.json({
    prompts: PROMPT_KEYS.map((key) => {
      const own = versions.filter((v) => v.key === key);
      return {
        key,
        label: PROMPT_DEFINITIONS[key].label,
        description: PROMPT_DEFINITIONS[key].description,
        placeholders: PROMPT_DEFINITIONS[key].placeholders,
        defaultContent: PROMPT_DEFINITIONS[key].default,
        activeVersion: own.find((v) => v.active)?.version ?? 0, // 0 代表內建預設
        versions: own.map((v) => ({
          version: v.version,
          content: v.content,
          note: v.note ?? "",
          createdBy: v.createdBy ?? "",
          createdAt: v.createdAt.toISOString(),
          active: Boolean(v.active),
        })),
      };
    }),
  });
}

const saveSchema = z.object({
  key: z.string(),
  content: z.string().trim().min(1).max(20000),
  note: z.string().trim().max(200).default(""),
});

// 儲存成新版本並立即生效
export async function POST(request: Request) {
  const admin = await requireAdmin(request, "prompts");
  if (admin instanceof Response) return admin;
  const body = saveSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !isPromptKey(body.data.key)) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  const { key, content, note } = body.data;
  if (!isPromptKey(key)) return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  const missing = missingPlaceholders(key, content);
  if (missing.length > 0) {
    return Response.json(
      { error: `缺少必要的變數：${missing.map((name) => `{{${name}}}`).join("、")}` },
      { status: 422 },
    );
  }

  await connectDB();
  const latest = await PromptVersionModel.findOne({ key }).sort({ version: -1 }).lean();
  const version = (latest?.version ?? 0) + 1;
  await PromptVersionModel.updateMany({ key, active: true }, { $set: { active: false } });
  await PromptVersionModel.create({ key, version, content, note, createdBy: admin.email, active: true });
  invalidatePrompt(key);
  await audit(admin, "prompt.save", { key, version, note }, `${key} 第 ${version} 版生效`);
  return Response.json({ ok: true, version });
}

const activateSchema = z.object({ key: z.string(), version: z.number().int().min(0) });

// 切換到指定版本；version 0 是內建預設
export async function PUT(request: Request) {
  const admin = await requireAdmin(request, "prompts");
  if (admin instanceof Response) return admin;
  const body = activateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !isPromptKey(body.data.key)) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  const { key, version } = body.data;
  if (!isPromptKey(key)) return Response.json({ error: "請求格式錯誤" }, { status: 400 });

  await connectDB();
  if (version > 0 && !(await PromptVersionModel.exists({ key, version }))) {
    return Response.json({ error: "找不到這個版本" }, { status: 404 });
  }
  await PromptVersionModel.updateMany({ key, active: true }, { $set: { active: false } });
  if (version > 0) await PromptVersionModel.updateOne({ key, version }, { $set: { active: true } });
  invalidatePrompt(key);
  await audit(admin, "prompt.activate", { key, version }, version ? `${key} 切換到第 ${version} 版` : `${key} 改回內建預設`);
  return Response.json({ ok: true });
}
