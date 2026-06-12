'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Transaction, Debt, DebtPayment, CurrencyExchange, Account, Currency } from '@/lib/supabaseDb';
import type { ArchiveFilters, ArchiveDataResult } from '@/lib/supabaseDb';
import {
  getArchivedTransactions,
  getArchivedDebts,
  getArchivedDebtPayments,
  getArchivedCurrencyExchanges,
  exportArchivedData,
  getArchivedCounts,
  restoreArchivedRecords,
  autoArchiveOldRecords,
} from '@/lib/supabaseDb';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Archive,
  Download,
  Loader2,
  CheckSquare,
  Square,
  Filter,
  Calendar,
  Coins,
  User,
  ChevronLeft,
  ChevronRight,
  ArchiveRestore,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ArchiveTable = 'transactions' | 'debts' | 'debt_payments' | 'currency_exchanges';

interface ArchiveCounts {
  transactions: number;
  debts: number;
  debtPayments: number;
  currencyExchanges: number;
}

export function ArchiveModal() {
  const { isArchiveModalOpen, closeArchiveModal, accounts, currencies } = useAppStore();
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<ArchiveTable>('transactions');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterCurrencyId, setFilterCurrencyId] = useState('');

  // Data state
  const [archiveCounts, setArchiveCounts] = useState<ArchiveCounts>({ transactions: 0, debts: 0, debtPayments: 0, currencyExchanges: 0 });
  const [archivedTransactions, setArchivedTransactions] = useState<ArchiveDataResult<Transaction>>({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
  const [archivedDebts, setArchivedDebts] = useState<ArchiveDataResult<Debt>>({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
  const [archivedDebtPayments, setArchivedDebtsPayments] = useState<ArchiveDataResult<DebtPayment>>({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
  const [archivedCurrencyExchanges, setArchivedCurrencyExchanges] = useState<ArchiveDataResult<CurrencyExchange>>({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });

  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isAutoArchiving, setIsAutoArchiving] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Auto-archive threshold
  const [archiveMonths, setArchiveMonths] = useState('6');

  // Build filters object
  const buildFilters = useCallback((): ArchiveFilters => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    accountId: filterAccountId || undefined,
    currencyId: filterCurrencyId || undefined,
    page: 1,
    pageSize: 50,
  }), [dateFrom, dateTo, filterAccountId, filterCurrencyId]);

  // Load counts on open (with delay to let Sheet animation complete)
  useEffect(() => {
    if (isArchiveModalOpen) {
      const timer = setTimeout(() => {
        loadCounts();
        loadCurrentTabData();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // Reset state when closing
      setSelectedIds(new Set());
      setDateFrom('');
      setDateTo('');
      setFilterAccountId('');
      setFilterCurrencyId('');
    }
  }, [isArchiveModalOpen]);

  // Reload data when tab or filters change
  useEffect(() => {
    if (isArchiveModalOpen) {
      loadCurrentTabData();
    }
  }, [activeTab, dateFrom, dateTo, filterAccountId, filterCurrencyId]);

  const loadCounts = async () => {
    try {
      const counts = await getArchivedCounts();
      setArchiveCounts({
        transactions: counts.transactions,
        debts: counts.debts,
        debtPayments: counts.debtPayments,
        currencyExchanges: counts.currencyExchanges,
      });
    } catch (error) {
      console.error('Error loading archive counts:', error);
    }
  };

  const loadCurrentTabData = async () => {
    setIsLoadingData(true);
    setSelectedIds(new Set());
    try {
      const filters = buildFilters();
      switch (activeTab) {
        case 'transactions': {
          const result = await getArchivedTransactions(filters);
          setArchivedTransactions(result);
          break;
        }
        case 'debts': {
          const result = await getArchivedDebts(filters);
          setArchivedDebts(result);
          break;
        }
        case 'debt_payments': {
          const result = await getArchivedDebtPayments(filters);
          setArchivedDebtsPayments(result);
          break;
        }
        case 'currency_exchanges': {
          const result = await getArchivedCurrencyExchanges(filters);
          setArchivedCurrencyExchanges(result);
          break;
        }
      }
    } catch (error) {
      console.error('Error loading archive data:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل بيانات الأرشيف', variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load more (pagination)
  const loadPage = async (page: number) => {
    setIsLoadingData(true);
    try {
      const filters = { ...buildFilters(), page };
      switch (activeTab) {
        case 'transactions': {
          const result = await getArchivedTransactions(filters);
          setArchivedTransactions(result);
          break;
        }
        case 'debts': {
          const result = await getArchivedDebts(filters);
          setArchivedDebts(result);
          break;
        }
        case 'debt_payments': {
          const result = await getArchivedDebtPayments(filters);
          setArchivedDebtsPayments(result);
          break;
        }
        case 'currency_exchanges': {
          const result = await getArchivedCurrencyExchanges(filters);
          setArchivedCurrencyExchanges(result);
          break;
        }
      }
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Export archive as JSON
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportArchivedData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'تم التصدير', description: 'تم تصدير بيانات الأرشيف بنجاح' });
    } catch (error) {
      console.error('Error exporting archive:', error);
      toast({ title: 'خطأ', description: 'فشل تصدير الأرشيف', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  // Restore selected records
  const handleRestore = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'تنبيه', description: 'اختر السجلات المراد استرجاعها' });
      return;
    }
    setIsRestoring(true);
    try {
      await restoreArchivedRecords(activeTab, Array.from(selectedIds));
      toast({
        title: 'تم الاسترجاع',
        description: `تم استرجاع ${selectedIds.size} سجل بنجاح`,
      });
      setSelectedIds(new Set());
      await loadCounts();
      await loadCurrentTabData();
      // Trigger data refresh in the main app
      window.dispatchEvent(new CustomEvent('local-data-refreshed'));
    } catch (error) {
      console.error('Error restoring records:', error);
      toast({ title: 'خطأ', description: 'فشل استرجاع السجلات', variant: 'destructive' });
    } finally {
      setIsRestoring(false);
    }
  };

  // Auto archive old records
  const handleAutoArchive = async () => {
    setIsAutoArchiving(true);
    try {
      const months = parseInt(archiveMonths) || 6;
      const result = await autoArchiveOldRecords(months);
      const total = result.archived.transactions + result.archived.debts + result.archived.debtPayments + result.archived.currencyExchanges;
      toast({
        title: 'تم الأرشفة التلقائية',
        description: `تم أرشفة ${total} سجل أقدم من ${months} أشهر`,
      });
      await loadCounts();
      await loadCurrentTabData();
      // Trigger data refresh in the main app
      window.dispatchEvent(new CustomEvent('local-data-refreshed'));
    } catch (error) {
      console.error('Error auto-archiving:', error);
      toast({ title: 'خطأ', description: 'فشل الأرشفة التلقائية', variant: 'destructive' });
    } finally {
      setIsAutoArchiving(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all on current page
  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Get current data
  const getCurrentData = () => {
    switch (activeTab) {
      case 'transactions': return archivedTransactions;
      case 'debts': return archivedDebts;
      case 'debt_payments': return archivedDebtsPayments;
      case 'currency_exchanges': return archivedCurrencyExchanges;
    }
  };

  const currentData = getCurrentData();

  // Format date
  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(amount);
  };

  // Get account name
  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'غير معروف';
  };

  // Get currency symbol
  const getCurrencySymbol = (currencyId: string) => {
    return currencies.find(c => c.id === currencyId)?.symbol || '';
  };

  // Get currency name
  const getCurrencyName = (currencyId: string) => {
    return currencies.find(c => c.id === currencyId)?.name || '';
  };

  const totalArchived = archiveCounts.transactions + archiveCounts.debts + archiveCounts.debtPayments + archiveCounts.currencyExchanges;

  return (
    <Sheet open={isArchiveModalOpen} onOpenChange={(open) => { if (!open) closeArchiveModal(); }}>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] max-h-screen overflow-y-auto p-0" dir="rtl">
        <SheetHeader className="px-6 pt-6 pb-2 shrink-0">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Archive className="w-5 h-5 text-amber-500" />
            </div>
            <span>الأرشيف</span>
            {totalArchived > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalArchived} سجل
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">استعراض وتصدير واسترجاع البيانات المؤرشفة</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6">
          {/* Filters Section */}
          <div className="space-y-3 mb-4 shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>تصفية</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  من تاريخ
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  إلى تاريخ
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              {(activeTab === 'transactions' || activeTab === 'debts') && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    الحساب
                  </label>
                  <Select value={filterAccountId} onValueChange={setFilterAccountId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="كل الحسابات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">كل الحسابات</SelectItem>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  العملة
                </label>
                <Select value={filterCurrencyId} onValueChange={setFilterCurrencyId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="كل العملات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل العملات</SelectItem>
                    {currencies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ArchiveTable)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-4 shrink-0 mb-3">
              <TabsTrigger value="transactions" className="text-xs gap-1">
                الحركات
                {archiveCounts.transactions > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[20px]">
                    {archiveCounts.transactions}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="debts" className="text-xs gap-1">
                الديون
                {archiveCounts.debts > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[20px]">
                    {archiveCounts.debts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="debt_payments" className="text-xs gap-1">
                الدفعات
                {archiveCounts.debtPayments > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[20px]">
                    {archiveCounts.debtPayments}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="currency_exchanges" className="text-xs gap-1">
                الصرف
                {archiveCounts.currencyExchanges > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[20px]">
                    {archiveCounts.currencyExchanges}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                  >
                    {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                    استرجاع ({selectedIds.size})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSelectAll(currentData.data.map(d => d.id))}
                  className="gap-1"
                >
                  {currentData.data.length > 0 && currentData.data.every(d => selectedIds.has(d.id)) ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  تحديد الكل
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting || totalArchived === 0}
                  className="gap-1"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  تحميل الأرشيف
                </Button>
              </div>
            </div>

            {/* Data List */}
            <div className="flex-1 overflow-hidden">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : currentData.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Archive className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد بيانات مؤرشفة</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">يمكنك أرشفة البيانات القديمة تلقائياً</p>
                </div>
              ) : (
                <ScrollArea className="h-full max-h-[300px]">
                  <div className="space-y-2">
                    {/* Transactions */}
                    {activeTab === 'transactions' && archivedTransactions.data.map((tx) => (
                      <div
                        key={tx.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedIds.has(tx.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => toggleSelect(tx.id)}
                      >
                        <Checkbox checked={selectedIds.has(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={tx.type === 'INCOME' ? 'default' : 'secondary'} className="text-[10px]">
                              {tx.type === 'INCOME' ? 'وارد' : 'صادر'}
                            </Badge>
                            <span className="text-sm font-medium">{formatAmount(tx.amount)} {getCurrencySymbol(tx.currencyId)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{getAccountName(tx.accountId)}</span>
                            <span>•</span>
                            <span>{formatDate(tx.date)}</span>
                            {tx.description && <><span>•</span><span className="truncate max-w-[120px]">{tx.description}</span></>}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Debts */}
                    {activeTab === 'debts' && archivedDebts.data.map((debt) => (
                      <div
                        key={debt.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedIds.has(debt.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => toggleSelect(debt.id)}
                      >
                        <Checkbox checked={selectedIds.has(debt.id)} onCheckedChange={() => toggleSelect(debt.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={debt.debtType === 'RECEIVABLE' ? 'default' : 'secondary'} className="text-[10px]">
                              {debt.debtType === 'RECEIVABLE' ? 'لنا' : 'علينا'}
                            </Badge>
                            <span className="text-sm font-medium">{formatAmount(debt.amount)} {getCurrencySymbol(debt.currencyId)}</span>
                            {debt.isPaid && <Badge variant="outline" className="text-[10px] text-emerald-600">مدفوع</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{getAccountName(debt.accountId)}</span>
                            <span>•</span>
                            <span>{formatDate(debt.date)}</span>
                            {debt.description && <><span>•</span><span className="truncate max-w-[120px]">{debt.description}</span></>}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Debt Payments */}
                    {activeTab === 'debt_payments' && archivedDebtsPayments.data.map((payment) => (
                      <div
                        key={payment.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedIds.has(payment.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => toggleSelect(payment.id)}
                      >
                        <Checkbox checked={selectedIds.has(payment.id)} onCheckedChange={() => toggleSelect(payment.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">دفعة</Badge>
                            <span className="text-sm font-medium">{formatAmount(payment.amount)} {getCurrencySymbol(payment.currencyId)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatDate(payment.date)}</span>
                            {payment.description && <><span>•</span><span className="truncate max-w-[120px]">{payment.description}</span></>}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Currency Exchanges */}
                    {activeTab === 'currency_exchanges' && archivedCurrencyExchanges.data.map((exchange) => (
                      <div
                        key={exchange.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedIds.has(exchange.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => toggleSelect(exchange.id)}
                      >
                        <Checkbox checked={selectedIds.has(exchange.id)} onCheckedChange={() => toggleSelect(exchange.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">صرف</Badge>
                            <span className="text-sm">
                              <span className="text-red-500">↓{formatAmount(exchange.outgoingAmount)} {getCurrencySymbol(exchange.outgoingCurrencyId)}</span>
                              <span className="mx-1">←</span>
                              <span className="text-emerald-500">↑{formatAmount(exchange.incomingAmount)} {getCurrencySymbol(exchange.incomingCurrencyId)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatDate(exchange.date)}</span>
                            {exchange.profit !== 0 && (
                              <Badge variant={exchange.profit > 0 ? 'default' : 'secondary'} className="text-[10px]">
                                ربح: ${formatAmount(exchange.profit)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Pagination */}
            {currentData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentData.page <= 1 || isLoadingData}
                  onClick={() => loadPage(currentData.page - 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentData.page} / {currentData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentData.page >= currentData.totalPages || isLoadingData}
                  onClick={() => loadPage(currentData.page + 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground mr-2">
                  ({currentData.total} سجل)
                </span>
              </div>
            )}
          </Tabs>

          {/* Bottom Actions: Auto Archive */}
          <div className="border-t pt-4 mt-4 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">أرشفة تلقائية أقدم من</label>
                <Select value={archiveMonths} onValueChange={setArchiveMonths}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 أشهر</SelectItem>
                    <SelectItem value="6">6 أشهر</SelectItem>
                    <SelectItem value="12">سنة</SelectItem>
                    <SelectItem value="24">سنتين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoArchive}
                disabled={isAutoArchiving}
                className="gap-1"
              >
                {isAutoArchiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                أرشفة تلقائية
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
