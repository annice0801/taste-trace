"use client";

import { useEffect, useRef } from "react";

// 滾動視差：元素依它在畫面中的位置位移、縮放。
//   shift：上下位移幅度（元素自身高度的百分比），正值比頁面捲得慢、負值比頁面捲得快
//   x：左右位移幅度（元素自身寬度的百分比），用在大字橫向滑動
//   zoom：放大幅度，元素在畫面下緣時放大最多、捲到畫面中央回到原尺寸（例：0.12 → 1.12 倍）
// 使用者開啟「減少動態效果」時不做任何位移。
export default function Parallax({
  shift = 8,
  x = 0,
  zoom = 0,
  from = 0,
  className = "",
  children,
}: {
  shift?: number;
  x?: number;
  zoom?: number;
  from?: number; // 視窗寬度至少這麼寬才啟用（px），例如只在平板以上使用
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const enabled = window.matchMedia(`(min-width: ${from}px)`);

    let frame = 0;
    let visible = false;

    function update() {
      frame = 0;
      if (!element || !visible) return;
      if (!enabled.matches) {
        element.style.transform = "";
        return;
      }
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      // 元素中心在畫面中央時為 0，在畫面上下緣時為 ±1（超出也不再位移）
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - viewport / 2) / viewport));
      const scale = zoom ? 1 + Math.max(0, progress) * zoom : 1;
      element.style.transform =
        `translate3d(${(progress * x).toFixed(2)}%, ${(progress * shift).toFixed(2)}%, 0)` +
        (zoom ? ` scale(${scale.toFixed(4)})` : "");
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    // 只在元素進入畫面附近時才計算
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
      },
      { rootMargin: "20% 0px" },
    );
    observer.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [shift, x, zoom, from]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
