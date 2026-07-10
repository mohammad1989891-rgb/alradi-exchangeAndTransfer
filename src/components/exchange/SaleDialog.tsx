'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import {
  Loader2,
  TrendingUp,
  Calendar,
  Package,
  DollarSign,
  Tag,
  Boxes,
  User,
  AlertTriangle,
  Info,
  Wallet,
  Clock,
} from 'lucide-react';
import {
  getMaterials,
  getMaterialInventory,
  addSale,
  updateSale,
  type Material,
  type Sale,
  type MaterialInventory,
  type SalePaymentMethod,
} from '@/lib/supabaseDb';

export interface SaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSale?: Sale | null;
  onSuccess?: () => void;
}

interface FormState {
  date: string;
  accountId: string;
  materialId: string;
  quantity: string;
  unitId: string;
  unitPrice: string;
  paymentMethod: SalePaymentMethod;
  description: string;
}

function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toISODateInput(date: Date | string): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return getTodayISO();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return getTodayISO();
  }
}

function getDefaultFormState(): FormState {
  return {
    date: getTodayISO(),
    accountId: '',
    materialId: '',
    quantity: '',
    unitId: '',
    unitPrice: '',
    // 🔸 Default to 'cash' per spec (cash sales add USD to the vault immediately;
    // credit sales are deferred invoices that don't touch the cash box)
    paymentMethod: 'cash',
    description: '',
  };
}

export function SaleDialog({
  open,
  onOpenChange,
  editingSale,
  onSuccess,
}: SaleDialogProps) {
  const { toast } = useToast();
  const { accounts } = useAppStore();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [inventory, setInventory] = useState<MaterialInventory | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(getDefaultFormState());

  const isEditMode = !!editingSale;

  // Load materials list when dialog opens
  const loadMaterials = useCallback(async () => {
    setIsLoadingMaterials(true);
    try {
      const data = await getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل قائمة المواد',
        variant: 'destructive',
      });
      setMaterials([]);
    } finally {
      setIsLoadingMaterials(false);
    }
  }, [toast]);

  // Load inventory for a given material
  const loadInventory = useCallback(async (materialId: string) => {
    if (!materialId) {
      setInventory(null);
      return;
    }
    setIsLoadingInventory(true);
    try {
      const inv = await getMaterialInventory(materialId);
      setInventory(inv);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory(null);
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return;
    loadMaterials();
    if (editingSale) {
      setForm({
        date: toISODateInput(editingSale.date),
        accountId: editingSale.accountId,
        materialId: editingSale.materialId,
        quantity: String(editingSale.quantity ?? ''),
        unitId: editingSale.unitId,
        unitPrice: String(editingSale.unitPrice ?? ''),
        paymentMethod: editingSale.paymentMethod === 'credit' ? 'credit' : 'cash',
        description: editingSale.description ?? '',
      });
      // Preload inventory for the editing sale's material
      loadInventory(editingSale.materialId);
    } else {
      setForm(getDefaultFormState());
      setInventory(null);
    }
  }, [open, editingSale, loadMaterials, loadInventory]);

  // Find the currently selected material
  const selectedMaterial = useMemo<Material | null>(() => {
    if (!form.materialId) return null;
    return materials.find((m) => m.id === form.materialId) || null;
  }, [form.materialId, materials]);

  // Find the currently selected material-unit (for baseFactor lookup)
  const selectedMaterialUnit = useMemo(() => {
    if (!selectedMaterial || !form.unitId) return null;
    return (
      selectedMaterial.materialUnits?.find((mu) => mu.unitId === form.unitId) ||
      null
    );
  }, [selectedMaterial, form.unitId]);

  // When material changes, reset unitId to the material's default unit and re-fetch inventory
  const handleMaterialChange = (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId) || null;
    let defaultUnitId = '';
    if (mat) {
      if (mat.defaultUnitId) {
        defaultUnitId = mat.defaultUnitId;
      } else {
        const baseUnit = mat.materialUnits?.find((mu) => mu.baseFactor === 1);
        defaultUnitId = baseUnit?.unitId || mat.materialUnits?.[0]?.unitId || '';
      }
    }
    setForm((prev) => ({
      ...prev,
      materialId,
      unitId: defaultUnitId,
    }));
    loadInventory(materialId);
  };

  // Live numeric parsing
  const quantityNum = useMemo(() => {
    const n = parseFloat(form.quantity);
    return isNaN(n) ? 0 : n;
  }, [form.quantity]);

  const unitPriceNum = useMemo(() => {
    const n = parseFloat(form.unitPrice);
    return isNaN(n) ? 0 : n;
  }, [form.unitPrice]);

  // Live total price calculation
  const totalPrice = useMemo(() => {
    return quantityNum * unitPriceNum;
  }, [quantityNum, unitPriceNum]);

  // Inventory check: convert entered quantity to base using selected unit's baseFactor
  const quantityInBase = useMemo(() => {
    const factor = selectedMaterialUnit?.baseFactor ?? 0;
    return quantityNum * factor;
  }, [quantityNum, selectedMaterialUnit]);

  const exceedsInventory = useMemo(() => {
    if (!inventory || !form.materialId || quantityNum <= 0) return false;
    // Allow small floating-point tolerance
    return quantityInBase > inventory.currentInBase + 0.0001;
  }, [inventory, form.materialId, quantityNum, quantityInBase]);

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.date) return 'يرجى اختيار التاريخ';
    if (!form.accountId) return 'يرجى اختيار الحساب';
    if (!form.materialId) return 'يرجى اختيار المادة';
    if (!form.unitId) return 'يرجى اختيار الواحدة';
    if (!form.quantity || isNaN(quantityNum) || quantityNum <= 0) {
      return 'يرجى إدخال الكمية (أكبر من صفر)';
    }
    if (form.unitPrice === '' || isNaN(unitPriceNum) || unitPriceNum < 0) {
      return 'يرجى إدخال سعر إفرادي صحيح';
    }
    if (exceedsInventory) {
      return 'الكمية تتجاوز المخزون المتوفر';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      toast({
        title: 'بيانات ناقصة',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        date: form.date,
        accountId: form.accountId,
        materialId: form.materialId,
        quantity: quantityNum,
        unitId: form.unitId,
        unitPrice: unitPriceNum,
        paymentMethod: form.paymentMethod,
        description: form.description.trim() || undefined,
      };

      if (isEditMode && editingSale) {
        await updateSale(editingSale.id, payload);
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث عملية البيع بنجاح',
        });
      } else {
        await addSale(payload);
        toast({
          title: 'تم الحفظ',
          description: 'تم إضافة عملية البيع بنجاح',
        });
      }

      // Dispatch refresh events so other components can update
      window.dispatchEvent(new Event('sales-updated'));
      window.dispatchEvent(new Event('app-data-refreshed'));

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving sale:', error);
      toast({
        title: 'خطأ',
        description:
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء حفظ عملية البيع',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Only show active accounts in the dropdown (defensive; spec doesn't require filtering)
  const activeAccounts = useMemo(() => accounts, [accounts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            {isEditMode ? 'تعديل عملية بيع' : 'إضافة عملية بيع'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode
              ? 'نموذج تعديل عملية بيع'
              : 'نموذج إضافة عملية بيع جديدة'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingMaterials ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* التاريخ */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-date" className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                التاريخ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sale-date"
                type="date"
                value={form.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* اسم الحساب */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                اسم الحساب <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => handleFieldChange('accountId', v)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      لا توجد حسابات مسجلة
                    </div>
                  ) : (
                    activeAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* اسم المادة */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                اسم المادة <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.materialId}
                onValueChange={handleMaterialChange}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  {materials.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      لا توجد مواد مسجلة
                    </div>
                  ) : (
                    materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Inventory info box */}
            {form.materialId && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs',
                  isLoadingInventory
                    ? 'border-muted-foreground/20 bg-muted/30 text-muted-foreground'
                    : 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                )}
              >
                {isLoadingInventory ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري تحميل المخزون...</span>
                  </>
                ) : inventory ? (
                  <>
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      المتوفر: {formatNumber(inventory.currentInDefaultUnit)}{' '}
                      <span className="font-medium">
                        {inventory.defaultUnitName}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <Info className="w-3.5 h-3.5" />
                    <span>لا توجد بيانات مخزون</span>
                  </>
                )}
              </div>
            )}

            {/* الكمية + الواحدة */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="sale-quantity"
                  className="flex items-center gap-1.5 text-sm"
                >
                  <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
                  الكمية <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sale-quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => handleFieldChange('quantity', e.target.value)}
                  placeholder="0"
                  className={cn(
                    'rounded-xl',
                    exceedsInventory &&
                      'border-red-500 focus-visible:ring-red-500/40'
                  )}
                />
                {exceedsInventory && (
                  <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    الكمية تتجاوز المخزون المتوفر
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  الواحدة <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.unitId}
                  onValueChange={(v) => handleFieldChange('unitId', v)}
                  disabled={!selectedMaterial}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="اختر الواحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedMaterial?.materialUnits &&
                    selectedMaterial.materialUnits.length > 0 ? (
                      selectedMaterial.materialUnits.map((mu) => (
                        <SelectItem key={mu.id} value={mu.unitId}>
                          {mu.unit?.name || 'وحدة'}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        لا توجد وحدات لهذه المادة
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* السعر الإفرادي */}
            <div className="space-y-1.5">
              <Label
                htmlFor="sale-price"
                className="flex items-center gap-1.5 text-sm"
              >
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                السعر الإفرادي <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="sale-price"
                  type="number"
                  min="0"
                  step="any"
                  value={form.unitPrice}
                  onChange={(e) => handleFieldChange('unitPrice', e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  $
                </span>
              </div>
            </div>

            {/* طريقة السداد — Payment Method (segmented buttons) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                طريقة السداد <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFieldChange('paymentMethod', 'cash')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                    form.paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <Wallet className="w-4 h-4" />
                  كاش
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('paymentMethod', 'credit')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                    form.paymentMethod === 'credit'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <Clock className="w-4 h-4" />
                  آجل
                </button>
              </div>
              {/* Helper note explaining the cash-box impact */}
              <p
                className={cn(
                  'flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed',
                  form.paymentMethod === 'cash'
                    ? 'bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'bg-amber-50/70 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                )}
              >
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {form.paymentMethod === 'cash'
                  ? 'البيع النقدي: تُضاف قيمة الفاتورة بالدولار إلى صندوق الدولار مباشرةً عند الحفظ.'
                  : 'البيع الآجل: لا يؤثر على الصندوق. تُسجَّل كفاتورة بيع غير مسددة مرتبطة بالحساب وتظهر في كشف الحساب حتى يتم تحصيلها لاحقاً.'}
              </p>
            </div>

            {/* البيان */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-description" className="text-sm">
                البيان
              </Label>
              <Input
                id="sale-description"
                type="text"
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="بيان اختياري..."
                className="rounded-xl"
              />
            </div>

            {/* السعر الإجمالي — Read-only computed box */}
            <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/80 dark:bg-emerald-950/20 p-4">
              <p className="text-xs text-muted-foreground mb-1">
                السعر الإجمالي للفاتورة بالدولار
              </p>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {formatNumber(quantityNum)} × {formatNumber(unitPriceNum)} ={' '}
                </p>
                <p
                  className={cn(
                    'text-xl font-bold text-emerald-600 dark:text-emerald-400',
                    totalPrice === 0 && 'text-muted-foreground/70'
                  )}
                >
                  {formatNumber(totalPrice)} $
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="rounded-xl"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoadingMaterials || exceedsInventory}
            className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                {isEditMode ? 'حفظ التعديلات' : 'حفظ'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
