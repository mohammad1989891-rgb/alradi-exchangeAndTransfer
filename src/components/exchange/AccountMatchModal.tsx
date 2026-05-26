'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { 
  Copy, Check, Share2, MessageSquare, RefreshCcw 
} from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { Currency } from '@/lib/localDb';
import { useToast } from '@/hooks/use-toast';

interface AccountMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
}

// Helper function to format number with commas
function formatNum(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function AccountMatchModal({ isOpen, onClose, accountId }: AccountMatchModalProps) {
  const { accounts, currencies } = useAppStore();
  const { transactions } = useLocalData();
  const { toast } = useToast();
  
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  
  const account = accounts.find(a => a.id === accountId);
  
  // Filter transactions for this account
  const accountTransactions = useMemo(() => {
    return transactions.filter(t => t.accountId === accountId && t.status !== 'PENDING');
  }, [transactions, accountId]);
  
  // Calculate balance by currency
  const balancesByCurrency = useMemo(() => {
    const balances: Record<string, {
      currency: Currency | undefined;
      netBalance: number;
    }> = {};
    
    for (const tx of accountTransactions) {
      const currencyId = tx.currencyId;
      if (!balances[currencyId]) {
        balances[currencyId] = {
          currency: currencies.find(c => c.id === currencyId),
          netBalance: 0,
        };
      }
      
      if (tx.type === 'INCOME') {
        balances[currencyId].netBalance += tx.finalBalance;
      } else {
        balances[currencyId].netBalance -= tx.finalBalance;
      }
    }
    
    return balances;
  }, [accountTransactions, currencies]);
  
  // Generate the match message - derived directly without state
  const originalMessage = useMemo(() => {
    const lines: string[] = [];
    
    // Header
    lines.push('<الراضي للصرافة>');
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('السلام عليكم ورحمة الله وبركاته،');
    lines.push('');
    lines.push('🖥️ مطابقة حساب 🖥️');
    lines.push('');
    
    // Group balances: positive (لنا) and negative (لكم)
    const positiveBalances: { currency: Currency | undefined; amount: number }[] = [];
    const negativeBalances: { currency: Currency | undefined; amount: number }[] = [];
    
    for (const currencyId in balancesByCurrency) {
      const balance = balancesByCurrency[currencyId];
      if (balance.netBalance > 0) {
        positiveBalances.push({
          currency: balance.currency,
          amount: balance.netBalance,
        });
      } else if (balance.netBalance < 0) {
        negativeBalances.push({
          currency: balance.currency,
          amount: Math.abs(balance.netBalance),
        });
      }
    }
    
    // Add "الرصيد المستحق لنا" lines
    if (positiveBalances.length > 0) {
      lines.push('نحيطكم علمًا بأن الرصيد المستحق لنا يبلغ:');
      for (const bal of positiveBalances) {
        lines.push(`${formatNum(bal.amount)} ${bal.currency?.name || ''}`);
      }
    }
    
    // Add "الرصيد المستحق لكم" lines
    if (negativeBalances.length > 0) {
      lines.push('نحيطكم علمًا بأن الرصيد المستحق لكم يبلغ:');
      for (const bal of negativeBalances) {
        lines.push(`${formatNum(bal.amount)} ${bal.currency?.name || ''}`);
      }
    }
    
    // If no balance
    if (positiveBalances.length === 0 && negativeBalances.length === 0) {
      lines.push('لا يوجد رصيد مستحق');
    }
    
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('نرجو منكم التكرم بمطابقة الحساب خلال مدة أقصاها 24 ساعة، وذلك حرصًا على دقة العمل وجودته.');
    lines.push('');
    lines.push('شاكرين حسن تعاونكم وتفهمكم.');
    lines.push('');
    lines.push('🖋️ قسم المحاسبة 🖋️');
    
    return lines.join('\n');
  }, [balancesByCurrency]);
  
  // Display message is either custom or original
  const displayMessage = customMessage ?? originalMessage;
  
  // Handle close - reset custom message
  const handleClose = (open: boolean) => {
    if (!open) {
      setCustomMessage(null);
      setCopied(false);
      onClose();
    }
  };
  
  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayMessage);
      setCopied(true);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ الرسالة إلى الحافظة',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل نسخ الرسالة',
        variant: 'destructive',
      });
    }
  };
  
  // Share message
  const handleShare = async () => {
    // Check if Web Share API is available (requires HTTPS and user interaction)
    const canUseWebShare = typeof navigator !== 'undefined' && 
                           typeof navigator.share === 'function' && 
                           typeof navigator.canShare === 'function';
    
    if (canUseWebShare) {
      try {
        const shareData = {
          title: `مطابقة حساب - ${account?.name || ''}`,
          text: displayMessage,
        };
        
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast({
            title: 'تمت المشاركة',
            description: 'تم مشاركة الرسالة بنجاح',
          });
          return;
        }
      } catch (error) {
        // User cancelled the share dialog
        if ((error as Error).name === 'AbortError') {
          return;
        }
        console.log('Web Share API failed:', error);
        // Continue to fallback
      }
    }
    
    // Fallback: Open WhatsApp with the message
    try {
      const encodedText = encodeURIComponent(displayMessage);
      const whatsappUrl = `https://wa.me/?text=${encodedText}`;
      
      // Try to open WhatsApp
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        toast({
          title: 'جاري الفتح',
          description: 'سيتم فتح واتساب للمشاركة',
        });
      } else {
        // Pop-up blocked, show message to copy instead
        toast({
          title: 'تم حظر النافذة المنبثقة',
          description: 'يرجى السماح بالنوافذ المنبثقة أو استخدام زر النسخ',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: 'خطأ في المشاركة',
        description: 'فشل مشاركة الرسالة، يرجى استخدام زر النسخ',
        variant: 'destructive',
      });
    }
  };
  
  // Reset to original message
  const handleReset = () => {
    setCustomMessage(null);
    toast({
      title: 'تم إعادة التعيين',
      description: 'تم استعادة الرسالة الأصلية',
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            مطابقة حساب
            {account && (
              <span className="text-muted-foreground font-normal text-sm">
                - {account.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 mt-4">
          {/* Balance Summary */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(balancesByCurrency).map(([currencyId, balance]) => (
              <motion.div
                key={currencyId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'p-3 rounded-xl text-center',
                  balance.netBalance > 0 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
                    : balance.netBalance < 0
                      ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
                      : 'bg-muted/50'
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {balance.currency?.name || ''}
                </p>
                <p className={cn(
                  'text-lg font-bold',
                  balance.netBalance > 0 
                    ? 'text-emerald-600' 
                    : balance.netBalance < 0 
                      ? 'text-red-600' 
                      : 'text-muted-foreground'
                )}>
                  {formatNumber(Math.abs(balance.netBalance))} {balance.currency?.symbol || ''}
                </p>
                <p className="text-xs mt-1">
                  {balance.netBalance > 0 ? 'لنا' : balance.netBalance < 0 ? 'لكم' : 'متوازن'}
                </p>
              </motion.div>
            ))}
          </div>
          
          {/* Editable Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الرسالة</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={customMessage === null}
                className="text-xs h-7"
              >
                <RefreshCcw className="w-3 h-3 ml-1" />
                إعادة تعيين
              </Button>
            </div>
            <Textarea
              value={displayMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[280px] text-sm font-mono leading-relaxed resize-none"
              dir="rtl"
            />
          </div>
        </div>
        
        {/* Fixed Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t mt-2 shrink-0">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                نسخ
              </>
            )}
          </Button>
          <Button
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            مشاركة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
