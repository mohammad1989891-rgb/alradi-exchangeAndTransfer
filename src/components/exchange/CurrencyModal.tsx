'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { isSYPCurrency, convertInverseExchangeRateForDisplay, convertInverseExchangeRateForStorage, isLikelyOldVersion } from '@/lib/syp-conversion';
import { useSYPSettings } from '@/store/useSYPSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, DollarSign, TrendingUp, Info, Check, Search, RefreshCw, RotateCcw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Currency } from '@/lib/localDb';
import { resetCurrenciesToDefault, updateCurrencyConversionMethod as updateCurrencyConversionMethodDb } from '@/lib/localDb';
import { useToast } from '@/hooks/use-toast';

export function CurrencyModal() {
  const { isCurrencyModalOpen, closeCurrencyModal } = useAppStore();
  const { allCurrencies, activateCurrency, deactivateCurrency, updateCurrencyExchangeRate, refreshData, isLoading } = useLocalData();
  const { toast } = useToast();
  const { displayVersion } = useSYPSettings();
  
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('');
  const [conversionMethodInput, setConversionMethodInput] = useState<'MULTIPLY' | 'DIVIDE'>('MULTIPLY');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
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
        setExchangeRateInput(
          isSYPCurrency(currency.id, currency.code)
            ? String(convertInverseExchangeRateForDisplay(currency.exchangeRate || 1, 'NEW'))
            : String(currency.exchangeRate || 1)
        );
        setConversionMethodInput(currency.conversionMethod || 'MULTIPLY');
      }
    }
  };
  
  const handleSaveExchangeRate = async (currencyId: string) => {
    let rate = parseFloat(exchangeRateInput);
    if (isNaN(rate) || rate <= 0) {
      alert('يرجى إدخال قيمة صحيحة');
      return;
    }
    
    // Convert SYP rate from NEW version to stored (OLD) version
    // ⚠️ نستخدم الدالة العكسية لأن exchangeRate يمثل "1 ليرة = X دولار"
    // الليرة الجديدة أكبر 100 مرة → قيمتها بالدولار أكبر 100 مرة
    // لذا: المخزن = المدخل ÷ 100 (عكس معامل التحويل العادي)
    const targetCurrency = allCurrencies.find(c => c.id === currencyId);
    if (targetCurrency && isSYPCurrency(targetCurrency.id, targetCurrency.code)) {
      rate = convertInverseExchangeRateForStorage(rate, 'NEW');
    }
    
    await activateCurrency(currencyId, rate);
    // تحديث طريقة التحويل بعد التفعيل
    await updateCurrencyConversionMethodDb(currencyId, conversionMethodInput);
    await refreshData();
    setEditingCurrency(null);
    setExchangeRateInput('');
  };
  
  const handleUpdateExchangeRate = async (currencyId: string, newRate: string) => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) return;
    
    await updateCurrencyExchangeRate(currencyId, rate);
    // إطلاق حدث لتحديث البيانات في الصفحة الرئيسية
    window.dispatchEvent(new CustomEvent('currency-updated'));
  };
  
  // Handle update conversion method
  const handleUpdateConversionMethod = async (currencyId: string, method: 'MULTIPLY' | 'DIVIDE') => {
    await updateCurrencyConversionMethodDb(currencyId, method);
    await refreshData();
    // إطلاق حدث لتحديث البيانات في الصفحة الرئيسية
    window.dispatchEvent(new CustomEvent('currency-updated'));
  };
  
  // Get currency flag emoji
  const getCurrencyFlag = (code: string): string => {
    const flags: Record<string, string> = {
      'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧',
      'SAR': '🇸🇦', 'AED': '🇦🇪', 'KWD': '🇰🇼', 'BHD': '🇧🇭',
      'QAR': '🇶🇦', 'OMR': '🇴🇲', 'SYP': '🇸🇾', 'LBP': '🇱🇧',
      'JOD': '🇯🇴', 'IQD': '🇮🇶', 'TRY': '🇹🇷', 'ILS': '🇮🇱',
      'EGP': '🇪🇬', 'TND': '🇹🇳', 'DZD': '🇩🇿', 'MAD': '🇲🇦',
      'LYD': '🇱🇾', 'INR': '🇮🇳', 'AUD': '🇦🇺', 'CAD': '🇨🇦',
      'CHF': '🇨🇭', 'CNY': '🇨🇳', 'JPY': '🇯🇵',
    };
    return flags[code] || '💱';
  };
  
  // Handle reset currencies
  const handleResetCurrencies = async () => {
    setIsResetting(true);
    try {
      const result = await resetCurrenciesToDefault();
      if (result.success) {
        await refreshData();
        toast({
          title: 'تم إعادة التعيين',
          description: result.message,
          className: 'bg-emerald-500 text-white',
        });
      } else {
        toast({
          title: 'خطأ',
          description: result.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
    }
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
                              value={
                                isSYPCurrency(currency.id, currency.code)
                                  ? convertInverseExchangeRateForDisplay(currency.exchangeRate, displayVersion)
                                  : currency.exchangeRate
                              }
                              onChange={(e) => {
                                if (isSYPCurrency(currency.id, currency.code)) {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val > 0) {
                                    const storedRate = convertInverseExchangeRateForStorage(val, displayVersion);
                                    handleUpdateExchangeRate(currency.id, String(storedRate));
                                  }
                                } else {
                                  handleUpdateExchangeRate(currency.id, e.target.value);
                                }
                              }}
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
                      <div className="mt-2 pt-2 border-t border-border/30 space-y-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>
                            1 {currency.code} = {isSYPCurrency(currency.id, currency.code)
                              ? <>{formatNumber(convertInverseExchangeRateForDisplay(currency.exchangeRate, displayVersion), 4)} <span className="text-primary/70">({displayVersion === 'NEW' ? 'إصدار جديد' : 'إصدار قديم'})</span></>
                              : formatNumber(currency.exchangeRate, 4)
                            } USD
                          </span>
                        </div>
                        {isSYPCurrency(currency.id, currency.code) && displayVersion === 'NEW' && (
                          <div className="text-[10px] text-muted-foreground/70">
                            بالإصدار القديم: 1 {currency.code} = {formatNumber(currency.exchangeRate, 6)} USD
                          </div>
                        )}
                        
                        {/* Conversion Method Selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">طريقة التحويل:</span>
                          <Select
                            value={currency.conversionMethod || 'MULTIPLY'}
                            onValueChange={(value) => handleUpdateConversionMethod(currency.id, value as 'MULTIPLY' | 'DIVIDE')}
                          >
                            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MULTIPLY">
                                <div className="flex items-center gap-1">
                                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                                  <span>ضرب (×)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="DIVIDE">
                                <div className="flex items-center gap-1">
                                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                                  <span>قسمة (÷)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
                {editingCurrency && isSYPCurrency(editingCurrency, allCurrencies.find(c => c.id === editingCurrency)?.code) && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-2 mb-3">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      سعر الصرف بالإصدار الجديد (ل.س جديد)
                    </p>
                  </div>
                )}
                
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
                
                {/* SYP equivalent old version and warning */}
                {editingCurrency && isSYPCurrency(editingCurrency, allCurrencies.find(c => c.id === editingCurrency)?.code) && (
                  <div className="space-y-2 mb-4">
                    {!isNaN(parseFloat(exchangeRateInput)) && parseFloat(exchangeRateInput) > 0 && (
                      <div className="text-xs text-muted-foreground">
                        ما يعادل بالإصدار القديم: {formatNumber(convertInverseExchangeRateForStorage(parseFloat(exchangeRateInput), 'NEW'), 6)}
                      </div>
                    )}
                    {isLikelyOldVersion(parseFloat(exchangeRateInput)) && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>يبدو أنك أدخلت السعر بالإصدار القديم. يرجى استخدام الإصدار الجديد</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Conversion Method Selector */}
                <div className="mb-4">
                  <label className="text-sm text-muted-foreground mb-2 block">طريقة التحويل إلى الدولار:</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={conversionMethodInput === 'MULTIPLY' ? 'default' : 'outline'}
                      className="flex-1 gap-1"
                      onClick={() => setConversionMethodInput('MULTIPLY')}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>ضرب (×)</span>
                    </Button>
                    <Button
                      type="button"
                      variant={conversionMethodInput === 'DIVIDE' ? 'default' : 'outline'}
                      className="flex-1 gap-1"
                      onClick={() => setConversionMethodInput('DIVIDE')}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      <span>قسمة (÷)</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {conversionMethodInput === 'MULTIPLY' 
                      ? 'القيمة بالدولار = المبلغ × عامل التحويل'
                      : 'القيمة بالدولار = المبلغ ÷ عامل التحويل'}
                  </p>
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
          
          {/* Reset Button */}
          <Button
            variant="outline"
            className="w-full gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/20"
            onClick={() => setShowResetDialog(true)}
          >
            <RotateCcw className="w-4 h-4" />
            إعادة تعيين العملات الافتراضية
          </Button>
        </div>
      </DialogContent>
      
      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              إعادة تعيين العملات
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل تريد إعادة تعيين العملات إلى الإعدادات الافتراضية؟</span>
              <span className="block text-xs text-amber-600 dark:text-amber-400 mt-2">
                سيتم إعادة جميع العملات المحذوفة وإعادة تعيين أسعار الصرف.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetCurrencies}
              disabled={isResetting}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isResetting ? 'جاري إعادة التعيين...' : 'إعادة التعيين'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
