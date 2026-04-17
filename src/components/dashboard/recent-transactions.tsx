'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/app-store';
import {
  formatCurrency,
  formatTimeAr,
  getTransactionTypeLabel,
  getStatusLabel,
} from '@/lib/api';
import type { TransactionStatus, TransactionType } from '@/lib/types';
import { Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

function getStatusStyle(status: TransactionStatus) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200/60';
    case 'cancelled':
      return 'bg-red-50 text-red-600 border-red-200/60';
    case 'failed':
      return 'bg-red-50 text-red-600 border-red-200/60';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200/60';
  }
}

function getStatusDot(status: TransactionStatus) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500';
    case 'pending':
      return 'bg-amber-500 animate-pulse-soft';
    case 'cancelled':
      return 'bg-red-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function getTypeBadgeStyle(type: TransactionType) {
  switch (type) {
    case 'exchange':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
    case 'remittance':
      return 'bg-amber-50 text-amber-700 border-amber-200/50';
    case 'deposit':
      return 'bg-teal-50 text-teal-700 border-teal-200/50';
    case 'withdrawal':
      return 'bg-orange-50 text-orange-700 border-orange-200/50';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200/50';
  }
}

export function RecentTransactions() {
  const { transactions } = useAppStore();
  const recentTransactions = transactions.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-l from-amber-500 to-emerald-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-emerald-600" />
            آخر المعاملات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">#</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">النوع</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">العميل</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">من</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">إلى</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">السعر</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">الوقت</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground py-3">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx, index) => (
                  <TableRow
                    key={tx.id}
                    className={`row-alt transition-colors border-b border-gray-50 ${index % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  >
                    <TableCell className="font-mono text-[11px] text-muted-foreground/70 py-2.5" title={tx.id}>
                      {tx.id.length > 8 ? `${tx.id.slice(0, 4)}...${tx.id.slice(-4)}` : tx.id}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant="outline"
                        className={`badge-refined border ${getTypeBadgeStyle(tx.type)}`}
                      >
                        {getTransactionTypeLabel(tx.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm py-2.5 max-w-[120px] truncate">
                      {tx.customerName || '—'}
                    </TableCell>
                    <TableCell className="text-sm py-2.5">
                      <span className="text-muted-foreground">{formatCurrency(tx.fromAmount, tx.fromCurrency)}</span>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-emerald-700 py-2.5">
                      {formatCurrency(tx.toAmount, tx.toCurrency)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/70 py-2.5 font-mono">
                      {tx.rate.toLocaleString('ar-SA')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/60 py-2.5">
                      {formatTimeAr(tx.createdAt)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className={`inline-flex items-center gap-1.5 badge-refined border ${getStatusStyle(tx.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(tx.status)}`} />
                        {getStatusLabel(tx.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
