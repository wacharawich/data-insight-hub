interface BarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  layout?: "vertical" | "horizontal";
}

function formatLabel(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  return n.toLocaleString("th-TH");
}

export default function BarLabel({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  value = 0,
  layout = "horizontal",
}: BarLabelProps) {
  if (!value) return null;
  const label = formatLabel(value);

  if (layout === "vertical") {
    // Horizontal bars — label to the right of the bar end
    return (
      <text
        x={x + width + 4}
        y={y + height / 2}
        dominantBaseline="central"
        textAnchor="start"
        style={{ fontSize: 9, fontFamily: "Prompt, monospace", fill: "#4b5563" }}
      >
        ฿{label}
      </text>
    );
  }

  // Vertical bars — label above the bar top
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      style={{ fontSize: 9, fontFamily: "Prompt, monospace", fill: "#4b5563" }}
    >
      ฿{label}
    </text>
  );
}
