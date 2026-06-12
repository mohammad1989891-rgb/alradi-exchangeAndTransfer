'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';

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
// Estimate row size based on typical data patterns
// ============================================
function estimateRowSize(tableName: string): number {
  const sizes: Record<string, number> = {
    currencies: 250,
    vaults: 200,
    accounts: 180,
    transactions: 540,
    debts: 480,
    debt_payments: 350,
    currency_exchanges: 520,
    backups: 5000, // JSON data is large
  };
  return sizes[tableName] || 500;
}

// ============================================
// Arabic table names
// ============================================
const TABLE_NAMES_AR: Record<string, string> = {
  currencies: 'العملات',
  vaults: 'الخزائن',
  accounts: 'الحسابات',
  transactions: 'الحركات',
  debts: 'الديون',
  debt_payments: 'مدفوعات الديون',
  currency_exchanges: 'عمليات الصرافة',
};

// Supabase free tier: 500MB
const STORAGE_LIMIT_MB = 500;

// ============================================
// Component
// ============================================
export function StorageDashboard() {
  const { currencies, vaults, accounts, transactions, debts, currencyExchanges } = useAppStore();
  const debtPayments: unknown[] = [];
  const { isLoading: isDataLoading } = useSupabaseData();
  const [activeChart, setActiveChart] = useState<'bar' | 'line'>('bar');

  // Compute table info from loaded data
  const tableInfos: TableInfo[] = useMemo(() => {
    const tables: Array<{ name: string; rows: unknown[] }> = [
      { name: 'currencies', rows: currencies },
      { name: 'vaults', rows: vaults },
      { name: 'accounts', rows: accounts },
      { name: 'transactions', rows: transactions },
      { name: 'debts', rows: debts },
      { name: 'debt_payments', rows: debtPayments },
      { name: 'currency_exchanges', rows: currencyExchanges },
    ];

    return tables.map(({ name, rows }) => {
      const rowCount = rows.length;
      const avgRowSize = estimateRowSize(name);
      const sizeBytes = Math.round(avgRowSize * rowCount);

      return {
        name,
        nameAr: TABLE_NAMES_AR[name] || name,
        icon: 'Database',
        rowCount,
        sizeBytes,
        sizeKB: Math.round(sizeBytes / 1024 * 100) / 100,
        sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
      };
    });
  }, [currencies, vaults, accounts, transactions, debts, debtPayments, currencyExchanges]);

  // Compute totals
  const totals = useMemo(() => {
    const totalSizeBytes = tableInfos.reduce((sum, t) => sum + t.sizeBytes, 0);
    const totalSizeKB = Math.round(totalSizeBytes / 1024 * 100) / 100;
    const totalSizeMB = Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100;
    const totalRows = tableInfos.reduce((sum, t) => sum + t.rowCount, 0);
    const usagePercent = Math.min(Math.round((totalSizeMB / STORAGE_LIMIT_MB) * 10000) / 100, 100);

    return { sizeBytes: totalSizeBytes, sizeKB: totalSizeKB, sizeMB: totalSizeMB, rowCount: totalRows, usagePercent, storageLimitMB: STORAGE_LIMIT_MB };
  }, [tableInfos]);

  // Compute chart data from transactions/debts/exchanges
  const chartData = useMemo(() => {
    const monthlyData: Array<{ month: string; transactions: number; debts: number; exchanges: number; total: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthName = monthStart.toLocaleDateString('ar-SA', { month: 'short' });

      // Count records created in this month
      const txCount = transactions.filter(t => {
        const d = new Date(t.createdAt);
        return d >= monthStart && d < monthEnd;
      }).length;

      const debtCount = debts.filter(d => {
        const dt = new Date(d.createdAt);
        return dt >= monthStart && dt < monthEnd;
      }).length;

      const exchangeCount = currencyExchanges.filter(e => {
        const dt = new Date(e.createdAt);
        return dt >= monthStart && dt < monthEnd;
      }).length;

      monthlyData.push({
        month: monthName,
        transactions: txCount,
        debts: debtCount,
        exchanges: exchangeCount,
        total: txCount + debtCount + exchangeCount,
      });
    }

    return monthlyData;
  }, [transactions, debts, currencyExchanges]);

  // Determine alert level
  const alertLevel: 'normal' | 'warning' | 'danger' = useMemo(() => {
    if (totals.usagePercent >= 90) return 'danger';
    if (totals.usagePercent >= 70) return 'warning';
    return 'normal';
  }, [totals.usagePercent]);

  // Generate suggestions
  const suggestions = useMemo(() => {
    const result: Array<{ type: 'archive' | 'delete_old_backups' | 'optimize'; message: string; messageAr: string }> = [];

    if (totals.usagePercent >= 70) {
      result.push({
        type: 'archive',
        message: 'Archive old records to free up space',
        messageAr: 'أرشفة الحركات القديمة لتفريغ المساحة',
      });
    }

    if (totals.usagePercent >= 80) {
      result.push({
        type: 'delete_old_backups',
        message: 'Delete old backups to free up space',
        messageAr: 'حذف النسخ الاحتياطية القديمة لتفريغ المساحة',
      });
    }

    const largeTable = tableInfos.find(t => t.rowCount > 1000);
    if (largeTable) {
      result.push({
        type: 'optimize',
        message: `Consider archiving old records from ${largeTable.name}`,
        messageAr: `يفضل أرشفة السجلات القديمة من ${largeTable.nameAr}`,
      });
    }

    return result;
  }, [totals.usagePercent, tableInfos]);

  // Loading state
  if (isDataLoading) {
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
          {tableInfos
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
    </div>
  );
}
