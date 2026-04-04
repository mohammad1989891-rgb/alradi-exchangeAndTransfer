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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Check, X, RefreshCw, DollarSign, TrendingUp, Info } from 'lucide-react';
import type { Currency } from '@/lib/localDb';

export function CurrencyManagementModal() {
  const { isCurrencyModalOpen, closeCurrencyModal } = useAppStore();
  const { allCurrencies, activateCurrency, deactivateCurrency, updateCurrencyExchangeRate, refreshData, isLoading } = useLocalData();
  
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter currencies based on search
  const filteredCurrencies = allCurrencies.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.includes(searchTerm)
  );
  
  // Sort: active first, then by code
  const sortedCurrencies = [...filteredCurrencies].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.code.localeCompare(b.code);
  });
  
  const handleToggleCurrency = async (currency: Currency) => {
    if (currency.isActive) {
      await deactivateCurrency(currency.id);
    } else {
      // Open exchange rate input for non-USD currencies
      if (currency.code === 'USD') {
        await activateCurrency(currency.id, 1);
      } else {
        setEditingCurrency(currency.id);
        setExchangeRateInput(String(currency.exchangeRate || 1));
      }
    }
  };
  
  const handleSaveExchangeRate = async (currencyId: string) => {
    const rate = parseFloat(exchangeRateInput);
    if (isNaN(rate) || rate <= 0) {
      alert('يرجى إدخال قيمة صحيحة');
      return;
    }
    
    await activateCurrency(currencyId, rate);
    setEditingCurrency(null);
    setExchangeRateInput('');
  };
  
  const handleUpdateExchangeRate = async (currencyId: string, newRate: string) => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) return;
    
    await updateCurrencyExchangeRate(currencyId, rate);
  };
  
  // Get currency flag emoji
  const getCurrencyFlag = (code: string): string => {
    const flags: Record<string, string> = {
      'USD': '🇺🇸',
      'EUR': '🇪🇺',
      'GBP': '🇬🇧',
      'SAR': '🇸🇦',
      'AED': '🇦🇪',
      'KWD': '🇰🇼',
      'BHD': '🇧🇭',
      'QAR': '🇶🇦',
      'OMR': '🇴🇲',
      'SYP': '🇸🇾',
      'LBP': '🇱🇧',
      'JOD': '🇯🇴',
      'IQD': '🇮🇶',
      'TRY': '🇹🇷',
      'ILS': '🇮🇱',
      'EGP': '🇪🇬',
      'TND': '🇹🇳',
      'DZD': '🇩🇿',
      'MAD': '🇲🇦',
      'LYD': '🇱🇾',
      'INR': '🇮🇳',
      'PKR': '🇵🇰',
      'AUD': '🇦🇺',
      'CAD': '🇨🇦',
      'CHF': '🇨🇭',
      'CNY': '🇨🇳',
      'JPY': '🇯🇵',
    };
    return flags[code] || '💱';
  };
  
  return (
    <Dialog open={isCurrencyModalOpen} onOpenChange={closeCurrencyModal}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            إدارة العملات
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Info Box */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p>قم بتفعيل العملات التي تريد التعامل معها.</p>
                <p className="mt-1">عامل التحويل: كم يساوي 1 وحدة من هذه العملة بالدولار؟</p>
              </div>
            </div>
          </div>
          
          {/* Search */}
          <Input
            placeholder="بحث عن عملة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10"
          />
          
          {/* Currency List */}
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {sortedCurrencies.map((currency) => (
                  <motion.div
                    key={currency.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'rounded-xl border p-3 transition-all',
                      currency.isActive 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-muted/30 border-border/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      {/* Currency Info */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCurrencyFlag(currency.code)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{currency.symbol}</span>
                            <span className="font-medium">{currency.name}</span>
                            {currency.isDefault && (
                              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{currency.code}</span>
                        </div>
                      </div>
                      
                      {/* Toggle & Exchange Rate */}
                      <div className="flex items-center gap-3">
                        {currency.isActive && currency.code !== 'USD' && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.0001"
                              value={currency.exchangeRate}
                              onChange={(e) => handleUpdateExchangeRate(currency.id, e.target.value)}
                              className="w-20 h-8 text-sm text-left"
                              dir="ltr"
                            />
                          </div>
                        )}
                        
                        {currency.isDefault ? (
                          <div className="w-10 h-6 flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        ) : (
                          <Switch
                            checked={currency.isActive}
                            onCheckedChange={() => handleToggleCurrency(currency)}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Exchange Rate Info for Active Currencies */}
                    {currency.isActive && currency.code !== 'USD' && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>1 {currency.code} = {formatNumber(currency.exchangeRate, 4)} USD</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
          
          {/* Exchange Rate Input Modal */}
          {editingCurrency && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setEditingCurrency(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-background rounded-2xl p-6 max-w-sm mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-2">تحديد عامل التحويل</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  كم يساوي 1 وحدة من هذه العملة بالدولار الأمريكي؟
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-bold">
                    {allCurrencies.find(c => c.id === editingCurrency)?.symbol}
                  </span>
                  <span className="text-muted-foreground">=</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={exchangeRateInput}
                    onChange={(e) => setExchangeRateInput(e.target.value)}
                    className="flex-1"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="text-lg font-bold">$</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingCurrency(null)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleSaveExchangeRate(editingCurrency)}
                  >
                    تفعيل
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {/* Summary */}
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">العملات المفعلة</span>
              <span className="font-bold text-primary">
                {allCurrencies.filter(c => c.isActive).length} عملة
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
