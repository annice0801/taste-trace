import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 使用者上傳的作品照：圖檔存在 Vercel Blob，這裡只存網址與關聯
const creationSchema = new Schema(
  {
    userId: { type: String, required: true }, // Better Auth 的 user.id
    recipe: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    url: { type: String, required: true }, // Vercel Blob 網址
    pathname: { type: String, required: true }, // Blob 內的路徑，刪除時用
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    caption: { type: String, trim: true, maxlength: 300 }, // 做的過程與心得，公開時其他人看得到
    note: { type: String, trim: true, maxlength: 500 }, // 私人備註，只有上傳者看得到
    // 舊資料沒有這個欄位，一律當作私人
    visibility: { type: String, enum: ["public", "private"], default: "private" },
  },
  { timestamps: true },
);

creationSchema.index({ userId: 1, createdAt: -1 });
creationSchema.index({ userId: 1, recipe: 1, createdAt: -1 });
creationSchema.index({ recipe: 1, visibility: 1, createdAt: -1 });

export type Creation = InferSchemaType<typeof creationSchema>;

export const CreationModel: Model<Creation> =
  (models.Creation as Model<Creation>) ?? model<Creation>("Creation", creationSchema);
