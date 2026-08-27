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

async function exportPDF(data: RowData[]) {
  const { default: jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  // Build a hidden HTML table with the data
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:1122px;font-family:'Prompt',sans-serif;background:#fff;padding:16px 20px;";

  // Header with logo
  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/f/f9/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%A3%E0%B8%A7%E0%B8%87%E0%B8%AA%E0%B8%B2%E0%B8%98%E0%B8%B2%E0%B8%A3%E0%B8%93%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88.png?utm_source=th.wikipedia.org&utm_campaign=index&utm_content=original" style="width:28px;height:28px;border-radius:4px;" crossorigin="anonymous" />
        <div>
          <div style="font-size:13px;font-weight:700;">CL69 · ทะเบียนคุมแผนจัดซื้อจัดจ้าง โรงพยาบาลนางรอง</div>
          <div style="font-size:10px;color:#888;">จำนวน ${data.length} รายการ</div>
        </div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:9px;">
      <thead>
        <tr style="background:#f5f5f5;">
  `;

  for (const col of COLUMNS) {
    html += `<th style="border:1px solid #ddd;padding:4px 6px;text-align:left;font-weight:600;white-space:nowrap;">${col.label}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (const row of data) {
    html += "<tr>";
    for (const col of COLUMNS) {
      const val =
        col.key === "ราคาเสนอ"
          ? formatCurrency(row.ราคาเสนอ)
          : String((row as unknown as Record<string, unknown>)[col.key] || "");
      const align = col.key === "ราคาเสนอ" ? "text-align:right;" : "";
      html += `<td style="border:1px solid #ddd;padding:3px 6px;white-space:pre-wrap;word-break:break-word;${align}">${val}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4 landscape: 297 x 210 mm
    const pdfW = 297;
    const pdfH = 210;
    const margin = 8;
    const usableW = pdfW - margin * 2;
    const usableH = pdfH - margin * 2;

    // Scale image to fit page width
    const scale = usableW / imgWidth;
    const scaledH = imgHeight * scale;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Split across pages if needed
    const pageImgH = usableH / scale;
    let srcY = 0;
    let page = 0;

    while (srcY < imgHeight) {
      if (page > 0) doc.addPage();

      const sliceH = Math.min(pageImgH, imgHeight - srcY);

      // Create a slice canvas
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = imgWidth;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, srcY, imgWidth, sliceH, 0, 0, imgWidth, sliceH);

      const sliceData = sliceCanvas.toDataURL("image/png");
      doc.addImage(sliceData, "PNG", margin, margin, usableW, sliceH * scale);

      srcY += sliceH;
      page++;
    }

    doc.save("data_export.pdf");
  } finally {
    document.body.removeChild(container);
  }
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
              className="pl-8 h-8 text-xs bg-gray-50 border-gray-200 font-mono"
            />
          </div>
          <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
            {filtered.length} รายการ
          </span>
        </div>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 font-mono"
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
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-t-lg font-mono"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                PDF (A4 แนวนอน)
              </button>
              <button
                onClick={() => {
                  exportCSV(filtered);
                  setShowExport(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100 font-mono"
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
                    className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider font-mono h-9 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors"
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
                  className="text-center py-12 text-gray-400 text-xs font-mono"
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
                      className="text-xs py-2 font-mono max-w-[200px]"
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
          <span className="text-[10px] text-gray-400 font-mono">
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
                  className={`h-7 w-7 p-0 text-[10px] font-mono ${
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
