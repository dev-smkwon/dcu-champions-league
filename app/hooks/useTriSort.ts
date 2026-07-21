"use client";

import { useMemo, useState } from "react";

type Direction = "asc" | "desc" | null;

export function useTriSort<T>(source: T[]) {
  const [key, setKey] = useState<keyof T | null>(null);
  const [direction, setDirection] = useState<Direction>(null);
  const rows = useMemo(() => {
    if (!key || !direction) return source;
    return [...source].sort((a, b) => {
      const left = a[key]; const right = b[key];
      const compared = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left ?? "").localeCompare(String(right ?? ""), "ko", { numeric: true });
      return direction === "asc" ? compared : -compared;
    });
  }, [source, key, direction]);
  const toggle = (next: keyof T) => {
    if (key !== next) { setKey(next); setDirection("asc"); return; }
    if (direction === "asc") { setDirection("desc"); return; }
    if (direction === "desc") { setKey(null); setDirection(null); return; }
    setDirection("asc");
  };
  const indicator = (target: keyof T) => key !== target ? "↕" : direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
  return { rows, toggle, indicator, activeKey: key, direction };
}
