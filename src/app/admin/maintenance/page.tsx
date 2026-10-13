import Maintenance from "@/components/admin/Maintenance";

// 後台要先確認管理員身分才顯示內容，不做即時導覽的靜態外殼
export const instant = false;

export default function MaintenancePage() {
  return <Maintenance />;
}
