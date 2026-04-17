'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function TransactionChart() {
  const { chartData, isDataLoaded } = useAppStore();

  // Show loading state while data is being fetched
  if (!isDataLoaded) {
    return (
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            المعاملات الأسبوعية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              <span className="text-sm text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-l from-emerald-500 to-amber-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            المعاملات الأسبوعية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradientExchanges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradientRemittances" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
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
                      exchanges: 'تحويلات',
                      remittances: 'حوالات',
                    };
                    return [value, labels[name] || name];
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  formatter={(value: string) => {
                    const labels: Record<string, string> = {
                      exchanges: 'تحويلات عملات',
                      remittances: 'حوالات',
                    };
                    return labels[value] || value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="exchanges"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#gradientExchanges)"
                  dot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="remittances"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  fill="url(#gradientRemittances)"
                  dot={{ r: 4, fill: '#D97706', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#D97706', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
