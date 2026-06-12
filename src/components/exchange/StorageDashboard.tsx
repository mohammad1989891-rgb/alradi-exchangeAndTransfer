'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  HardDrive,
  AlertTriangle,
  AlertOctagon,
  Archive,
  Trash2,
  Lightbulb,
  RefreshCw,
  Database,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart } from 'recharts';

// ============================================
// Types
// ============================================
interface TableInfo {
  name: string;
  nameAr: string;
  icon: string;
  rowCount: number;
  sizeBytes: number;
  sizeKB: number;
  sizeMB: number;
}

interface StorageData {
  tables: TableInfo[];
  totals: {
    sizeBytes: number;
    sizeKB: number;
    sizeMB: number;
    rowCount: number;
    usagePercent: number;
    storageLimitMB: number;
  };
  chartData: Array<{
    month: string;
    monthAr: string;
    transactions: number;
    debts: number;
    exchanges: number;
    total: number;
  }>;
  alertLevel: 'normal' | 'warning' | 'danger';
  suggestions: Array<{
    type: 'archive' | 'delete_old_backups' | 'optimize';
    message: string;
    messageAr: string;
  }>;
}

// ============================================
// Chart configs
// ============================================
const barChartConfig: ChartConfig = {
  transactions: { label: 'الحركات', color: 'hsl(var(--chart-1))' },
  debts: { label: 'الديون', color: 'hsl(var(--chart-2))' },
  exchanges: { label: 'الصرافة', color: 'hsl(var(--chart-3))' },
};

const lineChartConfig: ChartConfig = {
  total: { label: 'إجمالي النمو', color: 'hsl(var(--chart-4))' },
};

// ============================================
// Helper: Format file size
// ============================================
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================
// Component
// ============================================
export function StorageDashboard() {
  const [data, setData] = useState<StorageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'bar' | 'line'>('bar');

  // Fetch storage data
  const fetchStorageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/storage?XTransformPort=3000');
      if (!response.ok) throw new Error('Failed to fetch storage data');
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (err) {
      console.error('[StorageDashboard] Error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل بيانات التخزين');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageData();
  }, [fetchStorageData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>جاري تحليل التخزين...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertOctagon className="w-5 h-5" />
            <p className="text-sm">{error || 'لا يمكن تحميل بيانات التخزين'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStorageData} className="mt-3">
            <RefreshCw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  const { tables, totals, chartData, alertLevel, suggestions } = data;

  return (
    <div className="space-y-4">
      {/* ===== Storage Usage Overview ===== */}
      <div className="p-4 rounded-xl bg-muted/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              alertLevel === 'danger' ? 'bg-red-500/10' :
              alertLevel === 'warning' ? 'bg-amber-500/10' :
              'bg-emerald-500/10'
            }`}>
              <HardDrive className={`w-5 h-5 ${
                alertLevel === 'danger' ? 'text-red-500' :
                alertLevel === 'warning' ? 'text-amber-500' :
                'text-emerald-500'
              }`} />
            </div>
            <div>
              <p className="font-medium">استخدام التخزين</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(totals.sizeBytes)} من {totals.storageLimitMB} MB
              </p>
            </div>
          </div>
          <div className="text-left">
            <p className={`text-2xl font-bold ${
              alertLevel === 'danger' ? 'text-red-500' :
              alertLevel === 'warning' ? 'text-amber-500' :
              'text-emerald-500'
            }`}>
              {totals.usagePercent}%
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.rowCount.toLocaleString('ar-SA')} سجل
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <Progress
            value={Math.min(totals.usagePercent, 100)}
            className={`h-3 ${
              alertLevel === 'danger' ? '[&>div]:bg-red-500' :
              alertLevel === 'warning' ? '[&>div]:bg-amber-500' :
              '[&>div]:bg-emerald-500'
            }`}
          />
          {/* 70% marker */}
          <div className="absolute top-0 left-[70%] w-0.5 h-3 bg-amber-400/50 rounded" />
          {/* 90% marker */}
          <div className="absolute top-0 left-[90%] w-0.5 h-3 bg-red-400/50 rounded" />
        </div>

        {/* Size markers */}
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0 MB</span>
          <span className="text-amber-500">70%</span>
          <span className="text-red-500">90%</span>
          <span>{totals.storageLimitMB} MB</span>
        </div>
      </div>

      {/* ===== Alert Banner ===== */}
      {alertLevel === 'warning' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">تحذير: التخزين يقترب من الامتلاء</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                تم استخدام {totals.usagePercent}% من المساحة المتاحة. يُنصح بأرشفة البيانات القديمة.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {alertLevel === 'danger' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">خطر: التخزين ممتلئ تقريباً!</p>
              <p className="text-xs text-red-600 dark:text-red-500">
                تم استخدام {totals.usagePercent}% من المساحة. يجب حذف البيانات القديمة أو أرشفتها فوراً.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Per-Table Breakdown ===== */}
      <div className="p-4 rounded-xl bg-muted/50">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-muted-foreground" />
          <p className="font-medium text-sm">تفاصيل الجداول</p>
        </div>
        <div className="space-y-2">
          {tables
            .sort((a, b) => b.sizeBytes - a.sizeBytes)
            .map((table) => {
              const percent = totals.sizeBytes > 0
                ? Math.round((table.sizeBytes / totals.sizeBytes) * 100)
                : 0;

              return (
                <div key={table.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{table.nameAr}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap mr-2">
                        {table.rowCount.toLocaleString('ar-SA')} سجل
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={percent}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatSize(table.sizeBytes)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ===== Chart Section ===== */}
      <div className="p-4 rounded-xl bg-muted/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {activeChart === 'bar' ? (
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            ) : (
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            )}
            <p className="font-medium text-sm">
              {activeChart === 'bar' ? 'الحركات حسب الشهر' : 'نمو البيانات'}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={activeChart === 'bar' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setActiveChart('bar')}
            >
              أعمدة
            </Button>
            <Button
              variant={activeChart === 'line' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setActiveChart('line')}
            >
              خطي
            </Button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          {activeChart === 'bar' ? (
            <ChartContainer config={barChartConfig} className="h-full w-full">
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="transactions" fill="var(--color-transactions)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="debts" fill="var(--color-debts)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="exchanges" fill="var(--color-exchanges)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartContainer config={lineChartConfig} className="h-full w-full">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-total)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-total)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </div>

      {/* ===== Suggestions ===== */}
      {suggestions.length > 0 && (
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <p className="font-medium text-sm">اقتراحات</p>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg bg-background/50"
              >
                {suggestion.type === 'archive' ? (
                  <Archive className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                ) : suggestion.type === 'delete_old_backups' ? (
                  <Trash2 className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                )}
                <p className="text-xs text-muted-foreground">{suggestion.messageAr}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Refresh Button ===== */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStorageData}
          className="text-xs gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          تحديث بيانات التخزين
        </Button>
      </div>
    </div>
  );
}
