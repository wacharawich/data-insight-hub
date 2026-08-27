import { useMemo } from "react";
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

const TOP10_DIMENSIONS = [
  { key: "กลุ่มภารกิจ", label: "กลุ่มภารกิจ" },
  { key: "กลุ่มงาน", label: "กลุ่มงาน" },
  { key: "หน่วยงาน", label: "หน่วยงาน" },
  { key: "รายการ", label: "รายการ" },
  { key: "หมวด", label: "หมวด" },
  { key: "ประเภท", label: "ประเภท" },
];

const COLORS = [
  "#059669", "#0d9488", "#0891b2", "#2563eb", "#4f46e5",
  "#7c3aed", "#9333ea", "#db2777", "#dc2626", "#ea580c",
];

function formatCurrency(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("th-TH");
}

function aggregateTop10(
  data: RowData[],
  dimension: string,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const row of data) {
    const key = String((row as unknown as Record<string, unknown>)[dimension] || "").trim();
    if (key) {
      map.set(key, (map.get(key) || 0) + row.ราคาเสนอ);
    }
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function Top10Chart({
  dimension,
  label,
  data,
}: {
  dimension: string;
  label: string;
  data: RowData[];
}) {
  const chartData = useMemo(() => aggregateTop10(data, dimension), [data, dimension]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono mb-3">
          TOP 10 · {label}
        </h4>
        <div className="flex items-center justify-center h-40 text-gray-400 text-xs font-mono">
          ไม่มีข้อมูล
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono mb-3">
        TOP 10 · {label}
      </h4>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 9, fontFamily: "Prompt, monospace" }}
              tickFormatter={formatCompact}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 9, fontFamily: "Prompt, monospace" }}
              width={90}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number) => [
                `฿${formatCurrency(value)}`,
                "ราคารวม",
              ]}
              contentStyle={{
                fontSize: 11,
                fontFamily: "Prompt, monospace",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
              }}
              labelStyle={{ fontFamily: "Prompt, monospace" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Top10Charts({ data }: { data: RowData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {TOP10_DIMENSIONS.map((dim) => (
        <Top10Chart
          key={dim.key}
          dimension={dim.key}
          label={dim.label}
          data={data}
        />
      ))}
    </div>
  );
}
