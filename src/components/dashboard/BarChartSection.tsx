import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { RowData } from "@/hooks/use-google-sheets-data";

const DIMENSIONS: { key: string; label: string }[] = [
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

const COLORS = [
  "#059669", "#d97706", "#2563eb", "#dc2626", "#7c3aed",
  "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#0d9488",
  "#b91c1c", "#1d4ed8", "#9333ea", "#ea580c", "#65a30d",
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("th-TH");
}

function formatCurrency(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function aggregateData(
  data: RowData[],
  dimension: string,
): { name: string; value: number; fullName: string }[] {
  const map = new Map<string, number>();

  if (dimension === "ราคาเสนอ") {
    // Group by price ranges
    const ranges = [
      { label: "0-10K", min: 0, max: 10000 },
      { label: "10K-50K", min: 10000, max: 50000 },
      { label: "50K-100K", min: 50000, max: 100000 },
      { label: "100K-500K", min: 100000, max: 500000 },
      { label: "500K-1M", min: 500000, max: 1000000 },
      { label: "1M+", min: 1000000, max: Infinity },
    ];
    for (const row of data) {
      const range = ranges.find((r) => row.ราคาเสนอ >= r.min && row.ราคาเสนอ < r.max);
      if (range) {
        map.set(range.label, (map.get(range.label) || 0) + row.ราคาเสนอ);
      }
    }
  } else {
    for (const row of data) {
      const key = String((row as unknown as Record<string, unknown>)[dimension] || "").trim();
      if (key) {
        map.set(key, (map.get(key) || 0) + row.ราคาเสนอ);
      }
    }
  }

  const result = Array.from(map.entries())
    .map(([name, value]) => ({ name, value, fullName: name }))
    .sort((a, b) => b.value - a.value);

  return result;
}

export default function BarChartSection({ data }: { data: RowData[] }) {
  const [selectedDim, setSelectedDim] = useState("เดือน");

  const chartData = useMemo(() => {
    return aggregateData(data, selectedDim);
  }, [data, selectedDim]);

  // For month dimension, allow more than 12; for others, limit to 12
  const isMonth = selectedDim === "เดือน";
  const displayData = isMonth ? chartData : chartData.slice(0, 12);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">
            ยอดรวมราคาเสนอ จำแนกตาม
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isMonth ? "แสดงทุกเดือนที่มีข้อมูล" : "แสดง 12 อันดับแรก"}
          </p>
        </div>
      </div>

      {/* Dimension selector tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {DIMENSIONS.map((dim) => (
          <button
            key={dim.key}
            onClick={() => setSelectedDim(dim.key)}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-colors ${
              selectedDim === dim.key
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {dim.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {displayData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm font-mono">
          ไม่มีข้อมูล
        </div>
      ) : (
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              margin={{ top: 10, right: 10, left: 10, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontFamily: "Prompt, monospace" }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "Prompt, monospace" }}
                tickFormatter={formatNumber}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [
                  `฿${formatCurrency(value)}`,
                  "ราคารวม",
                ]}
                contentStyle={{
                  fontSize: 12,
                  fontFamily: "Prompt, monospace",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {displayData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
