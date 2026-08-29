import { useState, useEffect, useMemo, useCallback } from "react";

export interface BudgetRow {
  หมวด: string;
  ประเภท: string;
  ราคาในแผน: number;
  ราคานอกแผนและทดแทน: number;
}

const SHEET_ID =
  "1UtSyrAUOXdtRiztXbN4ntobPeS0fMErUrAIeK4NRxcw";
const PLAN_SHEET = "plan";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(PLAN_SHEET)}`;

const DEFAULT_GLOBAL_BUDGET = 20_000_000;

function parseNumber(val: string): number {
  const cleaned = val.replace(/[, \s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseBudgetCSV(text: string): BudgetRow[] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentLine.push(currentField);
        currentField = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") i++;
        currentLine.push(currentField);
        currentField = "";
        if (currentLine.length > 1 || currentLine[0] !== "") {
          lines.push(currentLine);
        }
        currentLine = [];
      } else {
        currentField += ch;
      }
    }
  }
  currentLine.push(currentField);
  if (currentLine.length > 1 || currentLine[0] !== "") {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  return lines
    .slice(1)
    .filter((line) => line.length >= 3)
    .map((line) => ({
      หมวด: line[0]?.trim() || "",
      ประเภท: line[1]?.trim() || "",
      ราคาในแผน: parseNumber(line[2] || "0"),
      ราคานอกแผนและทดแทน: parseNumber(line[24] || "0"),
    }))
    .filter((row) => row.หมวด || row.ประเภท);
}

export function useBudgetData() {
  const [data, setData] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseBudgetCSV(text);
      setData(parsed);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch budget");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute budget summary: total budget by category (หมวด)
  const budgetByCategory = useMemo(() => {
    const map: Record<string, { budget: number; rows: BudgetRow[] }> = {};
    for (const row of data) {
      if (!map[row.หมวด]) {
        map[row.หมวด] = { budget: 0, rows: [] };
      }
      map[row.หมวด].budget += row["ราคาในแผน"];
      map[row.หมวด].rows.push(row);
    }
    return map;
  }, [data]);

  // Total budget across all categories
  const totalBudget = useMemo(
    () => data.reduce((sum, r) => sum + r["ราคาในแผน"], 0),
    [data],
  );

  // Sum ราคานอกแผนและทด替代 from Column Y, default to 20M if empty
  const budgetOutOfPlanAndReplacement = useMemo(() => {
    const sum = data.reduce((s, r) => s + r["ราคานอกแผนและทดแทน"], 0);
    return sum > 0 ? sum : DEFAULT_GLOBAL_BUDGET;
  }, [data]);

  return {
    data,
    loading,
    error,
    budgetByCategory,
    totalBudget,
    budgetOutOfPlanAndReplacement,
    refetch: fetchData,
  };
}
