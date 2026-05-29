'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AccountFormData } from '@/types';

const defaultFormData: AccountFormData = {
  name: '',
  type: 'PRIVATE',
  description: '',
};

export function AccountModal() {
  const {
    isAccountModalOpen,
    closeAccountModal,
    editingAccount,
  } = useAppStore();
  
  const { addAccount, updateAccount, deleteAccount } = useSupabaseData();
  
  const [formData, setFormData] = useState<AccountFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isAccountModalOpen) {
      if (editingAccount) {
        setFormData({
          name: editingAccount.name,
          type: editingAccount.type,
          description: editingAccount.description || '',
        });
      } else {
        setFormData(defaultFormData);
      }
    }
  }, [isAccountModalOpen, editingAccount]);
  
  const handleSubmit = async () => {
    if (!formData.name) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (editingAccount) {
        // Update existing account
        await updateAccount(editingAccount.id, {
          name: formData.name,
          type: formData.type,
          description: formData.description,
        });
        closeAccountModal();
      } else {
        // Create new account
        await addAccount({
          name: formData.name,
          type: formData.type,
          description: formData.description,
        });
        closeAccountModal();
      }
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isAccountModalOpen} onOpenChange={closeAccountModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>اسم الحساب</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="أدخل اسم الحساب..."
            />
          </div>
          
          {/* Type */}
          <div className="space-y-2">
            <Label>نوع الحساب</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'PRIVATE' })}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-center',
                  formData.type === 'PRIVATE'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-border hover:border-purple-300'
                )}
              >
                <div className="text-2xl mb-1">👤</div>
                <div className="font-medium">خاص</div>
                <div className="text-xs text-muted-foreground mt-1">حساب شخصي</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'PUBLIC' })}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-center',
                  formData.type === 'PUBLIC'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-border hover:border-blue-300'
                )}
              >
                <div className="text-2xl mb-1">🏢</div>
                <div className="font-medium">عام</div>
                <div className="text-xs text-muted-foreground mt-1">حساب تجاري</div>
              </button>
            </div>
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label>الوصف (اختياري)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>
          
          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? 'جاري الحفظ...' : editingAccount ? 'تحديث الحساب' : 'إضافة الحساب'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
