'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLocalData } from '@/hooks/useLocalData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { addCurrencyExchange, Currency, Vault } from '@/lib/localDb';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  isSYPCurrency,
  calculateStoredValue,
  formatSYPDualDisplay,
} from '@/lib/syp-conversion';

export function CurrencyExchangeModal() {
  const { isExchangeModalOpen, closeExchangeModal } = useAppStore();
  const { currencies, vaults, refreshData } = useLocalData();
  const { toast } = useToast();

  // Form state
  const [outgoingCurrencyId, setOutgoingCurrencyId] = useState(''); // العملة المصدر (التي نخرجها)
  const [incomingCurrencyId, setIncomingCurrencyId] = useState(''); // العملة الهدف (التي ندخلها)
  const [incomingAmount, setIncomingAmount] = useState(''); // المبلغ الوارد (الذي نستلمه)
  const [exchangeRate, setExchangeRate] = useState(''); // سعر الصرف اليدوي
  const [rateOperation, setRateOperation] = useState<'MULTIPLY' | 'DIVIDE'>('MULTIPLY'); // طريقة حساب سعر الصرف
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SYP input always uses OLD version (إصدار قديم)
  const incomingSYPVersion = 'OLD' as const;
  const outgoingSYPVersion = 'OLD' as const;

  // Get active currencies
  const activeCurrencies = useMemo(() => {
    return currencies.filter(c => c.isActive);
  }, [currencies]);

  // Get selected currencies
  const outgoingCurrency = useMemo(() => {
    return activeCurrencies.find(c => c.id === outgoingCurrencyId);
  }, [activeCurrencies, outgoingCurrencyId]);

  const incomingCurrency = useMemo(() => {
    return activeCurrencies.find(c => c.id === incomingCurrencyId);
  }, [activeCurrencies, incomingCurrencyId]);

  // SYP checks
  const isIncomingSYP = isSYPCurrency(incomingCurrencyId, incomingCurrency?.code);
  const isOutgoingSYP = isSYPCurrency(outgoingCurrencyId, outgoingCurrency?.code);
  const isSYPInvolved = isIncomingSYP || isOutgoingSYP;

  // Helper: convert input amount to stored value based on SYP version
  const getStoredAmount = (inputAmt: number, isSYP: boolean, version: 'NEW' | 'OLD') => {
    if (isSYP) return calculateStoredValue(inputAmt, version);
    return inputAmt;
  };

  // Get vault balances
  const outgoingVault = useMemo(() => {
    return vaults.find(v => v.currencyId === outgoingCurrencyId);
  }, [vaults, outgoingCurrencyId]);

  // Calculate the internal rate adjustment for SYP
  // المستخدم يدخل سعر الصرف بالإصدار القديم دائماً
  // المخزن بالإصدار القديم أيضاً → لا حاجة للتحويل
  const getInternalRate = (userRate: number) => {
    if (!isSYPInvolved) return userRate;
    // Both are SYP → no adjustment needed (SYP/SYP = 1)
    if (isOutgoingSYP && isIncomingSYP) return userRate;
    // SYP rate entered in OLD version = already in stored format → no conversion needed
    return userRate;
  };

  // Calculate outgoing amount automatically based on operation type
  // All calculations use stored (old) values internally
  const outgoingAmountStored = useMemo(() => {
    const incomingInput = parseFloat(incomingAmount) || 0;
    const rateInput = parseFloat(exchangeRate) || 0;
    if (incomingInput > 0 && rateInput > 0) {
      // Convert incoming amount to stored value
      const incomingStored = getStoredAmount(incomingInput, isIncomingSYP, incomingSYPVersion);
      // Convert rate for internal calculation
      const internalRate = getInternalRate(rateInput);
      if (rateOperation === 'DIVIDE') {
        return incomingStored / internalRate;
      } else {
        return incomingStored * internalRate;
      }
    }
    return 0;
  }, [incomingAmount, exchangeRate, rateOperation, isIncomingSYP, isOutgoingSYP, incomingSYPVersion]);

  // Display version of outgoing amount - always show stored (OLD) value
  const outgoingAmount = outgoingAmountStored;

  // Check if has sufficient balance (compare stored values)
  const hasSufficientBalance = useMemo(() => {
    if (!outgoingVault) return false;
    return outgoingVault.balance >= outgoingAmountStored;
  }, [outgoingVault, outgoingAmountStored]);

  // Reset form when modal opens
  useEffect(() => {
    if (isExchangeModalOpen) {
      setOutgoingCurrencyId('');
      setIncomingCurrencyId('');
      setIncomingAmount('');
      setExchangeRate('');
      setRateOperation('MULTIPLY');
      setDescription('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      // SYP version is always OLD (no state to reset)
    }
  }, [isExchangeModalOpen]);

  // Handle swap currencies
  const handleSwapCurrencies = () => {
    const temp = outgoingCurrencyId;
    setOutgoingCurrencyId(incomingCurrencyId);
    setIncomingCurrencyId(temp);
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (!outgoingCurrencyId || !incomingCurrencyId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار العملتين',
        variant: 'destructive',
      });
      return;
    }

    if (outgoingCurrencyId === incomingCurrencyId) {
      toast({
        title: 'خطأ',
        description: 'لا يمكن أن تكون العملتان متماثلتين',
        variant: 'destructive',
      });
      return;
    }

    const incomingAmt = parseFloat(incomingAmount);
    const rate = parseFloat(exchangeRate);

    if (!incomingAmt || incomingAmt <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ وارد صحيح',
        variant: 'destructive',
      });
      return;
    }

    if (!rate || rate <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال سعر صرف صحيح',
        variant: 'destructive',
      });
      return;
    }

    if (!hasSufficientBalance) {
      toast({
        title: 'خطأ',
        description: 'الرصيد غير كافٍ في الصندوق المصدر',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert to stored values before saving
      const incomingAmtStored = getStoredAmount(incomingAmt, isIncomingSYP, incomingSYPVersion);

      await addCurrencyExchange({
        outgoingCurrencyId,
        incomingCurrencyId,
        outgoingAmount: outgoingAmountStored,
        incomingAmount: incomingAmtStored,
        description: description || undefined,
        date,
      });

      await refreshData();

      // Dispatch event to refresh the page
      window.dispatchEvent(new CustomEvent('exchange-refresh'));

      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة عملية الصرف بنجاح',
        className: 'bg-emerald-500 text-white',
      });

      closeExchangeModal();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إضافة العملية',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isExchangeModalOpen} onOpenChange={closeExchangeModal}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            عملية تصريف عملات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Incoming Currency Section - المبلغ الوارد (الذي نستلمه) */}
          <div className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20 space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <ArrowDownRight className="w-4 h-4" />
              <span className="font-medium text-sm">المبلغ الوارد (الذي تستلمه)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">العملة</Label>
                <Select value={incomingCurrencyId} onValueChange={setIncomingCurrencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCurrencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id} disabled={currency.id === outgoingCurrencyId}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">المبلغ {isIncomingSYP && <span className="text-amber-600">(ل.س قديم)</span>}</Label>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={incomingAmount}
                  onChange={(e) => setIncomingAmount(e.target.value)}
                  className="text-left"
                />
              </div>
            </div>

            {incomingCurrency && (
              <div className="text-xs text-muted-foreground">
                العملة التي تستلمها من العميل
              </div>
            )}
          </div>

          {/* Exchange Rate Input */}
          <div className="p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <RefreshCw className="w-4 h-4" />
              <span className="font-medium text-sm">سعر الصرف</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                {rateOperation === 'MULTIPLY' 
                  ? 'كم وحدة من العملة الصادرة تساوي 1 وحدة من العملة الواردة؟'
                  : 'كم وحدة من العملة الواردة تساوي 1 وحدة من العملة الصادرة؟'}
              </Label>
              <Input
                type="number"
                step="0.0001"
                placeholder="أدخل سعر الصرف..."
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="text-left text-lg font-bold"
              />
              {isSYPInvolved && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  سعر الصرف بالإصدار القديم
                </div>
              )}
              {incomingCurrency && outgoingCurrency && (
                <div className="text-xs text-muted-foreground">
                  {rateOperation === 'MULTIPLY' 
                    ? <>1 {incomingCurrency.symbol} = {exchangeRate || '0'} {outgoingCurrency.symbol}</>
                    : <>{exchangeRate || '0'} {incomingCurrency.symbol} = 1 {outgoingCurrency.symbol}</>}
                </div>
              )}
            </div>
            
            {/* Operation Type Selector */}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground mb-2 block">طريقة الحساب:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={rateOperation === 'MULTIPLY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRateOperation('MULTIPLY')}
                  className={rateOperation === 'MULTIPLY' 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white gap-1' 
                    : 'gap-1'}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>ضرب (×)</span>
                </Button>
                <Button
                  type="button"
                  variant={rateOperation === 'DIVIDE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRateOperation('DIVIDE')}
                  className={rateOperation === 'DIVIDE' 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white gap-1' 
                    : 'gap-1'}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>قسمة (÷)</span>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                {rateOperation === 'MULTIPLY' 
                  ? <>الصادر = الوارد × السعر (<span dir="ltr" className="font-mono">{incomingAmount || '0'} × {exchangeRate || '0'}</span>)</>
                  : <>الصادر = الوارد ÷ السعر (<span dir="ltr" className="font-mono">{incomingAmount || '0'} ÷ {exchangeRate || '0'}</span>)</>}
              </p>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwapCurrencies}
              className="rounded-full h-8 w-8"
              disabled={!outgoingCurrencyId || !incomingCurrencyId}
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Outgoing Currency Section - المبلغ الصادر (الذي ندفعه) */}
          <div className="p-4 rounded-lg border bg-red-50/50 dark:bg-red-950/20 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ArrowUpRight className="w-4 h-4" />
              <span className="font-medium text-sm">المبلغ الصادر (الذي تدفعه) - محسوب تلقائياً</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">العملة</Label>
                <Select value={outgoingCurrencyId} onValueChange={setOutgoingCurrencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCurrencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id} disabled={currency.id === incomingCurrencyId}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">المبلغ (محسوب)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={outgoingAmount > 0 ? outgoingAmount.toFixed(2) : '0.00'}
                    className="text-left font-bold bg-muted/50"
                    disabled
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <Calculator className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {outgoingCurrency && (
              <div className="flex items-center justify-between text-xs">
                {outgoingVault && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    الرصيد: {isOutgoingSYP
                      ? <>{outgoingVault.balance.toFixed(2)} {outgoingCurrency.symbol} <span className="text-[9px] text-muted-foreground">({formatSYPDualDisplay(outgoingVault.balance)})</span></>
                      : <>{outgoingVault.balance.toFixed(2)} {outgoingCurrency.symbol}</>}
                  </span>
                )}
              </div>
            )}

            {!hasSufficientBalance && outgoingAmountStored > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                رصيد غير كافٍ
              </div>
            )}
          </div>

          {/* Calculation Preview */}
          {outgoingAmountStored > 0 && incomingCurrency && outgoingCurrency && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-muted/50 space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calculator className="w-4 h-4 text-primary" />
                ملخص العملية
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">تستلم:</span>
                  <div className="text-left">
                    <span className="font-medium">
                      {isIncomingSYP
                        ? getStoredAmount(parseFloat(incomingAmount) || 0, true, incomingSYPVersion).toFixed(2)
                        : parseFloat(incomingAmount).toFixed(2)} {incomingCurrency.symbol}
                    </span>
                    {isIncomingSYP && (
                      <p className="text-[9px] text-muted-foreground">{formatSYPDualDisplay(getStoredAmount(parseFloat(incomingAmount) || 0, true, incomingSYPVersion))}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">سعر الصرف:</span>
                  <span className="font-medium">{exchangeRate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">تدفع:</span>
                  <div className="text-left">
                    <span className="font-bold text-red-600">
                      {isOutgoingSYP
                        ? outgoingAmountStored.toFixed(2)
                        : outgoingAmountStored.toFixed(2)} {outgoingCurrency.symbol}
                    </span>
                    {isOutgoingSYP && (
                      <p className="text-[9px] text-muted-foreground">{formatSYPDualDisplay(outgoingAmountStored)}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                {rateOperation === 'MULTIPLY' 
                  ? <>العملية = {incomingAmount} × {exchangeRate} = {outgoingAmount.toFixed(2)}</>
                  : <>العملية = {incomingAmount} ÷ {exchangeRate} = {outgoingAmount.toFixed(2)}</>}
              </div>
            </motion.div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">ملاحظات (اختياري)</Label>
            <Textarea
              id="description"
              placeholder="أضف ملاحظات..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeExchangeModal}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasSufficientBalance || outgoingAmountStored <= 0}
            className="bg-primary"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ العملية'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
