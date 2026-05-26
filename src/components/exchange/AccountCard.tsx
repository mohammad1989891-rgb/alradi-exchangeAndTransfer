'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, MoreVertical, Trash2, Edit, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Account, Transaction, Debt } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AccountMatchModal } from './AccountMatchModal';

interface AccountCardProps {
  account: Account;
  index: number;
  transactions: Transaction[];
  debts: Debt[];
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export function AccountCard({ 
  account, 
  index, 
  transactions, 
  debts, 
  onEdit, 
  onDelete, 
  onClick 
}: AccountCardProps) {
  const isPublic = account.type === 'PUBLIC';
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  
  // Calculate counts from local data
  const transactionCount = useMemo(() => {
    return transactions.filter(t => t.accountId === account.id && t.status !== 'PENDING').length;
  }, [transactions, account.id]);
  
  const debtCount = useMemo(() => {
    return debts.filter(d => d.accountId === account.id).length;
  }, [debts, account.id]);
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.05, duration: 0.2 }}
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-xl bg-card border border-border p-4',
          'hover:shadow-md transition-all duration-200 cursor-pointer'
        )}
      >
        <div className="flex items-start justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center',
              isPublic 
                ? 'bg-blue-100 dark:bg-blue-900/30' 
                : 'bg-purple-100 dark:bg-purple-900/30'
            )}>
              {isPublic ? (
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground">{account.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full',
                  isPublic 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                )}>
                  {isPublic ? 'عام' : 'خاص'}
                </span>
                {account.description && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {account.description}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side - Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsMatchModalOpen(true); }}>
                <FileText className="w-4 h-4 ml-2" />
                مطابقة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 ml-2" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">
                {transactionCount} حركة
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">
                {debtCount} دين
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs">دفتر الأستاذ</span>
          </div>
        </div>
        
        {/* Quick Match Button */}
        {transactionCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 pt-3 border-t border-border/50"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setIsMatchModalOpen(true);
              }}
            >
              <FileText className="w-3.5 h-3.5" />
              مطابقة الحساب
            </Button>
          </motion.div>
        )}
      </motion.div>
      
      {/* Match Modal */}
      <AccountMatchModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        accountId={account.id}
      />
    </>
  );
}
