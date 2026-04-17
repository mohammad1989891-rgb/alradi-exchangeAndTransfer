'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/app-store';
import { CURRENCIES, formatCurrency, getCurrencyName, formatDateTimeAr } from '@/lib/api';
import type { Transaction } from '@/lib/types';
import { ArrowRightLeft, Calculator, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ExchangeForm() {
  const { exchangeRates, addTransaction, transactions } = useAppStore();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('SYP');
  const [amount, setAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Find matching rate
  const matchingRate = useMemo(() => {
    return exchangeRates.find(
      (r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
    );
  }, [exchangeRates, fromCurrency, toCurrency]);

  // Calculate result
  const calculation = useMemo(() => {
    if (!amount || !matchingRate) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return null;
    const fee = numAmount * 0.001; // 0.1% fee
    const result = numAmount * matchingRate.sellRate;
    return { result, fee, rate: matchingRate.sellRate, netResult: result };
  }, [amount, matchingRate]);

  const recentExchanges = transactions
    .filter((t) => t.type === 'exchange')
    .slice(0, 5);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setAmount('');
  };

  const handleSubmit = () => {
    if (!calculation || !amount) return;
    const tx: Transaction = {
      id: 'T' + Date.now(),
      type: 'exchange',
      fromCurrency,
      toCurrency,
      fromAmount: parseFloat(amount),
      toAmount: calculation.result,
      rate: calculation.rate,
      fee: calculation.fee,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    addTransaction(tx);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setAmount('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Exchange Form */}
      <div className="lg:col-span-2">
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
              تحويل عملات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-4 items-end">
              <div className="space-y-2">
                <Label>من عملة</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.nameAr} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleSwap}
                className="self-end rounded-full border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400"
              >
                <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
              </Button>

              <div className="space-y-2">
                <Label>إلى عملة</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.nameAr} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>المبلغ</Label>
              <Input
                type="number"
                placeholder="أدخل المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold h-12"
                dir="ltr"
              />
            </div>

            {/* Rate info */}
            {matchingRate ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">
                    سعر الصرف الحالي
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-emerald-600">سعر الشراء: </span>
                    <span className="font-bold" dir="ltr">
                      {matchingRate.buyRate.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-600">سعر البيع: </span>
                    <span className="font-bold" dir="ltr">
                      {matchingRate.sellRate.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                لا يوجد سعر صرف متاح لهذا الزوج من العملات. يرجى اختيار زوج آخر.
              </div>
            )}

            {/* Calculation Result */}
            <AnimatePresence>
              {calculation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gradient-to-l from-emerald-600 to-emerald-700 rounded-lg p-5 text-white"
                >
                  <div className="text-center">
                    <p className="text-emerald-200 text-sm mb-1">المبلغ المستلم</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(calculation.netResult, toCurrency)}
                    </p>
                    <Separator className="my-3 bg-emerald-500" />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-emerald-200">الرسوم:</span>
                        <span className="mr-1 font-semibold">
                          {formatCurrency(calculation.fee, fromCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-200">السعر:</span>
                        <span className="mr-1 font-semibold" dir="ltr">
                          {calculation.rate.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 bg-emerald-100 text-emerald-700 p-3 rounded-lg"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">تم التحويل بنجاح!</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleSubmit}
              disabled={!calculation || !amount}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
              size="lg"
            >
              <ArrowRightLeft className="h-5 w-5 ml-2" />
              إتمام التحويل
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exchanges Sidebar */}
      <div>
        <Card className="shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">آخر التحويلات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentExchanges.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                لا توجد تحويلات سابقة
              </p>
            ) : (
              recentExchanges.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-muted/50 rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {getCurrencyName(tx.fromCurrency)} ← {getCurrencyName(tx.toCurrency)}
                    </span>
                    <Badge
                      variant={tx.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {tx.status === 'completed' ? 'مكتمل' : 'معلق'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(tx.fromAmount, tx.fromCurrency)}</span>
                    <span>→</span>
                    <span className="font-semibold text-emerald-700">
                      {formatCurrency(tx.toAmount, tx.toCurrency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTimeAr(tx.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
