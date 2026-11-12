"use client";

import type {
  CatalogueImportRequest,
  CatalogueImportResult,
} from "@catering/shared-types";
import { useState } from "react";
import { useTenantCurrency } from "@/features/tenancy/tenant-provider";

interface CatalogueCsvImporterProps {
  onImport: (data: CatalogueImportRequest) => Promise<CatalogueImportResult>;
  onSuccess?: () => void;
}

interface ParsedPreviewRow {
  rowNum: number;
  name: string;
  category: string;
  description: string;
  costPrice: string;
  sellingPrice: string;
  pricingUnit: string;
  dietaryTags: string;
  minQuantity: string;
  errors: string[];
}

const SAMPLE_CSV = `name,category,description,costPrice,sellingPrice,pricingUnit,dietaryTags,minQuantity
Herb Crusted Salmon,main,Atlantic salmon with parsley crust,8.50,22.00,per_person,"halal,gluten_free",10
Mediterranean Mezze Platter,starter,Hummus, babaganoush, falafel, pita,15.00,38.00,per_tray,"vegetarian,vegan",2
Artisan Sourdough Rolls,bread,Fresh baked sourdough with whipped butter,0.60,2.50,per_piece,"vegetarian",20
Classic Caesar Salad,salad,Crisp romaine with parmesan & brioche croutons,3.50,9.00,per_plate,"vegetarian",5
Dark Chocolate Brownie Bites,dessert,Belgian chocolate bites with sea salt,0.90,3.00,per_piece,"vegetarian",24
Fresh Mint Lemonade,beverage,House brewed lemon mint beverage,1.20,4.50,per_liter,"vegan,gluten_free",5`;

export function CatalogueCsvImporter({
  onImport,
  onSuccess,
}: CatalogueCsvImporterProps) {
  const { formatCurrency } = useTenantCurrency();
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedPreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<CatalogueImportResult | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const downloadSampleTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "catalogue-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvContent = (content: string, name?: string) => {
    setParseError(null);
    setImportResult(null);

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setParseError("CSV must contain at least a header row and one data row.");
      setPreviewRows([]);
      return;
    }

    // Parse header
    const headers = splitCsvLine(lines[0] || "").map((h) =>
      h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
    );

    const nameIdx = headers.findIndex((h) => h === "name" || h === "itemname");
    const categoryIdx = headers.findIndex(
      (h) => h === "category" || h === "itemcategory",
    );
    const descIdx = headers.findIndex(
      (h) => h === "description" || h === "desc" || h === "notes",
    );
    const costIdx = headers.findIndex(
      (h) => h === "costprice" || h === "cost" || h === "unitcost",
    );
    const sellingIdx = headers.findIndex(
      (h) => h === "sellingprice" || h === "price" || h === "rate",
    );
    const unitIdx = headers.findIndex(
      (h) => h === "pricingunit" || h === "unit" || h === "uom",
    );
    const dietaryIdx = headers.findIndex(
      (h) => h === "dietarytags" || h === "dietary" || h === "allergens",
    );
    const minQtyIdx = headers.findIndex(
      (h) => h === "minquantity" || h === "minqty" || h === "minimum",
    );

    if (nameIdx === -1 || sellingIdx === -1) {
      setParseError(
        "CSV header must contain at least 'name' and 'sellingPrice' columns.",
      );
      setPreviewRows([]);
      return;
    }

    const parsed: ParsedPreviewRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = splitCsvLine(line);
      const rowNum = i;

      const itemName = (cols[nameIdx] || "").trim();
      const cat = categoryIdx !== -1 ? (cols[categoryIdx] || "main").trim() : "main";
      const desc = descIdx !== -1 ? (cols[descIdx] || "").trim() : "";
      const cost = costIdx !== -1 ? (cols[costIdx] || "").trim() : "";
      const selling = (cols[sellingIdx] || "").trim();
      const unit = unitIdx !== -1 ? (cols[unitIdx] || "per_person").trim() : "per_person";
      const dietary = dietaryIdx !== -1 ? (cols[dietaryIdx] || "").trim() : "";
      const minQty = minQtyIdx !== -1 ? (cols[minQtyIdx] || "").trim() : "";

      const errors: string[] = [];

      if (!itemName) {
        errors.push("Missing item name");
      }
      if (!selling) {
        errors.push("Missing selling price");
      } else {
        const cleanSelling = Number.parseFloat(selling.replace(/[^0-9.-]+/g, ""));
        if (Number.isNaN(cleanSelling) || cleanSelling < 0) {
          errors.push("Invalid selling price");
        }
      }

      if (cost) {
        const cleanCost = Number.parseFloat(cost.replace(/[^0-9.-]+/g, ""));
        if (Number.isNaN(cleanCost) || cleanCost < 0) {
          errors.push("Invalid cost price");
        }
      }

      parsed.push({
        rowNum,
        name: itemName,
        category: cat,
        description: desc,
        costPrice: cost,
        sellingPrice: selling,
        pricingUnit: unit,
        dietaryTags: dietary,
        minQuantity: minQty,
        errors,
      });
    }

    setPreviewRows(parsed);
    if (name) setFileName(name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCsvContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (previewRows.length === 0) return;

    setIsImporting(true);
    setParseError(null);

    try {
      const rows = previewRows.map((p) => ({
        name: p.name,
        category: p.category,
        description: p.description,
        costPrice: p.costPrice || undefined,
        sellingPrice: p.sellingPrice,
        pricingUnit: p.pricingUnit,
        dietaryTags: p.dietaryTags,
        minQuantity: p.minQuantity || undefined,
      }));

      const res = await onImport({
        filename: fileName || "catalogue-import.csv",
        rows,
      });

      setImportResult(res);
      if (res.successfulRows > 0 && onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Failed to execute import.");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = previewRows.filter((r) => r.errors.length === 0).length;
  const errorCount = previewRows.filter((r) => r.errors.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Action / Help Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-[#E5E5E5] bg-white p-4">
        <div>
          <h4 className="text-xs font-semibold text-[#171717]">
            Spreadsheet Import Guidelines
          </h4>
          <p className="mt-0.5 text-[11px] text-[#737373]">
            Upload a CSV containing your catalogue items. Columns recognized:{" "}
            <code className="text-[#171717] font-mono">name</code>,{" "}
            <code className="text-[#171717] font-mono">sellingPrice</code>,{" "}
            <code className="text-[#171717] font-mono">category</code>,{" "}
            <code className="text-[#171717] font-mono">costPrice</code>,{" "}
            <code className="text-[#171717] font-mono">pricingUnit</code>,{" "}
            <code className="text-[#171717] font-mono">dietaryTags</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadSampleTemplate}
          className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#F5F5F4] transition-colors whitespace-nowrap"
        >
          <svg className="h-3.5 w-3.5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Sample CSV
        </button>
      </div>

      {/* Upload Box */}
      <div className="rounded-lg border-2 border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-6 text-center hover:border-[#171717] transition-colors">
        <svg
          className="mx-auto h-8 w-8 text-[#737373]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-xs font-medium text-[#171717]">
          {fileName ? (
            <span className="font-mono text-[#171717]">{fileName}</span>
          ) : (
            "Choose a CSV file or drag and drop"
          )}
        </p>
        <p className="mt-1 text-[11px] text-[#737373]">
          Maximum 500 rows per single import batch
        </p>
        <div className="mt-4 flex justify-center">
          <label className="cursor-pointer rounded bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors">
            Browse File
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Or Paste Raw Text */}
      <details className="text-xs text-[#737373]">
        <summary className="cursor-pointer font-medium text-[#171717] hover:underline">
          Or paste raw CSV text directly
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              if (e.target.value.trim()) {
                parseCsvContent(e.target.value, "pasted-input.csv");
              }
            }}
            placeholder="Paste comma-separated rows here..."
            className="w-full rounded border border-[#E5E5E5] bg-white p-3 font-mono text-[11px] text-[#171717] focus:border-[#171717] focus:outline-none"
          />
        </div>
      </details>

      {/* Error Banner */}
      {parseError && (
        <div className="rounded border border-[#EF4444] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
          {parseError}
        </div>
      )}

      {/* Import Execution Result */}
      {importResult && (
        <div
          className={`rounded-lg border p-4 text-xs ${
            importResult.status === "completed"
              ? "border-[#86EFAC] bg-[#F0FDF4] text-[#166534]"
              : importResult.status === "partially_failed"
              ? "border-[#FDE047] bg-[#FEFCE8] text-[#854D0E]"
              : "border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center justify-between font-semibold text-sm">
            <span>
              {importResult.status === "completed"
                ? "Import Completed Successfully"
                : importResult.status === "partially_failed"
                ? "Import Partially Completed"
                : "Import Failed"}
            </span>
            <span className="font-mono text-xs">
              Job: {importResult.jobId.slice(0, 8)}...
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-white/60 p-2">
              <div className="text-[10px] uppercase font-bold text-[#737373]">
                Total Rows
              </div>
              <div className="font-mono font-bold text-sm text-[#171717]">
                {importResult.totalRows}
              </div>
            </div>
            <div className="rounded bg-white/60 p-2">
              <div className="text-[10px] uppercase font-bold text-[#15803D]">
                Imported
              </div>
              <div className="font-mono font-bold text-sm text-[#15803D]">
                {importResult.successfulRows}
              </div>
            </div>
            <div className="rounded bg-white/60 p-2">
              <div className="text-[10px] uppercase font-bold text-[#B91C1C]">
                Failed / Skipped
              </div>
              <div className="font-mono font-bold text-sm text-[#B91C1C]">
                {importResult.failedRows}
              </div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-3 border-t border-black/10 pt-2 space-y-1">
              <div className="font-semibold text-[11px]">Row Error Details:</div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {importResult.errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>
                    Row {err.row} {err.name ? `("${err.name}")` : ""}:{" "}
                    {err.errors.join(", ")}
                  </li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>
                    ...and {importResult.errors.length - 10} more row errors.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Validation Preview Table */}
      {previewRows.length > 0 && !importResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-[#171717]">
                Preview ({previewRows.length} rows)
              </span>
              <span className="rounded bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-medium text-[#15803D]">
                {validCount} ready
              </span>
              {errorCount > 0 && (
                <span className="rounded bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-medium text-[#991B1B]">
                  {errorCount} errors
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={validCount === 0 || isImporting}
              onClick={handleExecuteImport}
              className="rounded bg-[#171717] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#262626] transition-colors disabled:opacity-50"
            >
              {isImporting
                ? "Importing..."
                : `Import ${validCount} Valid Items`}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold text-[#737373]">
                <tr>
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">Item Name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Selling</th>
                  <th className="px-3 py-2">Dietary</th>
                  <th className="px-3 py-2">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {previewRows.slice(0, 30).map((row) => (
                  <tr
                    key={row.rowNum}
                    className={
                      row.errors.length > 0 ? "bg-[#FEF2F2]/40" : undefined
                    }
                  >
                    <td className="px-3 py-2 font-mono text-[#737373]">
                      {row.rowNum}
                    </td>
                    <td className="px-3 py-2 font-medium text-[#171717]">
                      {row.name || (
                        <span className="italic text-[#EF4444]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize text-[#525252]">
                      {row.category}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#737373]">
                      {row.pricingUnit}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#737373]">
                      {row.costPrice ? formatCurrency(parseFloat(row.costPrice)) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-[#171717]">
                      {row.sellingPrice ? formatCurrency(parseFloat(row.sellingPrice)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-[#737373]">
                      {row.dietaryTags || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.errors.length === 0 ? (
                        <span className="inline-flex items-center text-[11px] font-medium text-[#15803D]">
                          ✓ Valid
                        </span>
                      ) : (
                        <span
                          title={row.errors.join(", ")}
                          className="inline-flex items-center text-[11px] font-medium text-[#DC2626]"
                        >
                          ⚠ {row.errors[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewRows.length > 30 && (
            <p className="text-[11px] text-[#737373] text-center">
              Showing first 30 of {previewRows.length} rows...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Simple RFC 4180 CSV parser line splitter handling quotes
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
