import ModerationWall from "@/components/admin/ModerationWall";
import OrphanCleaner from "@/components/admin/OrphanCleaner";
import { PageHeader } from "@/components/admin/ui";

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
