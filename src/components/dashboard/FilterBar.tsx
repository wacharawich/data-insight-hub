import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Filters, FilterField } from "@/hooks/use-google-sheets-data";
import { ALL_FILTER_FIELDS } from "@/hooks/use-google-sheets-data";
import { Filter, X } from "lucide-react";

interface FilterBarProps {
  filters: Filters;
  filterOptions: Record<string, string[]>;
  updateFilter: (
    key: keyof Filters,
    value: string[] | { start: string; end: string } | null,
  ) => void;
  clearFilters: () => void;
}

const FILTER_LABELS: Record<string, string> = {
  เลขทะเบียนคุม: "เลขทะเบียนคุม",
  เดือน: "เดือน",
  กลุ่มภารกิจ: "กลุ่มภารกิจ",
  กลุ่มงาน: "กลุ่มงาน",
  หน่วยงาน: "หน่วยงาน",
  รายการ: "รายการ",
  หมวด: "หมวด",
  ประเภท: "ประเภท",
  ประเภทแผน: "ประเภทแผน",
};

const FILTER_KEYS = ALL_FILTER_FIELDS;

export default function FilterBar({
  filters,
  filterOptions,
  updateFilter,
  clearFilters,
}: FilterBarProps) {
  const hasActiveFilters = FILTER_KEYS.some(
    (k) => filters[k].length > 0,
  );

  const activeCount = FILTER_KEYS.reduce(
    (acc, k) => acc + (filters[k].length > 0 ? 1 : 0),
    0,
  );

  const handleMultiSelect = (key: FilterField, val: string) => {
    const current = filters[key];
    if (val === "__all__") {
      updateFilter(key, []);
      return;
    }
    if (current.includes(val)) {
      updateFilter(
        key,
        current.filter((v: string) => v !== val),
      );
    } else {
      updateFilter(key, [...current, val]);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">
          ตัวกรองข้อมูล
        </h3>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
            {activeCount}
          </span>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto h-7 text-xs gap-1 text-gray-500 hover:text-red-600"
          >
            <X className="w-3 h-3" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {FILTER_KEYS.map((key) => {
          const options = filterOptions[key] || [];
          const selected = filters[key] as string[];
          const label = FILTER_LABELS[key] || key;

          return (
            <div key={key} className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase font-mono">
                {label}
              </label>
              <Select
                value={selected.length === 0 ? "__all__" : selected[0]}
                onValueChange={(val) => handleMultiSelect(key, val)}
              >
                <SelectTrigger className="h-8 text-xs bg-gray-50 border-gray-200">
                  <SelectValue
                    placeholder={
                      selected.length > 0
                        ? `${selected.length} รายการ`
                        : `ทั้งหมด`
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__all__">ทั้งหมด</SelectItem>
                  {options.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        {selected.includes(opt) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {opt}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
