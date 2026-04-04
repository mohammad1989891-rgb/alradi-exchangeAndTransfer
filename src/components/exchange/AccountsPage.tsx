'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, Building2 } from 'lucide-react';
import { AccountCard } from './AccountCard';
import { AccountModal } from './AccountModal';
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
import type { Account } from '@/types';

export function AccountsPage() {
  const { accounts, openAccountModal, openAccountStatement } = useAppStore();
  const { transactions, debts, deleteAccount: removeAccount } = useLocalData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  
  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleAccountClick = (account: Account) => {
    openAccountStatement(account);
  };
  
  const handleDelete = async () => {
    if (!deleteAccount) return;
    
    try {
      await removeAccount(deleteAccount.id);
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setDeleteAccount(null);
    }
  };
  
  const privateAccounts = filteredAccounts.filter(a => a.type === 'PRIVATE');
  const publicAccounts = filteredAccounts.filter(a => a.type === 'PUBLIC');
  
  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الحسابات</h1>
          <p className="text-sm text-muted-foreground">{accounts.length} حساب</p>
        </div>
        <Button
          onClick={() => openAccountModal()}
          className="gap-2 rounded-full"
        >
          <Plus className="w-4 h-4" />
          إضافة
        </Button>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث في الحسابات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>
      
      {/* Private Accounts */}
      {privateAccounts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold">حسابات خاصة</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {privateAccounts.length}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {privateAccounts.map((account, index) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  index={index}
                  transactions={transactions}
                  debts={debts}
                  onEdit={() => openAccountModal(account)}
                  onDelete={() => setDeleteAccount(account)}
                  onClick={() => handleAccountClick(account)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {/* Public Accounts */}
      {publicAccounts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold">حسابات عامة</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {publicAccounts.length}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {publicAccounts.map((account, index) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  index={index}
                  transactions={transactions}
                  debts={debts}
                  onEdit={() => openAccountModal(account)}
                  onDelete={() => setDeleteAccount(account)}
                  onClick={() => handleAccountClick(account)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {filteredAccounts.length === 0 && (
        <div className="text-center py-12 rounded-2xl bg-muted/30">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'لا توجد نتائج' : 'لا توجد حسابات'}
          </p>
          {!searchQuery && (
            <Button onClick={() => openAccountModal()}>
              إضافة حساب جديد
            </Button>
          )}
        </div>
      )}
      
      {/* Account Modal */}
      <AccountModal />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAccount} onOpenChange={() => setDeleteAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحساب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف حساب "{deleteAccount?.name}"؟
              <br />
              سيتم حذف جميع الحركات والديون المرتبطة به.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
