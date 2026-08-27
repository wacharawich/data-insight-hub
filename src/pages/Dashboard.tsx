import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import SummaryCards from "@/components/dashboard/SummaryCards";
import FilterBar from "@/components/dashboard/FilterBar";
import BarChartSection from "@/components/dashboard/BarChartSection";
import Top10Charts from "@/components/dashboard/Top10Charts";
import DataTable from "@/components/dashboard/DataTable";
import { useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const {
    filteredData,
    loading,
    error,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    refetch,
  } = useGoogleSheetsData();

  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await refetch();
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-sm font-mono text-gray-500">
            กำลังโหลดข้อมูล...
          </span>
        </div>
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 font-mono">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-sm text-gray-500 font-mono">{error}</p>
          <p className="text-xs text-gray-400 font-mono">
            ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/f/f9/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%A3%E0%B8%A7%E0%B8%87%E0%B8%AA%E0%B8%B2%E0%B8%98%E0%B8%B2%E0%B8%A3%E0%B8%93%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88.png?utm_source=th.wikipedia.org&utm_campaign=index&utm_content=original"
              alt="ตรา hospital"
              className="w-8 h-8 rounded"
            />
            <div>
              <h1 className="text-sm font-bold text-gray-800 leading-tight">
                ทะเบียนคุมแผนจัดซื้อจัดจ้าง โรงพยาบาลนางรอง
              </h1>
              <p className="text-[10px] text-gray-400 font-mono">
                CL69 · PROCUREMENT REGISTRY DASHBOARD
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing || loading}
              className="h-7 text-xs gap-1.5 font-mono text-gray-500 hover:text-emerald-600"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'กำลังซิงก์...' : 'ซิงก์'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filters */}
        <FilterBar
          filters={filters}
          filterOptions={filterOptions}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
        />

        {/* Summary */}
        <SummaryCards data={filteredData} />

        {/* Main Bar Chart */}
        <BarChartSection data={filteredData} />

        {/* Top 10 Charts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-emerald-500 rounded-full" />
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">
              TOP 10 วิเคราะห์
            </h2>
          </div>
          <Top10Charts data={filteredData} />
        </div>

        {/* Data Table */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-gray-400 rounded-full" />
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">
              ตารางข้อมูล
            </h2>
          </div>
          <DataTable data={filteredData} />
        </div>

        {/* Footer */}
        <        footer className="text-center py-6 text-[10px] text-gray-400 font-mono border-t border-gray-200">
          CL69 · ทะเบียนคุมแผนจัดซื้อจัดจ้าง โรงพยาบาลนางรอง
        </footer>
      </main>
    </div>
  );
}
