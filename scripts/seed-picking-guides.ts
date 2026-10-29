// 把 data/picking-guides.json 的蔬果挑選標準寫進資料庫（依名稱更新，JSON 裡刪掉的項目也會從資料庫移除）
// 用法：npm run seed:picking            寫入 .env.local 的 MONGODB_URI
//      npm run seed:picking -- --dry-run 只檢查內容，不寫入
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { z } from "zod";
import { pickingEntrySchema } from "../src/lib/picking.ts";

// 與 src/lib/quantity.ts 的 ingredientKey 相同：忽略空白與括號說明
const keyOf = (name: string) => name.replace(/[（(][^）)]*[）)]/g, "").replace(/\s+/g, "").trim();

const entries = z.array(pickingEntrySchema).parse(JSON.parse(readFileSync(new URL("../data/picking-guides.json", import.meta.url), "utf8")));

// 名稱與其他叫法不能重複，否則查詢時會對到錯的蔬果
const owner = new Map<string, string>();
for (const entry of entries) {
  for (const key of [entry.name, ...entry.aliases].map(keyOf)) {
    if (owner.has(key)) throw new Error(`「${key}」同時出現在「${owner.get(key)}」與「${entry.name}」`);
    owner.set(key, entry.name);
  }
}

const docs = entries.map((entry) => ({
  ...entry,
  key: keyOf(entry.name),
  aliases: entry.aliases.map(keyOf),
  englishNames: entry.englishNames.map((name) => name.trim().toLowerCase()),
}));

const dryRun = process.argv.includes("--dry-run");
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
try {
  const db = client.db();

  // 檢查當季蔬果裡的每一種都對得到挑選標準（中文名稱、其他叫法或英文名稱）
  const englishOwner = new Set(docs.flatMap((d) => d.englishNames));
  const missing = new Set<string>();
  for (const guide of await db.collection("produceguides").find({}, { projection: { items: 1 } }).toArray()) {
    for (const item of guide.items as { name: string; englishName?: string }[]) {
      const found = owner.has(keyOf(item.name)) || englishOwner.has((item.englishName ?? "").trim().toLowerCase());
      if (!found) missing.add(item.name);
    }
  }

  console.log(`${docs.length} 種蔬果（${docs.filter((d) => d.type === "fruit").length} 水果、${docs.filter((d) => d.type === "vegetable").length} 蔬菜）`);
  console.log(missing.size ? `當季蔬果中沒有對應的：${[...missing].join("、")}` : "當季蔬果全部都有對應的挑選標準");
  if (dryRun) {
    console.log("--dry-run：沒有寫入資料庫");
  } else {
    const collection = db.collection("pickingguides");
    const now = new Date();
    await collection.bulkWrite(
      docs.map((doc) => ({
        updateOne: { filter: { key: doc.key }, update: { $set: { ...doc, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true },
      })),
    );
    const removed = await collection.deleteMany({ key: { $nin: docs.map((d) => d.key) } });
    await collection.createIndex({ key: 1 }, { unique: true });
    await collection.createIndex({ aliases: 1 });
    await collection.createIndex({ englishNames: 1 });
    console.log(`已寫入 ${db.databaseName}.pickingguides：${docs.length} 筆，移除 ${removed.deletedCount} 筆`);
  }
} finally {
  await client.close();
}
