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
import { cn } from '@/lib/utils';
import { formatNumber, computeConversionUnitStock } from '@/lib/format';
import { Loader2, ShoppingCart, Calendar, Package, DollarSign, Tag, Boxes, Info } from 'lucide-react';
import {
  getMaterials,
  getMaterialInventory,
  addPurchase,
  updatePurchase,
  type Material,
  type Purchase,
  type MaterialInventory,
} from '@/lib/supabaseDb';

export interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPurchase?: Purchase | null;
  onSuccess?: () => void;
}

interface FormState {
  date: string;
  materialId: string;
  quantity: string;
  unitId: string;
  unitPriceUsd: string;
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
    materialId: '',
    quantity: '',
    unitId: '',
    unitPriceUsd: '',
    description: '',
  };
}

export function PurchaseDialog({
  open,
  onOpenChange,
  editingPurchase,
  onSuccess,
}: PurchaseDialogProps) {
  const { toast } = useToast();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(getDefaultFormState());
  // 🔸 Current inventory for the selected material — purely informational so
  //    the user knows how much stock is on hand before adding a purchase.
  //    Loaded via the existing getMaterialInventory() helper (same one used
  //    by SaleDialog). No accounting logic depends on this; it's a display
  //    value only.
  const [inventory, setInventory] = useState<MaterialInventory | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  const isEditMode = !!editingPurchase;

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

  // 🔸 Load inventory for a given material (reused on material change + on
  //    dialog open when editing an existing purchase).
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
    if (editingPurchase) {
      setForm({
        date: toISODateInput(editingPurchase.date),
        materialId: editingPurchase.materialId,
        quantity: String(editingPurchase.quantity ?? ''),
        unitId: editingPurchase.unitId,
        unitPriceUsd: String(editingPurchase.unitPriceUsd ?? ''),
        description: editingPurchase.description ?? '',
      });
      // Preload inventory for the editing purchase's material
      loadInventory(editingPurchase.materialId);
    } else {
      setForm(getDefaultFormState());
      setInventory(null);
    }
  }, [open, editingPurchase, loadMaterials, loadInventory]);

  // Find the currently selected material
  const selectedMaterial = useMemo<Material | null>(() => {
    if (!form.materialId) return null;
    return materials.find((m) => m.id === form.materialId) || null;
  }, [form.materialId, materials]);

  // When material changes, reset unitId to the material's default unit and
  // re-fetch the inventory for the newly selected material.
  const handleMaterialChange = (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId) || null;
    let defaultUnitId = '';
    if (mat) {
      // Try defaultUnitId first, otherwise fall back to a unit with baseFactor === 1, else first unit
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

  // 🔸 Stock in the material's conversion unit (e.g. برميل) — purely
  //    informational, derived from the already-loaded inventory + the
  //    material's materialUnits list. No extra queries. Returns null when
  //    no conversion unit exists → second field hidden.
  const conversionStock = useMemo(() => {
    if (!inventory) return null;
    return computeConversionUnitStock(
      inventory.currentInBase,
      inventory.material.materialUnits,
      inventory.material.defaultUnitId,
    );
  }, [inventory]);

  // Live total price calculation
  const quantityNum = useMemo(() => {
    const n = parseFloat(form.quantity);
    return isNaN(n) ? 0 : n;
  }, [form.quantity]);

  const unitPriceNum = useMemo(() => {
    const n = parseFloat(form.unitPriceUsd);
    return isNaN(n) ? 0 : n;
  }, [form.unitPriceUsd]);

  const totalPrice = useMemo(() => {
    return quantityNum * unitPriceNum;
  }, [quantityNum, unitPriceNum]);

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.date) return 'يرجى اختيار التاريخ';
    if (!form.materialId) return 'يرجى اختيار المادة';
    if (!form.unitId) return 'يرجى اختيار الواحدة';
    if (!form.quantity || isNaN(quantityNum) || quantityNum <= 0) {
      return 'يرجى إدخال الكمية (أكبر من صفر)';
    }
    if (form.unitPriceUsd === '' || isNaN(unitPriceNum) || unitPriceNum < 0) {
      return 'يرجى إدخال سعر إفرادي صحيح';
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
        materialId: form.materialId,
        quantity: quantityNum,
        unitId: form.unitId,
        unitPriceUsd: unitPriceNum,
        description: form.description.trim() || undefined,
      };

      if (isEditMode && editingPurchase) {
        await updatePurchase(editingPurchase.id, payload);
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث عملية الشراء بنجاح',
        });
      } else {
        await addPurchase(payload);
        toast({
          title: 'تم الحفظ',
          description: 'تم إضافة عملية الشراء بنجاح',
        });
      }

      // Dispatch refresh events so other components can update
      window.dispatchEvent(new Event('purchases-updated'));
      window.dispatchEvent(new Event('app-data-refreshed'));

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving purchase:', error);
      toast({
        title: 'خطأ',
        description:
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء حفظ عملية الشراء',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent scrollable className="max-w-md">
        {/* 🔸 Pinned header — stays visible while body scrolls */}
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4 text-right">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            {isEditMode ? 'تعديل عملية شراء' : 'إضافة عملية شراء'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? 'نموذج تعديل عملية شراء' : 'نموذج إضافة عملية شراء جديدة'}
          </DialogDescription>
        </DialogHeader>

        {/* 🔸 Scrollable body — vertical scroll when content overflows */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 [scrollbar-width:thin]">
          {isLoadingMaterials ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* التاريخ */}
              <div className="space-y-1.5">
                <Label htmlFor="purchase-date" className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  التاريخ
                </Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  className="rounded-xl"
                />
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

              {/* Inventory info box — default unit + conversion unit side by side */}
              {/* 🔸 Purely informational: shows the current stock in BOTH the
                  default unit and the conversion unit (if any). Mirrors the
                  SaleDialog layout exactly (same emerald styling, same
                  grid-cols-2, same Info icon). No accounting logic depends
                  on this — purchases ADD to inventory, so there's no
                  exceeds-inventory check here. */}
              {form.materialId && (
                isLoadingInventory ? (
                  <div className="flex items-center gap-2 rounded-xl border border-muted-foreground/20 bg-muted/30 text-muted-foreground px-3 py-2 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري تحميل المخزون...</span>
                  </div>
                ) : inventory ? (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Stock in default unit */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300 px-2.5 py-2 text-xs min-w-0">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="min-w-0 truncate">
                        المتوفر: {formatNumber(inventory.currentInDefaultUnit)}{' '}
                        <span className="font-medium">{inventory.defaultUnitName}</span>
                      </span>
                    </div>
                    {/* Stock in conversion unit (hidden if no conversion unit) */}
                    {conversionStock ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300 px-2.5 py-2 text-xs min-w-0">
                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="min-w-0 truncate">
                          بوحدة التحويل: {conversionStock.value}{' '}
                          <span className="font-medium">{conversionStock.unitName}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300 px-2.5 py-2 text-xs min-w-0">
                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="min-w-0 truncate text-muted-foreground">
                          بوحدة التحويل: لا توجد
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300 px-3 py-2 text-xs">
                    <Info className="w-3.5 h-3.5" />
                    <span>لا توجد بيانات مخزون</span>
                  </div>
                )
              )}

              {/* الكمية + الواحدة */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="purchase-quantity" className="flex items-center gap-1.5 text-sm">
                    <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
                    الكمية <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="purchase-quantity"
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    placeholder="0"
                    className="rounded-xl"
                  />
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
                      {selectedMaterial?.materialUnits && selectedMaterial.materialUnits.length > 0 ? (
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

              {/* السعر الإفرادي بالدولار */}
              <div className="space-y-1.5">
                <Label htmlFor="purchase-price" className="flex items-center gap-1.5 text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  السعر الإفرادي بالدولار <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="purchase-price"
                    type="number"
                    min="0"
                    step="any"
                    value={form.unitPriceUsd}
                    onChange={(e) => handleFieldChange('unitPriceUsd', e.target.value)}
                    placeholder="0.00"
                    className="rounded-xl pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                    $
                  </span>
                </div>
              </div>

              {/* البيان */}
              <div className="space-y-1.5">
                <Label htmlFor="purchase-description" className="text-sm">
                  البيان
                </Label>
                <Input
                  id="purchase-description"
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
                  <p className={cn(
                    'text-xl font-bold text-emerald-600 dark:text-emerald-400',
                    totalPrice === 0 && 'text-muted-foreground/70'
                  )}>
                    {formatNumber(totalPrice)} $
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🔸 Pinned footer — Save/Cancel always visible */}
        <DialogFooter className="flex-shrink-0 gap-2 border-t bg-background px-6 py-4">
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
            disabled={isSaving || isLoadingMaterials}
            className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                {isEditMode ? 'حفظ التعديلات' : 'حفظ'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
