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
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText,
  FileSpreadsheet,
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

const LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/f/f9/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%A3%E0%B8%A7%E0%B8%87%E0%B8%AA%E0%B8%B2%E0%B8%98%E0%B8%B2%E0%B8%A3%E0%B8%93%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88.png?utm_source=th.wikipedia.org&utm_campaign=index&utm_content=original";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split("");
  const lines: string[] = [];
  let line = "";
  for (const ch of words) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function ensureFontLoaded() {
  try {
    await document.fonts.load("16px 'Prompt'");
  } catch {
    // Font may already be loaded or unavailable; continue anyway
  }
}

async function exportPDF(data: RowData[]) {
  const { default: jsPDF } = await import("jspdf");
  await ensureFontLoaded();

  // --- A4 landscape dimensions (mm) ---
  const PDF_W = 297;
  const PDF_H = 210;
  const MARGIN_MM = 10;
  const USABLE_W = PDF_W - MARGIN_MM * 2; // 277mm
  const USABLE_H = PDF_H - MARGIN_MM * 2; // 190mm

  // --- Column width ratios (proportional, sum = 1) ---
  const COL_RATIOS = [0.12, 0.08, 0.12, 0.12, 0.10, 0.14, 0.08, 0.08, 0.09, 0.07];
  const colWidthsMM = COL_RATIOS.map((r) => r * USABLE_W);

  // --- Canvas drawing constants ---
  const SCALE = 3; // high-res for crisp text
  const FONT_SIZE = 9;
  const LINE_H = FONT_SIZE * 1.35;
  const CELL_PAD = 2.5;
  const HEADER_ROW_H = 10; // mm for header row
  const TITLE_AREA_H = 14; // mm for title + subtitle

  // --- Measure rows to find how many fit per page ---
  const offCanvas = document.createElement("canvas");
  offCanvas.width = 1;
  offCanvas.height = 1;
  const mCtx = offCanvas.getContext("2d")!;
  mCtx.font = `${FONT_SIZE * SCALE}px 'Prompt', sans-serif`;

  const rowHeightsMM: number[] = [];
  for (const row of data) {
    let maxLines = 1;
    for (let ci = 0; ci < COLUMNS.length; ci++) {
      const col = COLUMNS[ci];
      const val =
        col.key === "ราคาเสนอ"
          ? formatCurrency(row.ราคาเสนอ)
          : String((row as unknown as Record<string, unknown>)[col.key] || "");
      const cellWPx = colWidthsMM[ci] * SCALE - CELL_PAD * 2 * SCALE;
      const lines = wrapText(mCtx, val, cellWPx);
      if (lines.length > maxLines) maxLines = lines.length;
    }
    rowHeightsMM.push(maxLines * LINE_H + CELL_PAD * 2);
  }

  // Available height for data rows per page
  const dataAreaH = USABLE_H - TITLE_AREA_H - HEADER_ROW_H;

  // Compute page breaks
  const pages: { start: number; end: number }[] = [];
  let accumulated = 0;
  let pageStart = 0;
  for (let i = 0; i < data.length; i++) {
    if (accumulated + rowHeightsMM[i] > dataAreaH && i > pageStart) {
      pages.push({ start: pageStart, end: i });
      pageStart = i;
      accumulated = 0;
    }
    accumulated += rowHeightsMM[i];
  }
  if (pageStart < data.length) {
    pages.push({ start: pageStart, end: data.length });
  }
  if (pages.length === 0) pages.push({ start: 0, end: 0 });

  // --- Draw each page on a canvas then add to PDF ---
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logoImg = await loadImage(LOGO_URL);

  const drawPage = (pageIdx: number, pageData: RowData[], startIdx: number) => {
    // Calculate this page's actual content height
    let contentH = 0;
    for (const row of pageData) contentH += rowHeightsMM[rowData.indexOf(row)];
    const pageContentH = TITLE_AREA_H + HEADER_ROW_H + contentH;

    const cW = Math.round(USABLE_W * SCALE);
    const cH = Math.round(pageContentH * SCALE);
    const canvas = document.createElement("canvas");
    canvas.width = cW;
    canvas.height = cH;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    const s = SCALE;

    // Title area
    let ty = TITLE_AREA_H * s * 0.55;
    ctx.fillStyle = "#111827";
    ctx.font = `bold ${13 * s}px 'Prompt', sans-serif`;
    ctx.fillText("CL69 \u00B7 \u0E17\u0E23\u0E40\u0E08\u0E23\u0E34\u0E13\u0E04\u0E33\u0E01\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E23\u0E2A\u0E48\u0E07\u0E08\u0E31\u0E14 \u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E32\u0E07\u0E23\u0E2D\u0E42\u0E21", 0, ty);
    ctx.fillStyle = "#6b7280";
    ctx.font = `${9 * s}px 'Prompt', sans-serif`;
    const subtitle = `\u0E08\u0E33\u0E01\u0E31\u0E1A ${data.length} \u0E23\u0E21\u0E32\u0E14\u0E22\u0E48\u0E32\u0E07` + (pages.length > 1 ? ` \u2022 \u0E1E\u0E34\u0E40\u0E28\u0E29 ${pageIdx + 1}/${pages.length}` : "");
    ctx.fillText(subtitle, 0, ty + 13 * s);

    if (logoImg) {
      const logoSize = 10 * s;
      ctx.drawImage(logoImg, cW - logoSize, 0, logoSize, logoSize);
    }

    // Table top
    let tableY = TITLE_AREA_H * s;

    // --- Draw header row ---
    const drawTableRow = (
      cells: string[],
      bg: string,
      fg: string,
      fontWeight: string,
      rh: number,
    ) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, tableY, cW, rh * s);
      ctx.fillStyle = fg;
      ctx.font = `${fontWeight} ${FONT_SIZE * s}px 'Prompt', sans-serif`;
      let cx = 0;
      for (let ci = 0; ci < cells.length; ci++) {
        const cw = colWidthsMM[ci] * s;
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx, tableY, cw, rh * s);
        // Text
        const maxTextW = cw - CELL_PAD * 2 * s;
        const lines = wrapText(ctx, cells[ci], maxTextW);
        const textStartY = tableY + CELL_PAD * s + FONT_SIZE * s;
        for (let li = 0; li < lines.length; li++) {
          ctx.fillText(lines[li], cx + CELL_PAD * s, textStartY + li * LINE_H * s);
        }
        cx += cw;
      }
      tableY += rh * s;
    };

    // Header
    drawTableRow(
      COLUMNS.map((c) => c.label),
      "#f3f4f6",
      "#374151",
      "bold",
      HEADER_ROW_H,
    );

    // Data rows
    for (let ri = 0; ri < pageData.length; ri++) {
      const row = pageData[ri];
      const cells = COLUMNS.map((col) =>
        col.key === "ราคาเสนอ"
          ? formatCurrency(row.ราคาเสนอ)
          : String((row as unknown as Record<string, unknown>)[col.key] || ""),
      );
      const rh = rowHeightsMM[rowData.indexOf(row)];
      drawTableRow(
        cells,
        ri % 2 === 0 ? "#ffffff" : "#f9fafb",
        "#374151",
        "normal",
        rh,
      );
    }

    return canvas;
  };

  // Keep a reference for index lookup
  const rowData = data;

  // --- Build PDF ---
  for (let pi = 0; pi < pages.length; pi++) {
    if (pi > 0) doc.addPage();
    const { start, end } = pages[pi];
    const pageData = data.slice(start, end);
    const canvas = drawPage(pi, pageData, start);
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", MARGIN_MM, MARGIN_MM, USABLE_W, (canvas.height / canvas.width) * USABLE_W);
  }

  doc.save("data_export.pdf");
}

export default function DataTable({ data }: { data: RowData[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showExport, setShowExport] = useState(false);
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

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowExport(!showExport)}
          >
            <Download className="w-3 h-3" />
            ส่งออก
          </Button>
          {showExport && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
              <button
                onClick={() => {
                  exportPDF(filtered);
                  setShowExport(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                PDF
              </button>
              <button
                onClick={() => {
                  exportCSV(filtered);
                  setShowExport(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-gray-400" />
                CSV
              </button>
            </div>
          )}
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
