import type { ReactElement } from "react";

const MAX_CHARS = 12;

interface TruncatedTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  angle?: number;
  textAnchor?: "start" | "middle" | "end" | "inherit";
  maxChars?: number;
}

export default function TruncatedTick({
  x = 0,
  y = 0,
  payload,
  angle,
  textAnchor = "end" as const,
  maxChars = MAX_CHARS,
}: TruncatedTickProps): ReactElement {
  const fullText = payload?.value || "";
  const truncated =
    fullText.length > maxChars ? fullText.slice(0, maxChars) + "…" : fullText;

  const rotate = angle ? `rotate(${angle})` : undefined;

  return (
    <g transform={`translate(${x},${y})`}>
      {rotate && (
        <text
          transform={rotate}
          textAnchor={textAnchor}
          dominantBaseline="central"
          className="recharts-cartesian-axis-tick-value"
          style={{ fontSize: 10, fontFamily: "Prompt, monospace", fill: "#6b7280" }}
        >
          {truncated}
          {fullText !== truncated && <title>{fullText}</title>}
        </text>
      )}
      {!rotate && (
        <text
          textAnchor={textAnchor}
          dominantBaseline="central"
          className="recharts-cartesian-axis-tick-value"
          style={{ fontSize: 10, fontFamily: "Prompt, monospace", fill: "#6b7280" }}
        >
          {truncated}
          {fullText !== truncated && <title>{fullText}</title>}
        </text>
      )}
    </g>
  );
}
