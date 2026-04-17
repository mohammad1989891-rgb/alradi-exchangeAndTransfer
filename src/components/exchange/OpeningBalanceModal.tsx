'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Save, Trash2 } from 'lucide-react';
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
  
  const { updateVaultOpeningBalance } = useLocalData();
  
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Initialize form when modal opens with editing vault
  useEffect(() => {
    if (isOpeningBalanceModalOpen) {
      if (editingVault) {
        setSelectedVaultId(editingVault.currencyId);
        setOpeningBalance(String(editingVault.openingBalance || 0));
      } else {
        setSelectedVaultId('');
        setOpeningBalance('0');
      }
    }
  }, [isOpeningBalanceModalOpen, editingVault]);
  
  const selectedVault = vaults.find(v => v.currencyId === selectedVaultId);
  const selectedCurrency = currencies.find(c => c.id === selectedVaultId);
  
  const handleSave = async () => {
    if (!selectedVaultId) return;
    
    setIsLoading(true);
    try {
      await updateVaultOpeningBalance(selectedVaultId, parseFloat(openingBalance) || 0);
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
      await updateVaultOpeningBalance(selectedVaultId, 0);
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
                    <span className={cn(
                      'font-semibold',
                      (selectedVault.openingBalance || 0) > 0 ? 'text-emerald-600' : 
                      (selectedVault.openingBalance || 0) < 0 ? 'text-red-600' : ''
                    )}>
                      {formatNumber(selectedVault.openingBalance || 0)} {selectedCurrency?.symbol}
                    </span>
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
