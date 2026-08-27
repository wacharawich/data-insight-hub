import type { RowData } from "@/hooks/use-google-sheets-data";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " K";
  return n.toLocaleString("th-TH");
}

function formatCurrency(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SummaryCards({ data }: { data: RowData[] }) {
  const totalPrice = data.reduce((sum, r) => sum + r.ราคาเสนอ, 0);
  const uniqueDepts = new Set(data.map((r) => r.หน่วยงาน).filter(Boolean)).size;
  const uniqueItems = new Set(data.map((r) => r.รายการ).filter(Boolean)).size;

  const planTypes = ["ในแผน", "นอกแผน", "ทดแทน"];
  const planBreakdown = planTypes.map((pt) => ({
    label: pt,
    value: data.filter((r) => r.ประเภทแผน === pt).reduce((sum, r) => sum + r.ราคาเสนอ, 0),
  }));
  // Also capture any other plan types not in the main three
  const knownPlanValues = new Set(planTypes);
  const otherPlanTotal = data
    .filter((r) => r.ประเภทแผน && !knownPlanValues.has(r.ประเภทแผน))
    .reduce((sum, r) => sum + r.ราคาเสนอ, 0);

  const summaryItems = [
    {
      label: "ราคารวม",
      value: formatCurrency(totalPrice),
      sub: "บาท",
      accent: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "จำนวนหน่วยงาน",
      value: uniqueDepts.toLocaleString("th-TH"),
      sub: "หน่วยงาน",
      accent: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "จำนวนรายการ",
      value: uniqueItems.toLocaleString("th-TH"),
      sub: "รายการ",
      accent: "text-blue-700",
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">
              {item.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${item.accent}`}>
              {item.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Plan type breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {planBreakdown.map((plan) => (
          <div
            key={plan.label}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${
                plan.label === "ในแผน" ? "bg-emerald-500" :
                plan.label === "นอกแผน" ? "bg-amber-500" :
                "bg-red-500"
              }`} />
              <span className="text-xs font-medium text-gray-600 font-mono">
                {plan.label}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-800">
              {formatCurrency(plan.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
