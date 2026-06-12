'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Save, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
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

export function OpeningBalanceModal() {
  const { 
    isOpeningBalanceModalOpen, 
    closeOpeningBalanceModal, 
    editingVault,
    vaults, 
    currencies, 
  } = useAppStore();
  
  const { updateVaultOpeningBalance } = useSupabaseData();
  
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [openingBalanceDate, setOpeningBalanceDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Initialize form when modal opens with editing vault
  useEffect(() => {
    if (isOpeningBalanceModalOpen) {
      if (editingVault) {
        setSelectedVaultId(editingVault.currencyId);
        setOpeningBalance(String(editingVault.openingBalance || 0));
        setOpeningBalanceDate(editingVault.openingBalanceDate ? new Date(editingVault.openingBalanceDate) : undefined);
      } else {
        setSelectedVaultId('');
        setOpeningBalance('0');
        setOpeningBalanceDate(undefined);
      }
    }
  }, [isOpeningBalanceModalOpen, editingVault]);
  
  const selectedVault = vaults.find(v => v.currencyId === selectedVaultId);
  const selectedCurrency = currencies.find(c => c.id === selectedVaultId);
  
  const handleSave = async () => {
    if (!selectedVaultId) return;
    
    setIsLoading(true);
    try {
      await updateVaultOpeningBalance(selectedVaultId, parseFloat(openingBalance) || 0, openingBalanceDate || null);
      closeOpeningBalanceModal();
    } catch (error) {
      console.error('Error saving opening balance:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedVaultId) return;
    
    setIsLoading(true);
    try {
      await updateVaultOpeningBalance(selectedVaultId, 0, null);
      setShowDeleteConfirm(false);
      closeOpeningBalanceModal();
    } catch (error) {
      console.error('Error deleting opening balance:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <Dialog open={isOpeningBalanceModalOpen} onOpenChange={closeOpeningBalanceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              رصيد أول المدة
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {/* Currency Selector */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">اختر الصندوق</label>
              <Select 
                value={selectedVaultId} 
                onValueChange={setSelectedVaultId}
                disabled={!!editingVault}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الصندوق" />
                </SelectTrigger>
                <SelectContent>
                  {vaults.map((vault) => {
                    const currency = currencies.find(c => c.id === vault.currencyId);
                    return (
                      <SelectItem key={vault.id} value={vault.currencyId}>
                        <span className="flex items-center gap-2">
                          <span className="font-bold">{currency?.symbol}</span>
                          <span>{currency?.name}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Opening Balance Input */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">رصيد أول المدة</label>
              <div className="relative">
                <Input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0"
                  className="text-lg font-semibold pr-12"
                />
                {selectedCurrency && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {selectedCurrency.symbol}
                  </span>
                )}
              </div>
            </div>
            
            {/* Opening Balance Date */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">تاريخ رصيد أول المدة</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                      'hover:bg-accent hover:text-accent-foreground',
                      !openingBalanceDate && 'text-muted-foreground'
                    )}
                  >
                    {openingBalanceDate ? format(openingBalanceDate, 'yyyy/MM/dd') : 'اختر التاريخ'}
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={openingBalanceDate}
                    onSelect={setOpeningBalanceDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Current Balance Preview */}
            {selectedVault && (
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">الرصيد الحالي</span>
                    <span className="font-semibold">
                      {formatNumber(selectedVault.balance)} {selectedCurrency?.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">رصيد أول المدة الحالي</span>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={cn(
                        'font-semibold',
                        (selectedVault.openingBalance || 0) > 0 ? 'text-emerald-600' : 
                        (selectedVault.openingBalance || 0) < 0 ? 'text-red-600' : ''
                      )}>
                        {formatNumber(selectedVault.openingBalance || 0)} {selectedCurrency?.symbol}
                      </span>
                      {selectedVault.openingBalanceDate && (
                        <span className="text-[10px] text-muted-foreground">
                          منذ {format(new Date(selectedVault.openingBalanceDate), 'yyyy/MM/dd')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">الرصيد بعد التعديل</span>
                      <span className={cn(
                        'font-bold',
                        (parseFloat(openingBalance) || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {formatNumber(parseFloat(openingBalance) || 0)} {selectedCurrency?.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={!selectedVaultId || (selectedVault?.openingBalance || 0) === 0}
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedVaultId || isLoading}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف رصيد أول المدة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف رصيد أول المدة لصندوق {selectedCurrency?.name}؟
              <br />
              سيتم تعيين الرصيد إلى صفر.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {isLoading ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
