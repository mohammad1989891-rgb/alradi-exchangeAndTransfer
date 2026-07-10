'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Package,
  Plus,
  ChevronDown,
  ChevronLeft,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Ruler,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  getMaterials,
  getUnits,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  addMaterialUnit,
  updateMaterialUnit,
  deleteMaterialUnit,
  type Material,
  type MaterialUnit,
  type Unit,
} from '@/lib/supabaseDb';

// Shape of an "extra unit row" used inside the Add Material dialog
interface ExtraUnitRow {
  unitId: string;
  baseFactor: string; // string for input binding; parsed to number on save
}

export function MaterialsManager() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Material dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDefaultUnitId, setNewDefaultUnitId] = useState('');
  const [extraUnits, setExtraUnits] = useState<ExtraUnitRow[]>([]);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Expanded materials
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Edit material name
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Change default unit
  const [changingDefaultId, setChangingDefaultId] = useState<string | null>(
    null
  );
  const [changingDefaultValue, setChangingDefaultValue] = useState('');
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  // Edit base factor of a material_unit (inline)
  const [editingMuId, setEditingMuId] = useState<string | null>(null);
  const [editingMuFactor, setEditingMuFactor] = useState('');
  const [isSavingMu, setIsSavingMu] = useState(false);

  // Add unit to existing material (inline)
  const [addingUnitToMaterialId, setAddingUnitToMaterialId] = useState<
    string | null
  >(null);
  const [newUnitForMaterialUnitId, setNewUnitForMaterialUnitId] = useState('');
  const [newUnitForMaterialFactor, setNewUnitForMaterialFactor] = useState('');
  const [isAddingUnitToMaterial, setIsAddingUnitToMaterial] = useState(false);

  // Delete material
  const [deleteMaterialTarget, setDeleteMaterialTarget] =
    useState<Material | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // Delete material_unit
  const [deleteMuTarget, setDeleteMuTarget] = useState<{
    mu: MaterialUnit;
    material: Material;
  } | null>(null);
  const [isDeletingMu, setIsDeletingMu] = useState(false);

  // ---------- Loaders ----------
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mats, uns] = await Promise.all([getMaterials(), getUnits()]);
      setMaterials(mats);
      setUnits(uns);
    } catch (error) {
      console.error('Error loading materials/units:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل البيانات',
        variant: 'destructive',
      });
      setMaterials([]);
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const dispatchMaterialsUpdated = () => {
    window.dispatchEvent(new Event('materials-updated'));
    window.dispatchEvent(new Event('app-data-refreshed'));
  };

  // ---------- Helpers ----------
  const unitName = (unitId: string | undefined): string => {
    if (!unitId) return '—';
    return units.find((u) => u.id === unitId)?.name || 'وحدة محذوفة';
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAddDialog = () => {
    setNewName('');
    setNewDefaultUnitId('');
    setExtraUnits([]);
  };

  // Available units for "extra units" in the Add dialog: exclude the default + already-picked
  const availableUnitsForExtra = (pickedUnitIds: Set<string>): Unit[] =>
    units.filter((u) => !pickedUnitIds.has(u.id));

  // ---------- Add Material ----------
  const openAddDialog = () => {
    resetAddDialog();
    setIsAddOpen(true);
  };

  const handleAddMaterial = async () => {
    const name = newName.trim();
    if (!name) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء إدخال اسم المادة',
        variant: 'destructive',
      });
      return;
    }
    if (!newDefaultUnitId) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء اختيار الوحدة الافتراضية',
        variant: 'destructive',
      });
      return;
    }
    // Validate extra units
    const cleanedExtras: { unitId: string; baseFactor: number }[] = [];
    const seenUnitIds = new Set<string>([newDefaultUnitId]);
    for (let i = 0; i < extraUnits.length; i++) {
      const row = extraUnits[i];
      if (!row.unitId) {
        toast({
          title: 'تنبيه',
          description: `الرجاء اختيار الوحدة في الصف رقم ${i + 1}`,
          variant: 'destructive',
        });
        return;
      }
      if (seenUnitIds.has(row.unitId)) {
        toast({
          title: 'تنبيه',
          description: `الوحدة "${unitName(
            row.unitId
          )}" مكررة — لا يمكن إضافتها مرتين`,
          variant: 'destructive',
        });
        return;
      }
      seenUnitIds.add(row.unitId);
      const factor = parseFloat(row.baseFactor);
      if (isNaN(factor) || factor <= 0) {
        toast({
          title: 'تنبيه',
          description: `معامل التحويل في الصف رقم ${
            i + 1
          } يجب أن يكون رقماً موجباً`,
          variant: 'destructive',
        });
        return;
      }
      cleanedExtras.push({ unitId: row.unitId, baseFactor: factor });
    }

    setIsSavingNew(true);
    try {
      await addMaterial({
        name,
        defaultUnitId: newDefaultUnitId,
        units: cleanedExtras,
      });
      toast({
        title: 'تمت الإضافة',
        description: `تمت إضافة المادة "${name}" بنجاح`,
      });
      setIsAddOpen(false);
      resetAddDialog();
      await loadAll();
      dispatchMaterialsUpdated();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSavingNew(false);
    }
  };

  // ---------- Edit material name ----------
  const startEditName = (m: Material) => {
    setEditingNameId(m.id);
    setEditingNameValue(m.name);
  };

  const cancelEditName = () => {
    setEditingNameId(null);
    setEditingNameValue('');
  };

  const handleSaveName = async (m: Material) => {
    const name = editingNameValue.trim();
    if (!name) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء إدخال اسم المادة',
        variant: 'destructive',
      });
      return;
    }
    if (name === m.name) {
      cancelEditName();
      return;
    }
    setIsSavingName(true);
    try {
      await updateMaterial(m.id, { name });
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث اسم المادة بنجاح',
      });
      cancelEditName();
      await loadAll();
      dispatchMaterialsUpdated();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // ---------- Change default unit ----------
  const startChangeDefault = (m: Material) => {
    setChangingDefaultId(m.id);
    setChangingDefaultValue(m.defaultUnitId);
  };

  const cancelChangeDefault = () => {
    setChangingDefaultId(null);
    setChangingDefaultValue('');
  };

  const handleSaveDefault = async (m: Material) => {
    if (!changingDefaultValue) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء اختيار وحدة افتراضية',
        variant: 'destructive',
      });
      return;
    }
    if (changingDefaultValue === m.defaultUnitId) {
      cancelChangeDefault();
      return;
    }
    setIsSavingDefault(true);
    try {
      await updateMaterial(m.id, { defaultUnitId: changingDefaultValue });
      toast({
        title: 'تم التحديث',
        description:
          'تم تغيير الوحدة الافتراضية. تمت إعادة حساب معاملات التحويل تلقائياً.',
      });
      cancelChangeDefault();
      await loadAll();
      dispatchMaterialsUpdated();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSavingDefault(false);
    }
  };

  // ---------- Edit material_unit baseFactor ----------
  const startEditMu = (mu: MaterialUnit) => {
    setEditingMuId(mu.id);
    setEditingMuFactor(String(mu.baseFactor));
  };

  const cancelEditMu = () => {
    setEditingMuId(null);
    setEditingMuFactor('');
  };

  const handleSaveMu = async (mu: MaterialUnit) => {
    const factor = parseFloat(editingMuFactor);
    if (isNaN(factor) || factor <= 0) {
      toast({
        title: 'تنبيه',
        description: 'معامل التحويل يجب أن يكون رقماً موجباً',
        variant: 'destructive',
      });
      return;
    }
    if (factor === mu.baseFactor) {
      cancelEditMu();
      return;
    }
    setIsSavingMu(true);
    try {
      await updateMaterialUnit(mu.id, factor);
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث معامل التحويل بنجاح',
      });
      cancelEditMu();
      await loadAll();
      dispatchMaterialsUpdated();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSavingMu(false);
    }
  };

  // ---------- Add unit to existing material ----------
  const startAddUnitToMaterial = (materialId: string) => {
    setAddingUnitToMaterialId(materialId);
    setNewUnitForMaterialUnitId('');
    setNewUnitForMaterialFactor('');
  };

  const cancelAddUnitToMaterial = () => {
    setAddingUnitToMaterialId(null);
    setNewUnitForMaterialUnitId('');
    setNewUnitForMaterialFactor('');
  };

  const handleAddUnitToMaterial = async (m: Material) => {
    if (!newUnitForMaterialUnitId) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء اختيار الوحدة',
        variant: 'destructive',
      });
      return;
    }
    // Ensure not already attached
    if (
      m.materialUnits?.some(
        (mu) => mu.unitId === newUnitForMaterialUnitId
      )
    ) {
      toast({
        title: 'تنبيه',
        description: 'هذه الوحدة مضافة بالفعل لهذه المادة',
        variant: 'destructive',
      });
      return;
    }
    const factor = parseFloat(newUnitForMaterialFactor);
    if (isNaN(factor) || factor <= 0) {
      toast({
        title: 'تنبيه',
        description: 'معامل التحويل يجب أن يكون رقماً موجباً',
        variant: 'destructive',
      });
      return;
    }
    setIsAddingUnitToMaterial(true);
    try {
      await addMaterialUnit({
        materialId: m.id,
        unitId: newUnitForMaterialUnitId,
        baseFactor: factor,
      });
      toast({
        title: 'تمت الإضافة',
        description: 'تمت إضافة الوحدة للمادة بنجاح',
      });
      cancelAddUnitToMaterial();
      await loadAll();
      dispatchMaterialsUpdated();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsAddingUnitToMaterial(false);
    }
  };

  // ---------- Delete material_unit ----------
  const handleDeleteMu = async () => {
    if (!deleteMuTarget) return;
    setIsDeletingMu(true);
    try {
      await deleteMaterialUnit(deleteMuTarget.mu.id);
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الوحدة من هذه المادة بنجاح',
      });
      setDeleteMuTarget(null);
      await loadAll();
      dispatchMaterialsUpdated();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'تعذّر الحذف',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsDeletingMu(false);
    }
  };

  // ---------- Delete material ----------
  const handleDeleteMaterial = async () => {
    if (!deleteMaterialTarget) return;
    setIsDeletingMaterial(true);
    try {
      await deleteMaterial(deleteMaterialTarget.id);
      toast({
        title: 'تم الحذف',
        description: `تم حذف المادة "${deleteMaterialTarget.name}" بنجاح`,
      });
      setDeleteMaterialTarget(null);
      // Remove from expanded set
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteMaterialTarget.id);
        return next;
      });
      await loadAll();
      dispatchMaterialsUpdated();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'تعذّر الحذف',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-4">
      {/* Role Info (non-admin) */}
      {!isAdmin && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            عرض فقط — إدارة المواد متاحة للمدير فقط
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-medium">المواد والوحدات</p>
            <p className="text-xs text-muted-foreground">
              {materials.length} مادة
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAll}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'تحديث'
            )}
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={openAddDialog}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              إضافة مادة
            </Button>
          )}
        </div>
      </div>

      {/* Conversion factor hint */}
      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-blue-700 dark:text-blue-400">
              معامل التحويل (baseFactor):
            </span>{' '}
            يُمثّل كم عدد الوحدات الافتراضية التي تساويها وحدة واحدة من هذه
            الوحدة. الوحدة الافتراضية معاملها دائماً = 1. مثال: إذا كانت الوحدة
            الافتراضية هي &quot;كيس&quot; وأضفت &quot;كرتون&quot; بمعامل = 20،
            فذلك يعني أن 1 كرتون = 20 كيس.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && materials.length === 0 ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">
            جاري تحميل المواد...
          </p>
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">لا توجد مواد بعد</p>
          {isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              اضغط &quot;إضافة مادة&quot; لإنشاء أول مادة
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {materials.map((m) => {
            const isExpanded = expandedIds.has(m.id);
            const defaultUnitName = m.defaultUnit?.name || unitName(m.defaultUnitId);
            const unitsCount = m.materialUnits?.length || 0;
            return (
              <div
                key={m.id}
                className="rounded-xl bg-background border border-border/50 overflow-hidden"
              >
                {/* Collapsed row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(m.id)}
                  className="w-full p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        الافتراضية: {defaultUnitName} • {unitsCount} وحدات
                      </p>
                    </div>
                  </div>
                  <ChevronLeft
                    className={cn(
                      'w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0',
                      isExpanded && '-rotate-90'
                    )}
                  />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-3 pt-0 space-y-3 border-t border-border/30 mt-1">
                    {/* Edit name */}
                    <div className="pt-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        اسم المادة
                      </Label>
                      {editingNameId === m.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={editingNameValue}
                            onChange={(e) =>
                              setEditingNameValue(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveName(m);
                              if (e.key === 'Escape') cancelEditName();
                            }}
                            disabled={isSavingName}
                            className="rounded-xl h-9"
                          />
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                            onClick={() => handleSaveName(m)}
                            disabled={isSavingName}
                          >
                            {isSavingName ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={cancelEditName}
                            disabled={isSavingName}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-1.5 rounded-xl bg-muted/40 text-sm">
                            {m.name}
                          </div>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => startEditName(m)}
                              aria-label="تعديل الاسم"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Default unit */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        الوحدة الافتراضية
                      </Label>
                      {changingDefaultId === m.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={changingDefaultValue}
                            onValueChange={setChangingDefaultValue}
                            disabled={isSavingDefault}
                          >
                            <SelectTrigger className="rounded-xl h-9 flex-1">
                              <SelectValue placeholder="اختر الوحدة الافتراضية" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                            onClick={() => handleSaveDefault(m)}
                            disabled={isSavingDefault}
                          >
                            {isSavingDefault ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={cancelChangeDefault}
                            disabled={isSavingDefault}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-1.5 rounded-xl bg-muted/40 text-sm">
                            {defaultUnitName}
                          </div>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => startChangeDefault(m)}
                              aria-label="تغيير الوحدة الافتراضية"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                      {changingDefaultId === m.id && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ تغيير الوحدة الافتراضية سيُعيد حساب معاملات التحويل
                          لجميع الوحدات الأخرى.
                        </p>
                      )}
                    </div>

                    {/* Material units list */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        وحدات المادة ومعاملات التحويل
                      </Label>
                      <div className="space-y-2">
                        {(m.materialUnits || []).map((mu) => {
                          const isDefault = mu.unitId === m.defaultUnitId;
                          const muUnitName =
                            mu.unit?.name || unitName(mu.unitId);
                          return (
                            <div
                              key={mu.id}
                              className={cn(
                                'p-2 rounded-xl border flex items-center gap-2',
                                isDefault
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-muted/30 border-border/50'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                                    isDefault
                                      ? 'bg-emerald-500/20'
                                      : 'bg-muted'
                                  )}
                                >
                                  <Ruler
                                    className={cn(
                                      'w-3.5 h-3.5',
                                      isDefault
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-muted-foreground'
                                    )}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {muUnitName}
                                  </p>
                                  {isDefault && (
                                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                      الوحدة الافتراضية
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* baseFactor editor */}
                              {editingMuId === mu.id ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[11px] text-muted-foreground">
                                    1 {muUnitName} =
                                  </span>
                                  <Input
                                    autoFocus
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    value={editingMuFactor}
                                    onChange={(e) =>
                                      setEditingMuFactor(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveMu(mu);
                                      if (e.key === 'Escape') cancelEditMu();
                                    }}
                                    disabled={isSavingMu}
                                    className="rounded-lg h-8 w-20 text-xs"
                                  />
                                  <span className="text-[11px] text-muted-foreground">
                                    {defaultUnitName}
                                  </span>
                                  <Button
                                    size="icon"
                                    className="h-7 w-7 bg-emerald-500 hover:bg-emerald-600 text-white"
                                    onClick={() => handleSaveMu(mu)}
                                    disabled={isSavingMu}
                                  >
                                    {isSavingMu ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={cancelEditMu}
                                    disabled={isSavingMu}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[11px] text-muted-foreground">
                                    1 {muUnitName} =
                                  </span>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-background border border-border/50 min-w-[2.5rem] text-center">
                                    {mu.baseFactor}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {defaultUnitName}
                                  </span>
                                  {isAdmin && !isDefault && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => startEditMu(mu)}
                                        aria-label="تعديل المعامل"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-red-500 hover:text-red-600"
                                        onClick={() =>
                                          setDeleteMuTarget({ mu, material: m })
                                        }
                                        aria-label="حذف الوحدة"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  {isDefault && (
                                    <span className="text-[10px] text-muted-foreground px-1">
                                      (ثابتة)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add unit to material (inline form) */}
                        {isAdmin &&
                          addingUnitToMaterialId === m.id && (
                            <div className="p-2 rounded-xl bg-muted/40 border border-dashed border-border flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-muted-foreground">
                                إضافة وحدة جديدة:
                              </span>
                              <Select
                                value={newUnitForMaterialUnitId}
                                onValueChange={setNewUnitForMaterialUnitId}
                                disabled={isAddingUnitToMaterial}
                              >
                                <SelectTrigger className="rounded-lg h-8 w-32 text-xs">
                                  <SelectValue placeholder="الوحدة" />
                                </SelectTrigger>
                                <SelectContent>
                                  {units
                                    .filter(
                                      (u) =>
                                        !m.materialUnits?.some(
                                          (mu) => mu.unitId === u.id
                                        )
                                    )
                                    .map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <span className="text-[11px] text-muted-foreground">
                                1 =
                              </span>
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                placeholder="معامل"
                                value={newUnitForMaterialFactor}
                                onChange={(e) =>
                                  setNewUnitForMaterialFactor(e.target.value)
                                }
                                disabled={isAddingUnitToMaterial}
                                className="rounded-lg h-8 w-20 text-xs"
                              />
                              <span className="text-[11px] text-muted-foreground">
                                {defaultUnitName}
                              </span>
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                                onClick={() => handleAddUnitToMaterial(m)}
                                disabled={isAddingUnitToMaterial}
                              >
                                {isAddingUnitToMaterial ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                حفظ
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={cancelAddUnitToMaterial}
                                disabled={isAddingUnitToMaterial}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}

                        {isAdmin &&
                          addingUnitToMaterialId !== m.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1 rounded-xl border-dashed"
                              onClick={() => startAddUnitToMaterial(m.id)}
                              disabled={
                                availableUnitsForExtra(
                                  new Set(
                                    (m.materialUnits || []).map(
                                      (mu) => mu.unitId
                                    )
                                  )
                                ).length === 0
                              }
                            >
                              <Plus className="w-4 h-4" />
                              إضافة وحدة
                            </Button>
                          )}
                      </div>
                    </div>

                    {/* Delete material */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-border/30">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1"
                          onClick={() => setDeleteMaterialTarget(m)}
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف المادة
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!isSavingNew) {
            setIsAddOpen(open);
            if (!open) resetAddDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500" />
              إضافة مادة جديدة
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المادة ووحداتها. تُضاف الوحدة الافتراضية تلقائياً
              بمعامل تحويل = 1.
            </DialogDescription>
          </DialogHeader>

          {units.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                لا توجد وحدات قياس بعد. يجب إنشاء وحدة واحدة على الأقل من قسم
                &quot;وحدات القياس&quot; أولاً.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                حسناً
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="new-material-name" className="text-xs mb-1">
                  اسم المادة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-material-name"
                  placeholder="مثال: سكر، أرز، دقيق..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSavingNew}
                  className="rounded-xl"
                />
              </div>

              {/* Default unit */}
              <div>
                <Label className="text-xs mb-1">
                  الوحدة الافتراضية <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newDefaultUnitId}
                  onValueChange={setNewDefaultUnitId}
                  disabled={isSavingNew}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="اختر الوحدة الافتراضية" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  ستُضاف هذه الوحدة تلقائياً بمعامل تحويل = 1.
                </p>
              </div>

              {/* Extra units */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">وحدات إضافية (اختياري)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    onClick={() =>
                      setExtraUnits((prev) => [
                        ...prev,
                        { unitId: '', baseFactor: '' },
                      ])
                    }
                    disabled={
                      isSavingNew ||
                      availableUnitsForExtra(
                        new Set([
                          newDefaultUnitId,
                          ...extraUnits
                            .map((r) => r.unitId)
                            .filter(Boolean),
                        ])
                      ).length === 0
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة وحدة
                  </Button>
                </div>

                {extraUnits.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground p-2 rounded-xl bg-muted/30 text-center">
                    لا توجد وحدات إضافية. اضغط &quot;إضافة وحدة&quot; لإضافة
                    وحدات تحويل أخرى.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {extraUnits.map((row, idx) => {
                      const pickedSet = new Set([
                        newDefaultUnitId,
                        ...extraUnits
                          .map((r) => r.unitId)
                          .filter(Boolean),
                      ]);
                      const available = availableUnitsForExtra(pickedSet).filter(
                        (u) =>
                          u.id === row.unitId ||
                          !extraUnits.some(
                            (r, i) => i !== idx && r.unitId === u.id
                          )
                      );
                      return (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50"
                        >
                          <Select
                            value={row.unitId}
                            onValueChange={(val) =>
                              setExtraUnits((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, unitId: val } : r
                                )
                              )
                            }
                            disabled={isSavingNew}
                          >
                            <SelectTrigger className="rounded-lg h-8 w-32 text-xs">
                              <SelectValue placeholder="الوحدة" />
                            </SelectTrigger>
                            <SelectContent>
                              {available.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-[11px] text-muted-foreground">
                            1 {row.unitId ? unitName(row.unitId) : '...'} =
                          </span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder="معامل"
                            value={row.baseFactor}
                            onChange={(e) =>
                              setExtraUnits((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? { ...r, baseFactor: e.target.value }
                                    : r
                                )
                              )
                            }
                            disabled={isSavingNew}
                            className="rounded-lg h-8 w-24 text-xs"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {newDefaultUnitId
                              ? unitName(newDefaultUnitId)
                              : 'الافتراضية'}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() =>
                              setExtraUnits((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            disabled={isSavingNew}
                            aria-label="حذف الوحدة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                resetAddDialog();
              }}
              disabled={isSavingNew || units.length === 0}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddMaterial}
              disabled={
                isSavingNew ||
                units.length === 0 ||
                !newName.trim() ||
                !newDefaultUnitId
              }
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
            >
              {isSavingNew ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  حفظ المادة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete material_unit confirmation */}
      <AlertDialog
        open={!!deleteMuTarget}
        onOpenChange={(open) => {
          if (!open && !isDeletingMu) setDeleteMuTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الوحدة من المادة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الوحدة{' '}
              <span className="font-semibold text-foreground">
                &quot;{deleteMuTarget?.mu.unit?.name || '—'}&quot;
              </span>{' '}
              من المادة{' '}
              <span className="font-semibold text-foreground">
                &quot;{deleteMuTarget?.material.name}&quot;
              </span>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMu}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMu}
              disabled={isDeletingMu}
              className={cn(
                'bg-red-500 hover:bg-red-600 text-white',
                isDeletingMu && 'opacity-70 pointer-events-none'
              )}
            >
              {isDeletingMu ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الحذف...
                </>
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete material confirmation */}
      <AlertDialog
        open={!!deleteMaterialTarget}
        onOpenChange={(open) => {
          if (!open && !isDeletingMaterial) setDeleteMaterialTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المادة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المادة{' '}
              <span className="font-semibold text-foreground">
                &quot;{deleteMaterialTarget?.name}&quot;
              </span>{' '}
              وجميع وحداتها المرتبطة؟ لا يمكن التراجع عن هذا الإجراء. سيتم رفض
              الحذف إذا كانت هناك حركات شراء أو بيع مرتبطة بهذه المادة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMaterial}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMaterial}
              disabled={isDeletingMaterial}
              className={cn(
                'bg-red-500 hover:bg-red-600 text-white',
                isDeletingMaterial && 'opacity-70 pointer-events-none'
              )}
            >
              {isDeletingMaterial ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الحذف...
                </>
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
