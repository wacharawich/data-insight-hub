import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { RowData } from "@/hooks/use-google-sheets-data";
import {
  Search,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const COLUMNS = [
  { key: "เลขทะเบียนคุม", label: "เลขทะเบียนคุม" },
  { key: "เดือน", label: "เดือน" },
  { key: "กลุ่มภารกิจ", label: "กลุ่มภารกิจ" },
  { key: "กลุ่มงาน", label: "กลุ่มงาน" },
  { key: "หน่วยงาน", label: "หน่วยงาน" },
  { key: "รายการ", label: "รายการ" },
  { key: "หมวด", label: "หมวด" },
  { key: "ประเภท", label: "ประเภท" },
  { key: "ราคาเสนอ", label: "ราคาเสนอ" },
  { key: "ประเภทแผน", label: "ประเภทแผน" },
];

const PAGE_SIZE = 20;

type SortDir = "asc" | "desc" | null;

function formatCurrency(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportCSV(data: RowData[]) {
  const headers = COLUMNS.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    COLUMNS.map((col) => {
      const val = col.key === "ราคาเสนอ"
        ? row.ราคาเสนอ
        : String((row as unknown as Record<string, unknown>)[col.key] || "");
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(","),
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const chars = text.split("");
  const lines: string[] = [];
  let line = "";
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function exportPDF(data: RowData[]) {
  const { default: jsPDF } = await import("jspdf");
  try { await document.fonts.load("16px 'Prompt'"); } catch {}

  const PDF_W = 297, PDF_H = 210, M = 10;
  const USABLE_W = PDF_W - M * 2;
  const COL_RATIOS = [0.12, 0.08, 0.12, 0.12, 0.10, 0.14, 0.08, 0.08, 0.09, 0.07];
  const colW = COL_RATIOS.map((r) => r * USABLE_W);

  const SC = 3, FS = 9, LH = FS * 1.35, PAD = 2.5;
  const TITLE_H = 14, HEAD_H = 10;

  // Measure row heights
  const cv = document.createElement("canvas");
  cv.width = 1; cv.height = 1;
  const mCtx = cv.getContext("2d")!;
  mCtx.font = `${FS * SC}px 'Prompt', sans-serif`;

  const rh: number[] = data.map((row) => {
    let maxL = 1;
    for (let ci = 0; ci < COLUMNS.length; ci++) {
      const val = COLUMNS[ci].key === "ราคาเสนอ"
        ? formatCurrency(row.ราคาเสนอ)
        : String((row as unknown as Record<string, unknown>)[COLUMNS[ci].key] || "");
      const n = wrapText(mCtx, val, colW[ci] * SC - PAD * 2 * SC).length;
      if (n > maxL) maxL = n;
    }
    return maxL * LH + PAD * 2;
  });

  const dataAreaH = PDF_H - M * 2 - TITLE_H - HEAD_H;

  // Compute pages
  const pages: { s: number; e: number }[] = [];
  let acc = 0, ps = 0;
  for (let i = 0; i < data.length; i++) {
    if (acc + rh[i] > dataAreaH && i > ps) {
      pages.push({ s: ps, e: i });
      ps = i; acc = 0;
    }
    acc += rh[i];
  }
  if (ps < data.length) pages.push({ s: ps, e: data.length });
  if (!pages.length) pages.push({ s: 0, e: 0 });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const d = data;

  for (let pi = 0; pi < pages.length; pi++) {
    if (pi > 0) doc.addPage();
    const slice = d.slice(pages[pi].s, pages[pi].e);

    let ch = 0;
    for (const row of slice) ch += rh[d.indexOf(row)];
    const pageH = TITLE_H + HEAD_H + ch;

    const cW = Math.round(USABLE_W * SC);
    const cH = Math.round(pageH * SC);
    const can = document.createElement("canvas");
    can.width = cW; can.height = cH;
    const ctx = can.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cW, cH);
    const s = SC;

    // Title
    ctx.fillStyle = "#111827";
    ctx.font = `bold ${13 * s}px 'Prompt', sans-serif`;
    ctx.fillText("CL69 \u00B7 \u0E17\u0E23\u0E40\u0E08\u0E23\u0E34\u0E13\u0E04\u0E33\u0E01\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E23\u0E2A\u0E48\u0E07\u0E08\u0E31\u0E14 \u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E32\u0E07\u0E23\u0E2D\u0E42\u0E21", 0, TITLE_H * s * 0.55);
    ctx.fillStyle = "#6b7280";
    ctx.font = `${9 * s}px 'Prompt', sans-serif`;
    const sub = `\u0E08\u0E33\u0E01\u0E31\u0E1A ${d.length} \u0E23\u0E21\u0E32\u0E14\u0E22\u0E48\u0E32\u0E07` + (pages.length > 1 ? ` \u2022 \u0E1E\u0E34\u0E40\u0E28\u0E29 ${pi + 1}/${pages.length}` : "");
    ctx.fillText(sub, 0, TITLE_H * s * 0.55 + 13 * s);

    let ty = TITLE_H * s;

    const drawRow = (cells: string[], bg: string, fg: string, fw: string, h: number) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, ty, cW, h * s);
      ctx.fillStyle = fg;
      ctx.font = `${fw} ${FS * s}px 'Prompt', sans-serif`;
      let cx = 0;
      for (let ci = 0; ci < cells.length; ci++) {
        const cw = colW[ci] * s;
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx, ty, cw, h * s);
        const lines = wrapText(ctx, cells[ci], cw - PAD * 2 * s);
        const tY = ty + PAD * s + FS * s;
        for (let li = 0; li < lines.length; li++) {
          ctx.fillText(lines[li], cx + PAD * s, tY + li * LH * s);
        }
        cx += cw;
      }
      ty += h * s;
    };

    // Header
    drawRow(COLUMNS.map((c) => c.label), "#f3f4f6", "#374151", "bold", HEAD_H);

    // Rows
    for (let ri = 0; ri < slice.length; ri++) {
      const row = slice[ri];
      const cells = COLUMNS.map((col) =>
        col.key === "ราคาเสนอ"
          ? formatCurrency(row.ราคาเสนอ)
          : String((row as unknown as Record<string, unknown>)[col.key] || ""),
      );
      drawRow(cells, ri % 2 === 0 ? "#fff" : "#f9fafb", "#374151", "normal", rh[d.indexOf(row)]);
    }

    doc.addImage(can.toDataURL("image/png"), "PNG", M, M, USABLE_W, (can.height / can.width) * USABLE_W);
  }

  doc.save("data_export.pdf");
}

export default function DataTable({ data }: { data: RowData[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        COLUMNS.some((col) => {
          const val = col.key === "ราคาเสนอ"
            ? String(row.ราคาเสนอ)
            : String((row as unknown as Record<string, unknown>)[col.key] || "");
          return val.toLowerCase().includes(q);
        }),
      );
    }
    // Sort
    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;
        if (sortKey === "ราคาเสนอ") {
          aVal = a.ราคาเสนอ;
          bVal = b.ราคาเสนอ;
        } else {
          aVal = String((a as unknown as Record<string, unknown>)[sortKey] || "");
          bVal = String((b as unknown as Record<string, unknown>)[sortKey] || "");
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal), "th");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="ค้นหาข้อมูล..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-8 h-8 text-xs bg-gray-50 border-gray-200"
            />
          </div>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {filtered.length} รายการ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => exportCSV(filtered)}
          >
            <Download className="w-3 h-3" />
            ส่งออก CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => exportPDF(filtered)}
          >
            <FileText className="w-3 h-3" />
            ส่งออก PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {COLUMNS.map((col) => {
                const isActive = sortKey === col.key;
                return (
                  <TableHead
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider h-9 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isActive ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-emerald-600" />
                        )
                      ) : (
                        <span className="w-3 h-3" />
                      )}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length}
                  className="text-center py-12 text-gray-400 text-xs"
                >
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, i) => (
                <TableRow
                  key={i}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col.key}
                      className="text-xs py-2 max-w-[200px]"
                    >
                      {col.key === "ราคาเสนอ"
                        ? (
                          <span className="text-right block">
                            {formatCurrency(row.ราคาเสนอ)}
                          </span>
                        )
                        : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate cursor-default">
                                {(row as unknown as Record<string, unknown>)[col.key] as string}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs break-words">
                              <span className="whitespace-normal">
                                {(row as unknown as Record<string, unknown>)[col.key] as string}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">
            หน้า {page + 1} จาก {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 p-0 text-[10px] ${
                    pageNum === page ? "bg-emerald-600 hover:bg-emerald-700" : ""
                  }`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
