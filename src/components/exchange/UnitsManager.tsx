'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Ruler,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Package,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  getUnits,
  addUnit,
  updateUnit,
  deleteUnit,
  type Unit,
} from '@/lib/supabaseDb';

export function UnitsManager() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل قائمة الوحدات',
        variant: 'destructive',
      });
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء إدخال اسم الوحدة',
        variant: 'destructive',
      });
      return;
    }
    // Duplicate check (client-side first)
    if (units.some((u) => u.name.trim().toLowerCase() === name.toLowerCase())) {
      toast({
        title: 'خطأ',
        description: 'توجد وحدة بنفس الاسم بالفعل',
        variant: 'destructive',
      });
      return;
    }
    setIsSavingNew(true);
    try {
      const created = await addUnit(name);
      if (created) {
        toast({
          title: 'تمت الإضافة',
          description: `تمت إضافة الوحدة "${created.name}" بنجاح`,
        });
        setNewName('');
        setIsAdding(false);
        await loadUnits();
      } else {
        throw new Error('لم يتم إنشاء الوحدة');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSavingNew(false);
    }
  };

  const startEdit = (unit: Unit) => {
    setEditingId(unit.id);
    setEditingName(unit.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (unit: Unit) => {
    const name = editingName.trim();
    if (!name) {
      toast({
        title: 'تنبيه',
        description: 'الرجاء إدخال اسم الوحدة',
        variant: 'destructive',
      });
      return;
    }
    if (
      units.some(
        (u) =>
          u.id !== unit.id &&
          u.name.trim().toLowerCase() === name.toLowerCase()
      )
    ) {
      toast({
        title: 'خطأ',
        description: 'توجد وحدة بنفس الاسم بالفعل',
        variant: 'destructive',
      });
      return;
    }
    if (name === unit.name) {
      cancelEdit();
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateUnit(unit.id, name);
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث اسم الوحدة بنجاح',
      });
      cancelEdit();
      await loadUnits();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'خطأ',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteUnit(deleteTarget.id);
      toast({
        title: 'تم الحذف',
        description: `تم حذف الوحدة "${deleteTarget.name}" بنجاح`,
      });
      setDeleteTarget(null);
      await loadUnits();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: 'تعذّر الحذف',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Role Info (non-admin) */}
      {!isAdmin && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            عرض فقط — إدارة الوحدات متاحة للمدير فقط
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Ruler className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-medium">وحدات القياس</p>
            <p className="text-xs text-muted-foreground">
              {units.length} وحدة
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadUnits}
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
              onClick={() => setIsAdding((v) => !v)}
              className="gap-1"
              disabled={isAdding}
            >
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          )}
        </div>
      </div>

      {/* Add New Unit (inline form) */}
      {isAdmin && isAdding && (
        <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-2">
          <Input
            autoFocus
            placeholder="اسم الوحدة الجديدة (مثال: كيس، كرتون، كغم)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewName('');
              }
            }}
            disabled={isSavingNew}
            className="rounded-xl"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isSavingNew || !newName.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
          >
            {isSavingNew ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            حفظ
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewName('');
            }}
            disabled={isSavingNew}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Search */}
      {units.length > 0 && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن وحدة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 rounded-xl"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && units.length === 0 ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">
            جاري تحميل الوحدات...
          </p>
        </div>
      ) : units.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
            <Ruler className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">لا توجد وحدات بعد</p>
          {isAdmin && !isAdding && (
            <p className="text-xs text-muted-foreground mt-1">
              اضغط &quot;إضافة&quot; لإنشاء أول وحدة قياس
            </p>
          )}
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            لا توجد نتائج مطابقة لـ &quot;{searchQuery}&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="p-3 rounded-xl bg-background border border-border/50 flex items-center justify-between gap-2"
            >
              {editingId === unit.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(unit);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    disabled={isSavingEdit}
                    className="rounded-xl h-9"
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                    onClick={() => handleSaveEdit(unit)}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={cancelEdit}
                    disabled={isSavingEdit}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium truncate">{unit.name}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(unit)}
                        aria-label="تعديل"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteTarget(unit)}
                        aria-label="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الوحدة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الوحدة{' '}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>
              ؟ لا يمكن التراجع عن هذا الإجراء. سيتم رفض الحذف إذا كانت الوحدة
              مستخدمة كوحدة افتراضية لأي مادة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                'bg-red-500 hover:bg-red-600 text-white',
                isDeleting && 'opacity-70 pointer-events-none'
              )}
            >
              {isDeleting ? (
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
