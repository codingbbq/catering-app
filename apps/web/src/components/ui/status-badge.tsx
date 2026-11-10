import type { ReactNode } from "react";

export type StatusVariant = "success" | "warning" | "error" | "neutral" | "info";

interface StatusBadgeProps {
  children: ReactNode;
  variant?: StatusVariant;
  showDot?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, { badge: string; dot: string }> = {
  success: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-50 text-amber-800 border-amber-200/80",
    dot: "bg-amber-500",
  },
  error: {
    badge: "bg-rose-50 text-rose-800 border-rose-200/80",
    dot: "bg-rose-500",
  },
  neutral: {
    badge: "bg-neutral-100 text-neutral-700 border-neutral-200",
    dot: "bg-neutral-400",
  },
  info: {
    badge: "bg-stone-100 text-stone-700 border-stone-200",
    dot: "bg-stone-400",
  },
};

export function StatusBadge({
  children,
  variant = "neutral",
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium border ${styles.badge} ${className}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  );
}
