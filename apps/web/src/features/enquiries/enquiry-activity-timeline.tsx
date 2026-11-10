"use client";

import type { ActivityType, EnquiryActivityItem } from "@catering/shared-types";
import { useState } from "react";

interface EnquiryActivityTimelineProps {
  activities: EnquiryActivityItem[];
  onAddActivity: (data: { type: ActivityType; content: string }) => Promise<void>;
  isPending?: boolean;
}

const TYPE_CONFIG: Record<ActivityType, { label: string; badge: string }> = {
  note: { label: "Note", badge: "bg-neutral-100 text-neutral-700" },
  call: { label: "Phone Call", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  email: { label: "Email", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  meeting: { label: "Meeting", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  status_change: { label: "Status Change", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

export function EnquiryActivityTimeline({
  activities,
  onAddActivity,
  isPending = false,
}: EnquiryActivityTimelineProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<ActivityType>("note");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting || isPending) return;

    setSubmitting(true);
    try {
      await onAddActivity({ type, content: content.trim() });
      setContent("");
      setType("note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Activity Input */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-[#E5E5E5] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="activity-content" className="text-xs font-semibold text-[#171717]">
            Log Activity or Add Note
          </label>
          <div className="flex items-center gap-1">
            {(["note", "call", "email", "meeting"] as ActivityType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  type === t
                    ? "bg-[#171717] text-white"
                    : "bg-[#FAFAFA] text-[#737373] hover:bg-[#F0F0F0]"
                }`}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          id="activity-content"
          rows={2}
          placeholder={`Add details for this ${TYPE_CONFIG[type].label.toLowerCase()}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-hidden"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim() || submitting || isPending}
            className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving..." : "Add Entry"}
          </button>
        </div>
      </form>

      {/* Activities List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
          Activity History ({activities.length})
        </h4>

        {activities.length === 0 ? (
          <div className="rounded-lg border border-[#E5E5E5] bg-white p-6 text-center text-xs text-[#737373]">
            No activity logged yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-[#E5E5E5] ml-3 space-y-4 py-1">
            {activities.map((act) => {
              const cfg = TYPE_CONFIG[act.type] ?? { label: act.type, badge: "bg-neutral-100 text-neutral-700" };
              const date = new Date(act.createdAt);

              return (
                <div key={act.id} className="relative pl-6">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-[#737373]" />

                  <div className="rounded-lg border border-[#E5E5E5] bg-white p-3 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="font-mono text-[10px] text-[#737373]">
                        {date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {date.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-[#262626] whitespace-pre-wrap leading-relaxed pt-1">
                      {act.content}
                    </p>

                    {act.authorName && (
                      <div className="text-[10px] text-[#737373] pt-1">
                        By {act.authorName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
