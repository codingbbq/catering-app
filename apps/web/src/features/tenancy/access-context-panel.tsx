import { Card, CardContent } from "@/components/ui/card";
import { AccessContextBadge } from "./access-context-badge";

type AccessContextPanelProps = {
  title: string;
  description: string;
  scope: "platform" | "tenant";
  tenantSlug?: string | undefined;
  details: string[];
};

export function AccessContextPanel({
  title,
  description,
  scope,
  tenantSlug,
  details,
}: AccessContextPanelProps) {
  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <AccessContextBadge scope={scope} tenantSlug={tenantSlug} />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#171717]">{title}</h1>
            <p className="max-w-3xl text-sm text-[#737373]">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {details.map((detail) => (
            <div
              key={detail}
              className="rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 text-xs text-[#262626]"
            >
              {detail}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
