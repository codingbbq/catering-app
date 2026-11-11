"use client";

import type {
  CatalogueImportRequest,
  CatalogueImportResult,
} from "@catering/shared-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CatalogueCsvImporter } from "@/features/catalogue/catalogue-csv-importer";
import { getImportJobs, importCatalogue } from "@/lib/catalogue-api";
import { useAuth } from "@/providers/auth-provider";

export default function CatalogueImportPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { accessToken, isAuthenticated, isTenant } = useAuth();
  const queryClient = useQueryClient();

  const { data: importJobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ["tenant", tenantSlug, "catalogue-imports"],
    queryFn: () => getImportJobs(accessToken!),
    enabled: isAuthenticated && isTenant && !!accessToken,
  });

  const handleImport = async (
    data: CatalogueImportRequest,
  ): Promise<CatalogueImportResult> => {
    if (!accessToken) throw new Error("Authentication required");
    const result = await importCatalogue(data, accessToken);
    queryClient.invalidateQueries({
      queryKey: ["tenant", tenantSlug, "catalogue"],
    });
    queryClient.invalidateQueries({
      queryKey: ["tenant", tenantSlug, "catalogue-imports"],
    });
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#737373]">
        <Link
          href={`/tenant/${tenantSlug}/catalogue`}
          className="hover:text-[#171717] transition-colors"
        >
          Food Catalogue
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#171717]">Bulk Import</span>
      </div>

      <PageHeader
        title="Import Food Catalogue"
        description="Upload or paste tabular inventory and pricing data from spreadsheets with instant validation feedback."
        actions={
          <Link
            href={`/tenant/${tenantSlug}/catalogue`}
            className="rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#737373] hover:bg-[#F5F5F4] transition-colors"
          >
            Back to Catalogue
          </Link>
        }
      />

      {/* Main Importer */}
      <Card>
        <CardContent className="p-6">
          <CatalogueCsvImporter onImport={handleImport} />
        </CardContent>
      </Card>

      {/* Past Import Jobs History */}
      <Card>
        <CardHeader className="border-b border-[#E5E5E5] px-6 py-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
            Recent Import Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isJobsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
            </div>
          ) : !importJobs || importJobs.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#737373]">
              No previous import jobs recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">File / Batch</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Imported Items</th>
                    <th className="px-6 py-3">Failed / Skipped</th>
                    <th className="px-6 py-3">Total Rows</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {importJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-6 py-3 font-medium text-[#171717]">
                        {job.filename || "CSV Import"}
                      </td>
                      <td className="px-6 py-3">
                        {job.status === "completed" ? (
                          <StatusBadge variant="success">Completed</StatusBadge>
                        ) : job.status === "partially_failed" ? (
                          <StatusBadge variant="warning">
                            Partial Failure
                          </StatusBadge>
                        ) : job.status === "failed" ? (
                          <StatusBadge variant="error">Failed</StatusBadge>
                        ) : (
                          <StatusBadge variant="neutral">Pending</StatusBadge>
                        )}
                      </td>
                      <td className="px-6 py-3 font-mono font-semibold text-[#15803D]">
                        {job.successfulRows}
                      </td>
                      <td className="px-6 py-3 font-mono text-[#B91C1C]">
                        {job.failedRows > 0 ? job.failedRows : "0"}
                      </td>
                      <td className="px-6 py-3 font-mono text-[#737373]">
                        {job.totalRows}
                      </td>
                      <td className="px-6 py-3 font-mono text-[#737373]">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
