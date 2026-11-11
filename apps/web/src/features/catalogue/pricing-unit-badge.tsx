import type { PricingUnit } from "@catering/shared-types";

interface PricingUnitBadgeProps {
  unit: PricingUnit | string;
}

const UNIT_LABELS: Record<string, string> = {
  per_person: "/ person",
  per_plate: "/ plate",
  per_kg: "/ kg",
  per_tray: "/ tray",
  per_piece: "/ piece",
  per_liter: "/ liter",
  fixed: "flat",
};

export function PricingUnitBadge({ unit }: PricingUnitBadgeProps) {
  const label = UNIT_LABELS[unit] || unit.replace("_", " ");

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-[#737373] bg-[#FAFAFA] border border-[#E5E5E5]">
      {label}
    </span>
  );
}
