import { useState, useEffect, useMemo, useCallback } from "react";

export interface RowData {
  เลขทะเบียนคุม: string;
  เดือน: string;
  กลุ่มภารกิจ: string;
  กลุ่มงาน: string;
  หน่วยงาน: string;
  รายการ: string;
  หมวด: string;
  ประเภท: string;
  ราคาเสนอ: number;
  ประเภทแผน: string;
  _rawMonth: string;
  _sortableMonth: number; // CE year*100+month for date range filtering and sorting
}

export type FilterField = "เลขทะเบียนคุม" | "เดือน" | "กลุ่มภารกิจ" | "กลุ่มงาน" | "หน่วยงาน" | "รายการ" | "หมวด" | "ประเภท" | "ประเภทแผน";

export const ALL_FILTER_FIELDS: FilterField[] = [
  "เลขทะเบียนคุม", "เดือน", "กลุ่มภารกิจ", "กลุ่มงาน",
  "หน่วยงาน", "รายการ", "หมวด", "ประเภท", "ประเภทแผน",
];

export interface Filters {
  เลขทะเบียนคุม: string[];
  เดือน: string[];
  กลุ่มภารกิจ: string[];
  กลุ่มงาน: string[];
  หน่วยงาน: string[];
  รายการ: string[];
  หมวด: string[];
  ประเภท: string[];
  ประเภทแผน: string[];
  dateRange: { start: string; end: string } | null;
}

export const EMPTY_FILTERS: Filters = {
  เลขทะเบียนคุม: [],
  เดือน: [],
  กลุ่มภารกิจ: [],
  กลุ่มงาน: [],
  หน่วยงาน: [],
  รายการ: [],
  หมวด: [],
  ประเภท: [],
  ประเภทแผน: [],
  dateRange: null,
};

const SHEET_ID = "1UtSyrAUOXdtRiztXbN4ntobPeS0fMErUrAIeK4NRxcw";
const SHEET_NAME = "sheet99";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

const THAI_MONTHS: Record<string, number> = {
  "มกราคม": 0, "กุมภาพันธ์": 1, "มีนาคม": 2, "เมษายน": 3,
  "พฤษภาคม": 4, "มิถุนายน": 5, "กรกฎาคม": 6, "สิงหาคม": 7,
  "กันยายน": 8, "ตุลาคม": 9, "พฤศจิกายน": 10, "ธันวาคม": 11,
  "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3,
  "พ.ค.": 4, "มิ.ย.": 5, "ก.ค.": 6, "ส.ค.": 7,
  "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
  "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3,
  "May": 4, "Jun": 5, "Jul": 6, "Aug": 7,
  "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11,
  "January": 0, "February": 1, "March": 2, "April": 3,
  "June": 5, "July": 6, "August": 7,
  "September": 8, "October": 9, "November": 10, "December": 11,
};

function parseThaiDate(val: string): { display: string; sortable: number } {
  const cleaned = val.trim();
  // Try patterns like "มกราคม 2568", "January 2025", "2025-01", "01/2025"
  // Buddhist year pattern
  const thaiMatch = cleaned.match(/([ก-๙a-zA-Z\.]+)\s*(\d{4})/);
  if (thaiMatch) {
    const monthStr = thaiMatch[1];
    let year = parseInt(thaiMatch[2], 10);
    // If year > 2000 it could be CE, else BE
    let month: number;
    if (THAI_MONTHS[monthStr] !== undefined) {
      month = THAI_MONTHS[monthStr];
    } else {
      month = 0;
    }
    // If year < 2000, assume Buddhist era -> convert to CE for sorting
    if (year < 2000) {
      // Buddhist to CE
      year = year - 543;
    }
    // Format display in Buddhist era
    const beYear = year + 543;
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const display = `${monthNames[month]} ${beYear}`;
    const sortable = year * 100 + month;
    return { display, sortable };
  }
  // Numeric patterns
  const numMatch = cleaned.match(/(\d{1,2})[/\-.](\d{4})/);
  if (numMatch) {
    const month = parseInt(numMatch[1], 10) - 1;
    let year = parseInt(numMatch[2], 10);
    if (year < 2000) year = year - 543;
    const beYear = year + 543;
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const display = `${monthNames[month] || "ม.ค."} ${beYear}`;
    const sortable = year * 100 + month;
    return { display, sortable };
  }
  return { display: cleaned, sortable: 0 };
}

function convertToBuddhistYear(val: string): string {
  const cleaned = val.trim();
  // If it contains a CE year like 2024, convert to BE
  const ceMatch = cleaned.match(/(.*?)(\d{4})(.*)/);
  if (ceMatch) {
    const year = parseInt(ceMatch[2], 10);
    if (year >= 2000 && year <= 2100) {
      return `${ceMatch[1]}${year + 543}${ceMatch[3]}`;
    }
  }
  return cleaned;
}

function parseNumber(val: string): number {
  // Handle Thai number formatting - remove commas, spaces
  const cleaned = val.replace(/[,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseCSV(text: string): RowData[] {
  // Simple CSV parser that handles quoted fields
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

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines
    .filter((line) => line.length >= 10)
    .map((line) => {
      const rawMonth = line[1]?.trim() || "";
      const { display: monthDisplay, sortable: sortableMonth } = parseThaiDate(rawMonth);

      return {
        เลขทะเบียนคุม: line[0]?.trim() || "",
        เดือน: monthDisplay || rawMonth,
        กลุ่มภารกิจ: convertToBuddhistYear(line[2]?.trim() || ""),
        กลุ่มงาน: convertToBuddhistYear(line[3]?.trim() || ""),
        หน่วยงาน: convertToBuddhistYear(line[4]?.trim() || ""),
        รายการ: convertToBuddhistYear(line[5]?.trim() || ""),
        หมวด: line[6]?.trim() || "",
        ประเภท: line[7]?.trim() || "",
        ราคาเสนอ: parseNumber(line[8]?.trim() || "0"),
        ประเภทแผน: line[9]?.trim() || "",
        _rawMonth: rawMonth,
        _sortableMonth: sortableMonth,
      };
    })
    .filter((row) => row.เลขทะเบียนคุม || row.กลุ่มภารกิจ || row.หน่วยงาน);
}

export function useGoogleSheetsData() {
  const [rawData, setRawData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseCSV(text);
      setRawData(parsed);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchData();
    return () => { cancelled = true; };
  }, [fetchData]);

  const updateFilter = useCallback((key: keyof Filters, value: string[] | { start: string; end: string } | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    for (const key of ALL_FILTER_FIELDS) {
      const set = new Set<string>();
      for (const row of rawData) {
        const val = String(row[key] || "").trim();
        if (val) set.add(val);
      }
      options[key] = Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
    }
    return options;
  }, [rawData]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return rawData.filter((row) => {
      for (const key of ALL_FILTER_FIELDS) {
        const filterVals = filters[key];
        if (filterVals.length > 0 && !filterVals.includes(String(row[key]))) {
          return false;
        }
      }
      // Date range filter
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        if (start) {
          const startDate = new Date(start);
          const startYear = startDate.getFullYear();
          const startMonth = startDate.getMonth();
          const rowYear = Math.floor(row._sortableMonth / 100);
          const rowMonth = row._sortableMonth % 100;
          if (row._sortableMonth === 0 || rowYear < startYear || (rowYear === startYear && rowMonth < startMonth)) {
            return false;
          }
        }
        if (end) {
          const endDate = new Date(end);
          const endYear = endDate.getFullYear();
          const endMonth = endDate.getMonth();
          const rowYear = Math.floor(row._sortableMonth / 100);
          const rowMonth = row._sortableMonth % 100;
          if (row._sortableMonth === 0 || rowYear > endYear || (rowYear === endYear && rowMonth > endMonth)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [rawData, filters]);

  return {
    rawData,
    filteredData,
    loading,
    error,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    refetch: fetchData,
  };
}
