import { Suspense } from "react";
import ErrorLogs from "@/components/admin/ErrorLogs";

export default function LogsPage() {
  return (
    <Suspense>
      <ErrorLogs />
    </Suspense>
  );
}
