'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  TrendingUp,
  X,
  Edit,
  Trash2,
  Calendar,
  Package,
  Boxes,
  Loader2,
  User,
  BookOpen,
  Boxes as InventoryIcon,
  Wallet,
  Clock,
} from 'lucide-react';
import { MonthCard } from './MonthCard';
import { groupByMonth } from '@/lib/monthlyGrouping';
import type { SimpleMonthGroup } from '@/lib/monthlyGrouping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate, computeConversionUnitStock } from '@/lib/format';
import {
  getSales,
  deleteSale,
  getMaterials,
  getAllMaterialInventories,
  type Sale,
  type Material,
  type MaterialInventory,
  type Account,
} from '@/lib/supabaseDb';
import { SaleDialog } from './SaleDialog';

interface SalesPageProps {
  /** Optional external trigger to open the add dialog (e.g., from a floating button) */
  externalAddTrigger?: number;
}

export function SalesPage({ externalAddTrigger }: SalesPageProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { openAccountStatement } = useAppStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventories, setInventories] = useState<MaterialInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterMaterialId, setFilterMaterialId] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  // 🔸 Payment-method filter: 'all' | 'cash' | 'credit'
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [deleteSaleState, setDeleteSale] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const hasDateFilter = fromDate || toDate;

  // Pull accounts from the global app store
  const { accounts } = useAppStore();

  // ---- Data loading ----
  const loadSales = useCallback(async () => {
    try {
      const data = await getSales();
      setSales(data);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل المبيعات',
        variant: 'destructive',
      });
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadMaterials = useCallback(async () => {
    try {
      const data = await getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
      setMaterials([]);
    }
  }, []);

  const loadInventories = useCallback(async () => {
    setIsLoadingInventory(true);
    try {
      const data = await getAllMaterialInventories();
      setInventories(data);
    } catch (error) {
      console.error('Error loading inventories:', error);
      setInventories([]);
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadSales();
    loadMaterials();
    loadInventories();
  }, [loadSales, loadMaterials, loadInventories]);

  // Listen for refresh events
  useEffect(() => {
    const handleSalesUpdated = () => {
      loadSales();
      loadInventories();
    };
    const handleAppRefreshed = () => {
      loadSales();
      loadMaterials();
      loadInventories();
    };
    window.addEventListener('sales-updated', handleSalesUpdated);
    window.addEventListener('app-data-refreshed', handleAppRefreshed);
    return () => {
      window.removeEventListener('sales-updated', handleSalesUpdated);
      window.removeEventListener('app-data-refreshed', handleAppRefreshed);
    };
  }, [loadSales, loadMaterials, loadInventories]);

  // Open add dialog when external trigger fires
  useEffect(() => {
    if (externalAddTrigger && externalAddTrigger > 0) {
      setEditingSale(null);
      setIsAddDialogOpen(true);
    }
  }, [externalAddTrigger]);

  // ---- Filtering ----
  const filteredSales = useMemo(() => {
    let result = sales.filter((s) => {
      const matchesSearch =
        (s.accountName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.materialName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMaterial =
        filterMaterialId === 'all' || s.materialId === filterMaterialId;
      const matchesAccount =
        filterAccountId === 'all' || s.accountId === filterAccountId;
      // 🔸 Payment-method filter
      const matchesPaymentMethod =
        filterPaymentMethod === 'all' || s.paymentMethod === filterPaymentMethod;

      let matchesDate = true;
      if (fromDate || toDate) {
        const sDate = new Date(s.date);
        sDate.setHours(0, 0, 0, 0);
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && sDate >= from;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && sDate <= to;
        }
      }

      return matchesSearch && matchesMaterial && matchesAccount && matchesPaymentMethod && matchesDate;
    });

    result.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [sales, searchQuery, filterMaterialId, filterAccountId, filterPaymentMethod, fromDate, toDate]);

  // 🔸 Totals per payment method (computed from the filtered set)
  const totalsByPaymentMethod = useMemo(() => {
    let cashTotal = 0;
    let creditTotal = 0;
    let cashCount = 0;
    let creditCount = 0;
    for (const s of filteredSales) {
      if (s.paymentMethod === 'credit') {
        creditTotal += s.totalPrice;
        creditCount += 1;
      } else {
        cashTotal += s.totalPrice;
        cashCount += 1;
      }
    }
    return { cashTotal, creditTotal, cashCount, creditCount };
  }, [filteredSales]);

  const monthlyGroups = useMemo(() => {
    return groupByMonth(filteredSales) as SimpleMonthGroup<Sale>[];
  }, [filteredSales]);

  // ---- Handlers ----
  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  const handleOpenAdd = () => {
    setEditingSale(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (sale: Sale) => {
    setSelectedSale(null);
    setEditingSale(sale);
    setIsAddDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadSales();
    loadInventories();
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingSale(null);
    }
  };

  const handleViewStatement = (sale: Sale) => {
    openAccountStatement({
      id: sale.accountId,
      name: sale.accountName,
    } as Account);
  };

  const handleDelete = async () => {
    if (!deleteSaleState) return;
    setIsDeleting(true);
    try {
      await deleteSale(deleteSaleState.id);
      setDeleteSale(null);
      setSelectedSale(null);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف عملية البيع بنجاح',
      });
      // Trigger refresh events (matches dialog behavior)
      window.dispatchEvent(new Event('sales-updated'));
      window.dispatchEvent(new Event('app-data-refreshed'));
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: 'خطأ',
        description:
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء حذف عملية البيع',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Render ----
  return (
    <div className="space-y-6 pb-4">
      {/* Header — Sticky */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/30 overflow-visible">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">المبيعات</h1>
              <p className="text-sm text-muted-foreground">
                {sales.length} عملية بيع
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={handleOpenAdd} className="gap-2 rounded-full shrink-0">
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          )}
        </motion.div>
      </div>

      {/* Inventory Summary Card */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <InventoryIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">المخزون الحالي</h2>
        </div>
        {isLoadingInventory ? (
          <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري تحميل المخزون...
          </div>
        ) : inventories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">لا توجد مواد مسجلة</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {inventories.map((inv) => {
              const isPositive = inv.currentInDefaultUnit > 0;
              const isZero = inv.currentInDefaultUnit === 0;
              // 🔸 Compute the stock in the material's conversion unit (e.g. برميل)
              //    purely from the already-loaded inventory + material-unit data.
              //    Returns null when no conversion unit exists → second line hidden.
              const conversionStock = computeConversionUnitStock(
                inv.currentInBase,
                inv.material.materialUnits,
                inv.material.defaultUnitId,
              );
              return (
                <div
                  key={inv.material.id}
                  className={cn(
                    'flex-shrink-0 min-w-[140px] rounded-xl border p-3 transition-colors',
                    isZero
                      ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/40'
                      : isPositive
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40'
                        : 'bg-red-50/70 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/40'
                  )}
                >
                  <p className="text-xs font-medium text-foreground truncate mb-1">
                    {inv.material.name}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-bold',
                      isZero
                        ? 'text-red-600 dark:text-red-400'
                        : isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatNumber(inv.currentInDefaultUnit)}{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {inv.defaultUnitName}
                    </span>
                  </p>
                  {conversionStock && (
                    <p
                      className={cn(
                        'text-xs font-medium mt-0.5',
                        isZero
                          ? 'text-red-500/80 dark:text-red-300/70'
                          : isPositive
                            ? 'text-emerald-500/80 dark:text-emerald-300/70'
                            : 'text-red-500/80 dark:text-red-300/70'
                      )}
                    >
                      {conversionStock.value}{' '}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {conversionStock.unitName}
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث حسب الحساب أو المادة أو البيان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Account + Material filters */}
        <div className="flex gap-3">
          <Select
            value={filterAccountId}
            onValueChange={(value) => setFilterAccountId(value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="كل الحسابات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحسابات</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterMaterialId}
            onValueChange={(value) => setFilterMaterialId(value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="كل المواد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المواد</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range filter */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              من تاريخ
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              إلى تاريخ
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          {hasDateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 🔸 Payment-method filter (all / cash / credit) */}
        <Select
          value={filterPaymentMethod}
          onValueChange={(value) => setFilterPaymentMethod(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="كل طرق السداد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل طرق السداد</SelectItem>
            <SelectItem value="cash">كاش فقط</SelectItem>
            <SelectItem value="credit">آجل فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 🔸 Payment-method totals summary */}
      {filteredSales.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">مبيعات نقدية</span>
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(totalsByPaymentMethod.cashTotal)}{' '}
              <span className="text-[10px] text-muted-foreground font-normal">$</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totalsByPaymentMethod.cashCount} عملية
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">مبيعات آجلة</span>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(totalsByPaymentMethod.creditTotal)}{' '}
              <span className="text-[10px] text-muted-foreground font-normal">$</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totalsByPaymentMethod.creditCount} عملية
            </p>
          </div>
        </div>
      )}

      {/* Monthly grouped sales */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p className="text-sm">جاري تحميل المبيعات...</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-muted/30">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            {searchQuery ||
            filterMaterialId !== 'all' ||
            filterAccountId !== 'all' ||
            filterPaymentMethod !== 'all' ||
            hasDateFilter
              ? 'لا توجد نتائج'
              : 'لا توجد مبيعات'}
          </p>
          {!searchQuery &&
            filterMaterialId === 'all' &&
            filterAccountId === 'all' &&
            filterPaymentMethod === 'all' &&
            !hasDateFilter &&
            isAdmin && (
              <Button onClick={handleOpenAdd}>إضافة عملية بيع جديدة</Button>
            )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {monthlyGroups.map((group) => (
              <MonthCard
                key={group.key}
                group={group}
                defaultExpanded={monthlyGroups.length === 1}
                renderItem={(sale, index) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    index={index}
                    onClick={() => setSelectedSale(sale)}
                    onViewStatement={() => handleViewStatement(sale)}
                  />
                )}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <SaleDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogOpenChange}
        editingSale={editingSale}
        onSuccess={handleDialogSuccess}
      />

      {/* Sale Detail Modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل عملية البيع</DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <SaleDetailContent
              sale={selectedSale}
              isAdmin={isAdmin}
              onEdit={() => handleEdit(selectedSale)}
              onDelete={() => setDeleteSale(selectedSale)}
              onViewStatement={() => handleViewStatement(selectedSale)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteSaleState}
        onOpenChange={() => setDeleteSale(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عملية البيع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه العملية؟
              <br />
              الحساب: {deleteSaleState?.accountName}
              <br />
              المادة: {deleteSaleState?.materialName}
              <br />
              الإجمالي: {formatNumber(deleteSaleState?.totalPrice || 0)} $
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'جاري الحفظ...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================
// SaleCard — inline sub-component
// ============================================

interface SaleCardProps {
  sale: Sale;
  index: number;
  onClick?: () => void;
  onViewStatement?: () => void;
}

function SaleCard({ sale, index, onClick, onViewStatement }: SaleCardProps) {
  const handleViewStatement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewStatement?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-200',
        'hover:shadow-md active:scale-[0.98]',
        'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30'
      )}
    >
      {/* Side indicator */}
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500" />

      <div className="p-4 pr-5 flex items-center gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/50">
          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Account name — prominent */}
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium text-foreground truncate">
              {sale.accountName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex-shrink-0">
              بيع
            </span>
            {/* 🔸 Payment-method badge: emerald for cash, amber for credit */}
            {sale.paymentMethod === 'credit' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 flex-shrink-0 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                آجل
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex-shrink-0 flex items-center gap-1">
                <Wallet className="w-2.5 h-2.5" />
                كاش
              </span>
            )}
          </div>
          {/* Material + date + quantity */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {sale.materialName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(sale.date)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Boxes className="w-3 h-3" />
              {formatNumber(sale.quantity)} {sale.unitName}
            </span>
            {sale.description && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">
                  {sale.description}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-left flex-shrink-0">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(sale.totalPrice)}
          </p>
          <p className="text-[10px] text-muted-foreground">$</p>
        </div>
      </div>

      {/* Footer: view account statement link */}
      <div className="px-4 pb-2 pr-5 -mt-1 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          السعر الإفرادي: {formatNumber(sale.unitPrice)} $
        </p>
        {onViewStatement && (
          <button
            type="button"
            onClick={handleViewStatement}
            className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            عرض كشف الحساب
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// SaleDetailContent — inline sub-component
// ============================================

interface SaleDetailContentProps {
  sale: Sale;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewStatement: () => void;
}

function SaleDetailContent({
  sale,
  isAdmin,
  onEdit,
  onDelete,
  onViewStatement,
}: SaleDetailContentProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">
              {formatNumber(sale.totalPrice)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                $
              </span>
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                عملية بيع
              </span>
              {/* 🔸 Payment-method badge in detail header */}
              {sale.paymentMethod === 'credit' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  آجل — فاتورة غير مسددة
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center gap-1">
                  <Wallet className="w-2.5 h-2.5" />
                  كاش — مسددة
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailItem
          label="اسم الحساب"
          value={sale.accountName}
          icon={<User className="w-3 h-3" />}
        />
        <DetailItem label="التاريخ" value={formatDate(sale.date)} />
        <DetailItem label="المادة" value={sale.materialName} />
        <DetailItem
          label="الكمية"
          value={`${formatNumber(sale.quantity)} ${sale.unitName}`}
        />
        <DetailItem
          label="السعر الإفرادي"
          value={`${formatNumber(sale.unitPrice)} $`}
        />
        <DetailItem
          label="الإجمالي"
          value={`${formatNumber(sale.totalPrice)} $`}
        />
        {/* 🔸 Payment-method row */}
        <DetailItem
          label="طريقة السداد"
          value={sale.paymentMethod === 'credit' ? 'آجل' : 'كاش'}
          icon={
            sale.paymentMethod === 'credit' ? (
              <Clock className="w-3 h-3" />
            ) : (
              <Wallet className="w-3 h-3" />
            )
          }
        />
      </div>

      {/* Description */}
      {sale.description && (
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">البيان</p>
          <p className="text-sm">{sale.description}</p>
        </div>
      )}

      {/* View account statement */}
      <Button
        variant="outline"
        onClick={onViewStatement}
        className="gap-2 w-full"
      >
        <BookOpen className="w-4 h-4" />
        عرض كشف الحساب
      </Button>

      {/* Action Buttons (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={onEdit} className="gap-2">
            <Edit className="w-4 h-4" />
            تعديل
          </Button>
          <Button variant="destructive" onClick={onDelete} className="gap-2">
            <Trash2 className="w-4 h-4" />
            حذف
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg p-3 bg-muted/50">
      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
