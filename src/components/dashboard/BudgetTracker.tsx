import {
  BUDGETS,
  type BudgetRow,
} from "@/hooks/use-budget-data";
import type { RowData } from "@/hooks/use-google-sheets-data";
import { Target, TrendingUp, AlertTriangle } from "lucide-react";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " K";
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function fmtFull(n: number): string {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface Props {
  budgetData: BudgetRow[];
  actualData: RowData[];
}

export default function BudgetTracker({ budgetData, actualData }: Props) {
  // --- ในแผน: aggregate actual spending by หมวด+ประเภท ---
  const actualInPlan = new Map<string, number>();
  for (const row of actualData) {
    if (row["ประเภทแผน"] !== "ในแผน") continue;
    const key = `${row["หมวด"]}__${row["ประเภท"]}`;
    actualInPlan.set(key, (actualInPlan.get(key) || 0) + row["ราคาเสนอ"]);
  }

  // --- นอกแผน: total actual ---
  const actualOutOfPlan = actualData
    .filter((r) => r["ประเภทแผน"] === "นอกแผน")
    .reduce((sum, r) => sum + r["ราคาเสนอ"], 0);

  // --- ทด替代: total actual ---
  const actualReplacement = actualData
    .filter((r) => r["ประเภทแผน"] === "ทด替代")
    .reduce((sum, r) => sum + r["ราคาเสนอ"], 0);

  // --- Total budget & actual ---
  const totalBudgetInPlan = budgetData.reduce(
    (sum, r) => sum + r["ราคาในแผน"],
    0,
  );
  const totalActualInPlan = Array.from(actualInPlan.values()).reduce(
    (sum, v) => sum + v,
    0,
  );

  // --- Budget by หมวด ---
  const categoriesMap = new Map<
    string,
    { budget: number; actual: number; items: BudgetRow[] }
  >();
  for (const row of budgetData) {
    if (!categoriesMap.has(row["หมวด"])) {
      categoriesMap.set(row["หมวด"], { budget: 0, actual: 0, items: [] });
    }
    const cat = categoriesMap.get(row["หมวด"])!;
    cat.budget += row["ราคาในแผน"];
    const key = `${row["หมวด"]}__${row["ประเภท"]}`;
    cat.actual += actualInPlan.get(key) || 0;
    cat.items.push(row);
  }

  // Sort categories by budget descending
  const categories = Array.from(categoriesMap.entries()).sort(
    (a, b) => b[1].budget - a[1].budget,
  );

  const pct = (used: number, total: number) =>
    total > 0 ? Math.min((used / total) * 100, 100) : 0;

  const barColor = (p: number) => {
    if (p >= 90) return "bg-red-500";
    if (p >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const textColor = (p: number) => {
    if (p >= 90) return "text-red-600";
    if (p >= 70) return "text-amber-600";
    return "text-emerald-600";
  };

  // --- Render ---
  return (
    <div className="space-y-4">
      {/* ===== Grand summary ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="งบในแผน (ทั้งหมด)"
          budget={totalBudgetInPlan}
          actual={totalActualInPlan}
          accent="emerald"
        />
        <SummaryCard
          label="งบนอกแผน"
          budget={BUDGETS["นอกแผน"]}
          actual={actualOutOfPlan}
          accent="amber"
        />
        <SummaryCard
          label="งบทด替代"
          budget={BUDGETS["ทด替代"]}
          actual={actualReplacement}
          accent="blue"
        />
      </div>

      {/* ===== Cards by หมวด ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {categories.map(([catName, cat]) => {
          const p = pct(cat.actual, cat.budget);
          return (
            <div
              key={catName}
              className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">
                    {catName}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold font-mono ${textColor(p)}`}
                >
                  {p.toFixed(0)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(p)}`}
                  style={{ width: `${p}%` }}
                />
              </div>

              {/* Amounts */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  ใช้ไป <span className="font-semibold text-gray-800">฿{fmt(cat.actual)}</span>
                </span>
                <span className="text-gray-500">
                  งบ <span className="font-semibold text-gray-800">฿{fmt(cat.budget)}</span>
                </span>
              </div>

              {/* Sub-items (each ประเภท) */}
              {cat.items.length > 1 && (
                <div className="border-t border-gray-100 pt-2 space-y-1.5 max-h-36 overflow-y-auto">
                  {cat.items
                    .filter((item) => item["ราคาในแผน"] > 0)
                    .sort((a, b) => b["ราคาในแผน"] - a["ราคาในแผน"])
                    .map((item) => {
                      const key = `${item["หมวด"]}__${item["ประเภท"]}`;
                      const used = actualInPlan.get(key) || 0;
                      const ip = pct(used, item["ราคาในแผน"]);
                      return (
                        <div key={item["ประเภท"]} className="flex items-center gap-2 text-[11px]">
                          <span className="text-gray-500 truncate flex-1 min-w-0" title={item["ประเภท"]}>
                            {item["ประเภท"]}
                          </span>
                          <span className="text-gray-700 font-mono whitespace-nowrap">
                            ฿{fmt(used)} / ฿{fmt(item["ราคาในแผน"])}
                          </span>
                          <span
                            className={`font-bold font-mono whitespace-nowrap ${textColor(ip)}`}
                          >
                            {ip.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* If no budget data */}
      {budgetData.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          ไม่พบข้อมูลงบประมาณ — ตรวจสอบว่ามีข้อมูลใน Google Sheet "plan" แล้ว
        </div>
      )}
    </div>
  );
}

/* ---------- small sub-component ---------- */
function SummaryCard({
  label,
  budget,
  actual,
  accent,
}: {
  label: string;
  budget: number;
  actual: number;
  accent: "emerald" | "amber" | "blue";
}) {
  const p = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
  const dot =
    accent === "emerald"
      ? "bg-emerald-500"
      : accent === "amber"
        ? "bg-amber-500"
        : "bg-blue-500";
  const barBg =
    accent === "emerald"
      ? "bg-emerald-500"
      : accent === "amber"
        ? "bg-amber-500"
        : "bg-blue-500";
  const pctText =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
        ? "text-amber-600"
        : "text-blue-600";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-lg font-bold text-gray-800">฿{fmt(actual)}</span>
          <span className="text-xs text-gray-400 ml-1">/ ฿{fmt(budget)}</span>
        </div>
        <span className={`text-sm font-bold font-mono ${pctText}`}>
          {p.toFixed(0)}%
        </span>
      </div>

      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barBg}`}
          style={{ width: `${p}%` }}
        />
      </div>

      {p >= 90 && p < 100 && (
        <div className="flex items-center gap-1 text-[10px] text-amber-500">
          <AlertTriangle className="w-3 h-3" />
          ใกล้หมดงบ
        </div>
      )}
      {p >= 100 && (
        <div className="flex items-center gap-1 text-[10px] text-red-500">
          <TrendingUp className="w-3 h-3" />
          ใช้เกินงบ
        </div>
      )}
    </div>
  );
}
