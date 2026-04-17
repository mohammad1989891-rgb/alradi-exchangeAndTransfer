'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/app-store';
import {
  formatCurrency,
  formatDateTimeAr,
  getTransactionTypeLabel,
  getStatusLabel,
  CURRENCIES,
} from '@/lib/api';
import type { TransactionStatus, TransactionType, HistoryFilter, Transaction } from '@/lib/types';
import { History, Filter, Printer, Download, Receipt } from 'lucide-react';
import { exportTransactionsToCSV } from '@/lib/export-utils';
import { ReceiptPrint } from '@/components/receipt/receipt-print';

function getStatusVariant(status: TransactionStatus) {
  switch (status) {
    case 'completed':
      return 'default' as const;
    case 'pending':
      return 'secondary' as const;
    case 'cancelled':
    case 'failed':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

const ITEMS_PER_PAGE = 10;

export function TransactionHistory() {
  const { transactions } = useAppStore();
  const [filter, setFilter] = useState<HistoryFilter>({
    type: 'all',
    status: 'all',
    currency: 'all',
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter.type !== 'all' && tx.type !== filter.type) return false;
      if (filter.status !== 'all' && tx.status !== filter.status) return false;
      if (filter.currency !== 'all' && tx.fromCurrency !== filter.currency && tx.toCurrency !== filter.currency)
        return false;
      if (dateFrom && new Date(tx.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        if (new Date(tx.createdAt) > to) return false;
      }
      return true;
    });
  }, [transactions, filter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-emerald-600" />
            سجل المعاملات
            <Badge variant="secondary" className="mr-2 bg-emerald-100 text-emerald-700">
              {filteredTransactions.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-emerald-50 border-emerald-300' : ''}
            >
              <Filter className="h-4 w-4 ml-1" />
              تصفية
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 ml-1" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportTransactionsToCSV(filteredTransactions)}>
              <Download className="h-4 w-4 ml-1" />
              تصدير
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-muted/50 rounded-lg p-4 mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">النوع</Label>
              <Select
                value={filter.type}
                onValueChange={(v) =>
                  setFilter({ ...filter, type: v as TransactionType | 'all' })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="exchange">تحويل عملات</SelectItem>
                  <SelectItem value="remittance">حوالة</SelectItem>
                  <SelectItem value="deposit">إيداع</SelectItem>
                  <SelectItem value="withdrawal">سحب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الحالة</Label>
              <Select
                value={filter.status}
                onValueChange={(v) =>
                  setFilter({ ...filter, status: v as TransactionStatus | 'all' })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="cancelled">ملغى</SelectItem>
                  <SelectItem value="failed">فاشل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">العملة</Label>
              <Select
                value={filter.currency}
                onValueChange={(v) => setFilter({ ...filter, currency: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
                dir="ltr"
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right font-semibold">الرقم</TableHead>
                <TableHead className="text-right font-semibold">النوع</TableHead>
                <TableHead className="text-right font-semibold">العميل</TableHead>
                <TableHead className="text-right font-semibold">من</TableHead>
                <TableHead className="text-right font-semibold">إلى</TableHead>
                <TableHead className="text-right font-semibold">السعر</TableHead>
                <TableHead className="text-right font-semibold">الرسوم</TableHead>
                <TableHead className="text-right font-semibold">التاريخ</TableHead>
                <TableHead className="text-right font-semibold">الحالة</TableHead>
                <TableHead className="text-right font-semibold">إيصال</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-emerald-50/50 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground" title={tx.id}>
                    {tx.id.length > 8 ? `${tx.id.slice(0, 4)}...${tx.id.slice(-4)}` : tx.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getTransactionTypeLabel(tx.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{tx.customerName || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(tx.fromAmount, tx.fromCurrency)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(tx.toAmount, tx.toCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground" dir="ltr">
                    {tx.rate.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatCurrency(tx.fee, tx.fromCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTimeAr(tx.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(tx.status)} className="text-xs">
                      {getStatusLabel(tx.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setReceiptTx(tx); setReceiptOpen(true); }}
                      className="hover:bg-emerald-100 h-8 w-8 p-0"
                      title="عرض الإيصال"
                    >
                      <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} من {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                السابق
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={
                    currentPage === page
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : ''
                  }
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Receipt Dialog */}
      <ReceiptPrint
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        transaction={receiptTx}
      />
    </Card>
  );
}
