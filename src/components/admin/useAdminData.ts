"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "./api";

// 讀取後台資料；reload() 重新讀取（例如執行操作之後）
export function useAdminData<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data: T | null; error: string }>({
    url: null,
    data: null,
    error: "",
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    adminFetch<T>(url)
      .then((data) => !cancelled && setState({ url, data, error: "" }))
      .catch((error) => !cancelled && setState({ url, data: null, error: error instanceof Error ? error.message : "讀取失敗" }));
    return () => {
      cancelled = true;
    };
  }, [url, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  // 換了網址、結果還沒回來時視為載入中（保留舊資料避免畫面閃動）
  return { data: state.data, error: state.error, loading: state.url !== url, reload };
}
