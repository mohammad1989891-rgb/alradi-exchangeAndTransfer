'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Plus,
  Loader2,
  RefreshCw,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CURRENCIES, formatCurrency, getCurrencyName } from '@/lib/api';

// ============ Types ============

interface DailyBalanceItem {
  id: string;
  currency: string;
  amount: number;
  date: string;
  updatedAt: string;
}

interface BalanceChartData {
  date: string;
  [currency: string]: number | string;
}

// ============ Mock Data ============

const today = new Date().toISOString().split('T')[0];

const MOCK_BALANCES: DailyBalanceItem[] = [
  { id: '1', currency: 'USD', amount: 52450, date: today, updatedAt: new Date().toISOString() },
  { id: '2', currency: 'EUR', amount: 18320, date: today, updatedAt: new Date().toISOString() },
  { id: '3', currency: 'GBP', amount: 8750, date: today, updatedAt: new Date().toISOString() },
  { id: '4', currency: 'SAR', amount: 120000, date: today, updatedAt: new Date().toISOString() },
  { id: '5', currency: 'AED', amount: 45000, date: today, updatedAt: new Date().toISOString() },
  { id: '6', currency: 'TRY', amount: 280000, date: today, updatedAt: new Date().toISOString() },
  { id: '7', currency: 'SYP', amount: 25000000, date: today, updatedAt: new Date().toISOString() },
];

// Approximate SYP equivalent rates for the summary card
const SYP_RATES: Record<string, number> = {
  USD: 14500,
  EUR: 15700,
  GBP: 18300,
  SAR: 3860,
  AED: 3940,
  TRY: 400,
  SYP: 1,
};

const MOCK_CHART_DATA: BalanceChartData[] = (() => {
  const data: BalanceChartData[] = [];
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = dayNames[d.getDay()];
    const factor = 1 + (Math.random() * 0.3 - 0.15);
    data.push({
      date: dayName,
      USD: Math.round(52450 * factor),
      EUR: Math.round(18320 * factor),
      GBP: Math.round(8750 * factor),
    });
  }
  return data;
})();

// ============ Accent Colors per Currency ============

const CURRENCY_ACCENTS: Record<string, { bar: string; bg: string; icon: string; value: string }> = {
  USD: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', icon: 'text-emerald-600', value: 'text-emerald-700' },
  EUR: { bar: 'bg-blue-500', bg: 'bg-blue-50', icon: 'text-blue-600', value: 'text-blue-700' },
  GBP: { bar: 'bg-indigo-500', bg: 'bg-indigo-50', icon: 'text-indigo-600', value: 'text-indigo-700' },
  SAR: { bar: 'bg-amber-500', bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-700' },
  AED: { bar: 'bg-teal-500', bg: 'bg-teal-50', icon: 'text-teal-600', value: 'text-teal-700' },
  TRY: { bar: 'bg-rose-500', bg: 'bg-rose-50', icon: 'text-rose-600', value: 'text-rose-700' },
  SYP: { bar: 'bg-orange-500', bg: 'bg-orange-50', icon: 'text-orange-600', value: 'text-orange-700' },
};

const DEFAULT_ACCENT = { bar: 'bg-gray-500', bg: 'bg-gray-50', icon: 'text-gray-600', value: 'text-gray-700' };

// ============ Animation Variants ============

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

// ============ Component ============

export function DailyBalance() {
  const [balances, setBalances] = useState<DailyBalanceItem[]>(MOCK_BALANCES);
  const [chartData, setChartData] = useState<BalanceChartData[]>(MOCK_CHART_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch balances from API on mount, fall back to mock
  const fetchBalances = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/daily-balance');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBalances(data);
        }
        // else keep mock data
      }
    } catch {
      // keep mock data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Auto-dismiss submit message
  useEffect(() => {
    if (submitMessage) {
      const timer = setTimeout(() => setSubmitMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitMessage]);

  // Compute total in SYP equivalent
  const totalSYP = balances.reduce((sum, b) => {
    const rate = SYP_RATES[b.currency] || 1;
    return sum + b.amount * rate;
  }, 0);

  // Find balance change indicators (mock: just random for display)
  const getChangeIndicator = (currency: string) => {
    const val = Math.random();
    if (val > 0.5) {
      return { direction: 'up' as const, pct: (Math.random() * 8 + 1).toFixed(1) };
    }
    return { direction: 'down' as const, pct: (Math.random() * 5 + 0.5).toFixed(1) };
  };

  // Handle add/update balance
  const handleSubmit = async () => {
    if (!selectedCurrency || !amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch('/api/daily-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: selectedCurrency,
          amount: Number(amount),
          date: today,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        // Update local state
        setBalances((prev) => {
          const existing = prev.findIndex((b) => b.currency === selectedCurrency);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              amount: Number(amount),
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return [
            ...prev,
            {
              id: result?.id || `local-${Date.now()}`,
              currency: selectedCurrency,
              amount: Number(amount),
              date: today,
              updatedAt: new Date().toISOString(),
            },
          ];
        });
        setSubmitMessage({ type: 'success', text: 'تم تحديث الرصيد بنجاح' });
        setAmount('');
        setSelectedCurrency('');
      } else {
        throw new Error('API error');
      }
    } catch {
      // Fallback: update local state even if API fails
      setBalances((prev) => {
        const existing = prev.findIndex((b) => b.currency === selectedCurrency);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            ...updated[existing],
            amount: Number(amount),
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: `local-${Date.now()}`,
            currency: selectedCurrency,
            amount: Number(amount),
            date: today,
            updatedAt: new Date().toISOString(),
          },
        ];
      });
      setSubmitMessage({ type: 'success', text: 'تم تحديث الرصيد محلياً' });
      setAmount('');
      setSelectedCurrency('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get pre-filled amount for selected currency
  const handleCurrencySelect = (code: string) => {
    setSelectedCurrency(code);
    const existing = balances.find((b) => b.currency === code);
    if (existing) {
      setAmount(existing.amount.toString());
    } else {
      setAmount('');
    }
  };

  // ============ Render ============

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 shadow-md bg-white overflow-hidden">
          <div className="h-1.5 bg-gradient-to-l from-emerald-600 to-emerald-400" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2.5 text-lg text-emerald-600">
                <div className="bg-emerald-50 rounded-xl p-2">
                  <Wallet className="h-5 w-5" />
                </div>
                الأرصدة اليومية
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchBalances}
                className="text-muted-foreground hover:text-emerald-600"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Summary Card - Total in SYP */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="border-0 shadow-md bg-gradient-to-l from-emerald-600 to-emerald-700 overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200/80 text-xs font-medium mb-1">إجمالي الأرصدة (مكافئ ليرة سورية)</p>
                <p className="text-white text-2xl sm:text-3xl font-bold leading-tight">
                  {formatCurrency(totalSYP, 'SYP')}
                </p>
                <p className="text-emerald-200/60 text-[11px] mt-1.5 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  بناءً على أسعار الصرف الحالية
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3.5">
                <Coins className="h-7 w-7 text-emerald-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Balance Cards Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {balances.map((balance) => {
          const accent = CURRENCY_ACCENTS[balance.currency] || DEFAULT_ACCENT;
          const change = getChangeIndicator(balance.currency);
          const sypEquiv = balance.amount * (SYP_RATES[balance.currency] || 1);

          return (
            <motion.div key={balance.currency} variants={item}>
              <Card className="card-hover overflow-hidden border border-gray-100 shadow-sm bg-white">
                <CardContent className="p-0">
                  {/* Accent bar */}
                  <div className={`h-1 ${accent.bar}`} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground text-xs font-medium mb-1.5 truncate">
                          {getCurrencyName(balance.currency)}
                        </p>
                        <p className={`text-xl sm:text-2xl font-bold ${accent.value} leading-tight truncate`}>
                          {formatCurrency(balance.amount, balance.currency)}
                        </p>
                        <p className="text-muted-foreground/50 text-[11px] mt-1 truncate">
                          ≈ {formatCurrency(sypEquiv, 'SYP')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className={`${accent.bg} rounded-xl p-2`}>
                          <Wallet className={`h-4 w-4 ${accent.icon}`} />
                        </div>
                        {change.direction === 'up' ? (
                          <span className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-medium">
                            <ArrowUpRight className="h-3 w-3" />
                            {change.pct}%
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-rose-500 text-[10px] font-medium">
                            <ArrowDownRight className="h-3 w-3" />
                            {change.pct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-gray-50">
                      <p className="text-muted-foreground/40 text-[10px]">
                        آخر تحديث:{' '}
                        {balance.updatedAt
                          ? new Date(balance.updatedAt).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Add/Update Balance Form + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add/Update Balance Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="border-0 shadow-md bg-white overflow-hidden h-full">
            <div className="h-1 bg-gradient-to-l from-amber-500 to-amber-400" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-600">
                <div className="bg-amber-50 rounded-xl p-2">
                  <Plus className="h-5 w-5 text-amber-600" />
                </div>
                تحديث الرصيد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Currency Select */}
              <div className="space-y-2">
                <Label htmlFor="balance-currency" className="text-sm font-medium text-muted-foreground">
                  العملة
                </Label>
                <Select value={selectedCurrency} onValueChange={handleCurrencySelect}>
                  <SelectTrigger className="w-full" id="balance-currency">
                    <SelectValue placeholder="اختر العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.filter((c) =>
                      ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'TRY', 'SYP'].includes(c.code)
                    ).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.nameAr} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="balance-amount" className="text-sm font-medium text-muted-foreground">
                  المبلغ
                </Label>
                <Input
                  id="balance-amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="أدخل المبلغ"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-left"
                  dir="ltr"
                />
              </div>

              {/* SYP Equivalent Preview */}
              {selectedCurrency && amount && Number(amount) > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-gray-50 rounded-lg p-3 text-sm"
                >
                  <span className="text-muted-foreground">المكافئ بالليرة السورية: </span>
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(Number(amount) * (SYP_RATES[selectedCurrency] || 1), 'SYP')}
                  </span>
                </motion.div>
              )}

              {/* Submit Message */}
              {submitMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg p-3 text-sm font-medium ${
                    submitMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {submitMessage.text}
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!selectedCurrency || !amount || Number(amount) <= 0 || isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري التحديث...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 ml-2" />
                    تحديث الرصيد
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Balance History Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-0 shadow-md bg-white overflow-hidden h-full">
            <div className="h-1 bg-gradient-to-l from-emerald-500 to-emerald-400" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-600">
                <div className="bg-emerald-50 rounded-xl p-2">
                  <TrendingUp className="h-5 w-5" />
                </div>
                تطور الأرصدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-72 w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                    <span className="text-sm text-muted-foreground">جاري تحميل البيانات...</span>
                  </div>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradientUsd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradientEur" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradientGbp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0f0f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        dx={-4}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          direction: 'rtl',
                          textAlign: 'right',
                          padding: '10px 14px',
                          fontSize: '13px',
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            USD: 'دولار أمريكي',
                            EUR: 'يورو',
                            GBP: 'جنيه إسترليني',
                          };
                          return [value.toLocaleString('ar-SA'), labels[name] || name];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="USD"
                        stroke="#059669"
                        strokeWidth={2.5}
                        fill="url(#gradientUsd)"
                        dot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="EUR"
                        stroke="#3B82F6"
                        strokeWidth={2.5}
                        fill="url(#gradientEur)"
                        dot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="GBP"
                        stroke="#6366F1"
                        strokeWidth={2.5}
                        fill="url(#gradientGbp)"
                        dot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
