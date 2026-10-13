import ModelSwitcher from "@/components/admin/ModelSwitcher";
import PromptEditor from "@/components/admin/PromptEditor";
import { PageHeader } from "@/components/admin/ui";

// 後台要先確認管理員身分才顯示內容，不做即時導覽的靜態外殼
export const instant = false;

export default function PromptsPage() {
  return (
    <>
      <PageHeader
        title="Prompt 與模型"
        description="給 AI 的系統提示詞與預設模型都存在 MongoDB。按下儲存就生效（其他伺服器最慢 10 秒內同步），不需要重新部署。"
      />
      <ModelSwitcher />
      <div className="mt-8">
        <PromptEditor />
      </div>
    </>
  );
}
