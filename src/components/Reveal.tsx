"use client";

import { useEffect, useRef } from "react";

// 捲動到畫面時浮現：從下方 28px、微微模糊淡入。delay 用來做依序出現的節奏（ms）。
// 動畫寫在 globals.css 的 .reveal；減少動態效果時直接顯示。
export default function Reveal({
  delay = 0,
  as: Tag = "div",
  className = "",
  children,
}: {
  delay?: number;
  as?: "div" | "li" | "section" | "span";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.shown = "true";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error 各種標籤的 ref 型別不同，這裡只用來加上 data 屬性
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
