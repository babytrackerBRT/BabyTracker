"use client";

export function MaterialIcon({ name, filled = false, className = "" }: { name: string; filled?: boolean; className?: string }) {
  // koristi Google Material Symbols (font)
  // filled=true daje "FILL" varijantu
  const base = "material-symbols-rounded";
  const fill = filled ? " filled" : "";
  return <span className={`${base}${fill} ${className}`.trim()}>{name}</span>;
}
