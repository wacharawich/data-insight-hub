import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { Filters, FilterField } from "@/hooks/use-google-sheets-data";
import { ALL_FILTER_FIELDS } from "@/hooks/use-google-sheets-data";
import { Filter, X, ChevronDown } from "lucide-react";

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
  เลขทะเบียนคุม: "Registry No.",
  เดือน: "Month",
  กลุ่มภารกิจ: "Mission Group",
  กลุ่มงาน: "Work Group",
  หน่วยงาน: "Department",
  รายการ: "Item",
  หมวด: "Category",
  ประเภท: "Type",
  ประเภทแผน: "Plan Type",
};

const FILTER_KEYS = ALL_FILTER_FIELDS;

function MultiSelectFilter({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-gray-500 uppercase font-mono">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex h-8 w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs font-mono hover:bg-gray-100 transition-colors"
          >
            <span className="truncate text-gray-700">
              {selected.length === 0
                ? "All"
                : `${selected.length} selected`}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label}...`} className="h-8 text-xs" />
            <CommandList className="max-h-48">
              <CommandEmpty className="py-3 text-xs text-gray-400">
                No results.
              </CommandEmpty>
              <CommandGroup>
                {selected.length > 0 && (
                  <CommandItem
                    onSelect={onClear}
                    className="cursor-pointer text-xs text-red-600 hover:text-red-700"
                  >
                    <X className="mr-2 h-3 w-3" />
                    Clear all
                  </CommandItem>
                )}
                {options.map((opt) => {
                  const isSelected = selected.includes(opt);
                  return (
                    <CommandItem
                      key={opt}
                      onSelect={() => onToggle(opt)}
                      className="cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mr-2 h-3.5 w-3.5 pointer-events-none"
                      />
                      <span className="truncate">{opt}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function FilterBar({
  filters,
  filterOptions,
  updateFilter,
  clearFilters,
}: FilterBarProps) {
  const hasActiveFilters = FILTER_KEYS.some(
    (k) => filters[k].length > 0,
  ) || filters.dateRange !== null;

  const activeCount =
    FILTER_KEYS.reduce((acc, k) => acc + (filters[k].length > 0 ? 1 : 0), 0) +
    (filters.dateRange !== null ? 1 : 0);

  const handleMultiSelect = useCallback(
    (key: FilterField, val: string) => {
      const current = filters[key];
      if (current.includes(val)) {
        updateFilter(
          key,
          current.filter((v: string) => v !== val),
        );
      } else {
        updateFilter(key, [...current, val]);
      }
    },
    [filters, updateFilter],
  );

  const handleClearFilter = useCallback(
    (key: FilterField) => {
      updateFilter(key, []);
    },
    [updateFilter],
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">
          Filters
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
            Clear all
          </Button>
        )}
      </div>

      {/* Multi-select filter grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
        {FILTER_KEYS.map((key) => {
          const options = filterOptions[key] || [];
          const selected = filters[key] as string[];
          const label = FILTER_LABELS[key] || key;

          return (
            <MultiSelectFilter
              key={key}
              label={label}
              options={options}
              selected={selected}
              onToggle={(val) => handleMultiSelect(key, val)}
              onClear={() => handleClearFilter(key)}
            />
          );
        })}
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <label className="text-[10px] font-medium text-gray-500 uppercase font-mono whitespace-nowrap">
          Date range
        </label>
        <Input
          type="date"
          value={filters.dateRange?.start || ""}
          onChange={(e) => {
            const start = e.target.value;
            const end = filters.dateRange?.end || "";
            if (start || end) {
              updateFilter("dateRange", { start, end });
            } else {
              updateFilter("dateRange", null);
            }
          }}
          className="h-7 text-xs bg-gray-50 border-gray-200 font-mono w-36"
        />
        <span className="text-xs text-gray-400">to</span>
        <Input
          type="date"
          value={filters.dateRange?.end || ""}
          onChange={(e) => {
            const end = e.target.value;
            const start = filters.dateRange?.start || "";
            if (start || end) {
              updateFilter("dateRange", { start, end });
            } else {
              updateFilter("dateRange", null);
            }
          }}
          className="h-7 text-xs bg-gray-50 border-gray-200 font-mono w-36"
        />
        {filters.dateRange && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-gray-500 hover:text-red-600"
            onClick={() => updateFilter("dateRange", null)}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
