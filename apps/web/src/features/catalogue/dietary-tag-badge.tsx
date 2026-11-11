interface DietaryTagBadgeProps {
  tag: string;
}

const TAG_LABELS: Record<string, string> = {
  vegetarian: "Veg",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  gluten_free: "GF",
  dairy_free: "DF",
  nut_free: "Nut-Free",
  spicy: "Spicy",
  organic: "Organic",
};

export function DietaryTagBadge({ tag }: DietaryTagBadgeProps) {
  const normalized = tag.toLowerCase().trim();
  const label = TAG_LABELS[normalized] || normalized.replace("_", "-");

  return (
    <span
      title={normalized.replace("_", " ")}
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-tight bg-[#F5F5F4] text-[#525252] border border-[#E5E5E5]"
    >
      {label}
    </span>
  );
}
