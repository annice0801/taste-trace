import ModerationWall from "@/components/admin/ModerationWall";
import OrphanCleaner from "@/components/admin/OrphanCleaner";
import { PageHeader } from "@/components/admin/ui";

// 後台要先確認管理員身分才顯示內容，不做即時導覽的靜態外殼
export const instant = false;

export default function AssetsPage() {
  return (
    <>
      <PageHeader
        title="圖片與儲存"
        description="Vercel Blob 的容量、沒有被引用的孤兒檔案，以及使用者上傳的作品照審核。"
      />
      <OrphanCleaner />
      <div className="mt-8">
        <ModerationWall />
      </div>
    </>
  );
}
