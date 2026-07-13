'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  ShoppingCart,
  X,
  Edit,
  Trash2,
  Calendar,
  Package,
  DollarSign,
  Boxes,
  Loader2,
  Boxes as InventoryIcon,
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
import { cn } from '@/lib/utils';
import { formatNumber, formatDate, computeConversionUnitStock } from '@/lib/format';
import {
  getPurchases,
  deletePurchase,
  getMaterials,
  getAllMaterialInventories,
  type Purchase,
  type Material,
  type MaterialInventory,
} from '@/lib/supabaseDb';
import { PurchaseDialog } from './PurchaseDialog';

interface PurchasesPageProps {
  /** Optional external trigger to open the add dialog (e.g., from a floating button) */
  externalAddTrigger?: number;
}

export function PurchasesPage({ externalAddTrigger }: PurchasesPageProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventories, setInventories] = useState<MaterialInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterMaterialId, setFilterMaterialId] = useState<string>('all');

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deletePurchaseState, setDeletePurchase] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const hasDateFilter = fromDate || toDate;

  // ---- Data loading ----
  const loadPurchases = useCallback(async () => {
    try {
      const data = await getPurchases();
      setPurchases(data);
    } catch (error) {
      console.error('Error loading purchases:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل المشتريات',
        variant: 'destructive',
      });
      setPurchases([]);
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
    loadPurchases();
    loadMaterials();
    loadInventories();
  }, [loadPurchases, loadMaterials, loadInventories]);

  // Listen for refresh events
  useEffect(() => {
    const handlePurchasesUpdated = () => {
      loadPurchases();
      loadInventories();
    };
    const handleAppRefreshed = () => {
      loadPurchases();
      loadMaterials();
      loadInventories();
    };
    window.addEventListener('purchases-updated', handlePurchasesUpdated);
    window.addEventListener('app-data-refreshed', handleAppRefreshed);
    return () => {
      window.removeEventListener('purchases-updated', handlePurchasesUpdated);
      window.removeEventListener('app-data-refreshed', handleAppRefreshed);
    };
  }, [loadPurchases, loadMaterials, loadInventories]);

  // Open add dialog when external trigger fires
  useEffect(() => {
    if (externalAddTrigger && externalAddTrigger > 0) {
      setEditingPurchase(null);
      setIsAddDialogOpen(true);
    }
  }, [externalAddTrigger]);

  // ---- Filtering ----
  const filteredPurchases = useMemo(() => {
    let result = purchases.filter((p) => {
      const matchesSearch =
        (p.materialName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMaterial =
        filterMaterialId === 'all' || p.materialId === filterMaterialId;

      let matchesDate = true;
      if (fromDate || toDate) {
        const pDate = new Date(p.date);
        pDate.setHours(0, 0, 0, 0);
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && pDate >= from;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && pDate <= to;
        }
      }

      return matchesSearch && matchesMaterial && matchesDate;
    });

    result.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [purchases, searchQuery, filterMaterialId, fromDate, toDate]);

  const monthlyGroups = useMemo(() => {
    return groupByMonth(filteredPurchases) as SimpleMonthGroup<Purchase>[];
  }, [filteredPurchases]);

  // ---- Handlers ----
  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  const handleOpenAdd = () => {
    setEditingPurchase(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(null);
    setEditingPurchase(purchase);
    setIsAddDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadPurchases();
    loadInventories();
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingPurchase(null);
    }
  };

  const handleDelete = async () => {
    if (!deletePurchaseState) return;
    setIsDeleting(true);
    try {
      await deletePurchase(deletePurchaseState.id);
      setDeletePurchase(null);
      setSelectedPurchase(null);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف عملية الشراء بنجاح',
      });
      // Trigger refresh events (matches dialog behavior)
      window.dispatchEvent(new Event('purchases-updated'));
      window.dispatchEvent(new Event('app-data-refreshed'));
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast({
        title: 'خطأ',
        description:
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء حذف عملية الشراء',
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shrink-0">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">المشتريات</h1>
              <p className="text-sm text-muted-foreground">
                {purchases.length} عملية شراء
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
                  <p className={cn(
                    'text-sm font-bold',
                    isZero
                      ? 'text-red-600 dark:text-red-400'
                      : isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                  )}>
                    {formatNumber(inv.currentInDefaultUnit)}{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {inv.defaultUnitName}
                    </span>
                  </p>
                  {conversionStock && (
                    <p className={cn(
                      'text-xs font-medium mt-0.5',
                      isZero
                        ? 'text-red-500/80 dark:text-red-300/70'
                        : isPositive
                          ? 'text-emerald-500/80 dark:text-emerald-300/70'
                          : 'text-red-500/80 dark:text-red-300/70'
                    )}>
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
            placeholder="بحث حسب المادة أو البيان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Material filter */}
        <div className="flex gap-3">
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
            <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
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
      </div>

      {/* Monthly grouped purchases */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p className="text-sm">جاري تحميل المشتريات...</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-muted/30">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            {searchQuery ||
            filterMaterialId !== 'all' ||
            hasDateFilter
              ? 'لا توجد نتائج'
              : 'لا توجد مشتريات'}
          </p>
          {!searchQuery &&
            filterMaterialId === 'all' &&
            !hasDateFilter &&
            isAdmin && (
              <Button onClick={handleOpenAdd}>إضافة عملية شراء جديدة</Button>
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
                renderItem={(purchase, index) => (
                  <PurchaseCard
                    key={purchase.id}
                    purchase={purchase}
                    index={index}
                    onClick={() => setSelectedPurchase(purchase)}
                  />
                )}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <PurchaseDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogOpenChange}
        editingPurchase={editingPurchase}
        onSuccess={handleDialogSuccess}
      />

      {/* Purchase Detail Modal */}
      <Dialog
        open={!!selectedPurchase}
        onOpenChange={() => setSelectedPurchase(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل عملية الشراء</DialogTitle>
          </DialogHeader>

          {selectedPurchase && (
            <PurchaseDetailContent
              purchase={selectedPurchase}
              isAdmin={isAdmin}
              onEdit={() => handleEdit(selectedPurchase)}
              onDelete={() => setDeletePurchase(selectedPurchase)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePurchaseState}
        onOpenChange={() => setDeletePurchase(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عملية الشراء</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه العملية؟
              <br />
              المادة: {deletePurchaseState?.materialName}
              <br />
              الإجمالي: {formatNumber(deletePurchaseState?.totalPriceUsd || 0)} $
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
// PurchaseCard — inline sub-component
// ============================================

interface PurchaseCardProps {
  purchase: Purchase;
  index: number;
  onClick?: () => void;
}

function PurchaseCard({ purchase, index, onClick }: PurchaseCardProps) {
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
        'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/30'
      )}
    >
      {/* Side indicator */}
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-rose-500" />

      <div className="p-4 pr-5 flex items-center gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-rose-100 dark:bg-rose-900/50">
          <ShoppingCart className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">
              {purchase.materialName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
              شراء
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(purchase.date)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Boxes className="w-3 h-3" />
              {formatNumber(purchase.quantity)} {purchase.unitName}
            </span>
            {purchase.description && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">{purchase.description}</span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-left flex-shrink-0">
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {formatNumber(purchase.totalPriceUsd)}
          </p>
          <p className="text-[10px] text-muted-foreground">$</p>
        </div>
      </div>

      {/* Subtle footer with unit price */}
      <div className="px-4 pb-2 pr-5 -mt-1">
        <p className="text-[10px] text-muted-foreground">
          السعر الإفرادي: {formatNumber(purchase.unitPriceUsd)} $
        </p>
      </div>
    </motion.div>
  );
}

// ============================================
// PurchaseDetailContent — inline sub-component
// ============================================

interface PurchaseDetailContentProps {
  purchase: Purchase;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function PurchaseDetailContent({
  purchase,
  isAdmin,
  onEdit,
  onDelete,
}: PurchaseDetailContentProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl p-4 bg-rose-50 dark:bg-rose-950/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-rose-100 dark:bg-rose-900/50">
            <ShoppingCart className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">
              {formatNumber(purchase.totalPriceUsd)}{' '}
              <span className="text-base font-normal text-muted-foreground">$</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                عملية شراء
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailItem label="المادة" value={purchase.materialName} />
        <DetailItem label="التاريخ" value={formatDate(purchase.date)} />
        <DetailItem
          label="الكمية"
          value={`${formatNumber(purchase.quantity)} ${purchase.unitName}`}
        />
        <DetailItem
          label="السعر الإفرادي"
          value={`${formatNumber(purchase.unitPriceUsd)} $`}
        />
      </div>

      {/* Description */}
      {purchase.description && (
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">البيان</p>
          <p className="text-sm">{purchase.description}</p>
        </div>
      )}

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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3 bg-muted/50">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
