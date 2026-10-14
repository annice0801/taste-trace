// 後台權限（前後端共用）：擁有者（ADMIN_EMAILS）有全部權限，其他管理員依勾選開放
export const ADMIN_PERMISSIONS = {
  logs: "錯誤日誌",
  prompts: "Prompt 與模型",
  photos: "照片管理",
  assets: "圖片與儲存",
  users: "使用者（含停權）",
  metrics: "使用統計",
  maintenance: "資料維護",
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(ADMIN_PERMISSIONS) as AdminPermission[];

export type AdminInfo = {
  id: string;
  email: string;
  name: string;
  isOwner: boolean; // 擁有者：可以管理其他管理員
  permissions: AdminPermission[];
};

// 後台頁面需要的權限（網址開頭 → 權限）；"owner" 只有擁有者能進
export const PAGE_PERMISSIONS: [string, AdminPermission | "owner"][] = [
  ["/admin/logs", "logs"],
  ["/admin/prompts", "prompts"],
  ["/admin/photos", "photos"],
  ["/admin/assets", "assets"],
  ["/admin/users", "users"],
  ["/admin/metrics", "metrics"],
  ["/admin/maintenance", "maintenance"],
  ["/admin/admins", "owner"],
];

export function canAccess(admin: Pick<AdminInfo, "isOwner" | "permissions">, need: AdminPermission | "owner" | null): boolean {
  if (!need || admin.isOwner) return true;
  return need !== "owner" && admin.permissions.includes(need);
}
