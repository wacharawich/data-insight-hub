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

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => exportCSV(filtered)}
        >
          <Download className="w-3 h-3" />
          ส่งออก CSV
        </Button>
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
