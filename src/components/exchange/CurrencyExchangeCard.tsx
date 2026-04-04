'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Trash2,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { CurrencyExchange, Currency } from '@/lib/localDb';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CurrencyExchangeCardProps {
  exchange: CurrencyExchange;
  currencies: Currency[];
  onDelete: (id: string) => void;
}

export function CurrencyExchangeCard({ exchange, currencies, onDelete }: CurrencyExchangeCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Find currencies
  const outgoingCurrency = currencies.find(c => c.id === exchange.outgoingCurrencyId);
  const incomingCurrency = currencies.find(c => c.id === exchange.incomingCurrencyId);

  // Determine profit/loss
  const isProfit = exchange.profit >= 0;

  // Format date
  const formattedDate = format(new Date(exchange.date), 'EEEE dd/MM/yyyy', { locale: ar });
  const formattedTime = format(new Date(exchange.createdAt), 'HH:mm', { locale: ar });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="relative"
      >
        <Card className={`overflow-hidden border-r-4 ${
          isProfit ? 'border-r-green-500' : 'border-r-red-500'
        }`}>
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={isProfit ? 'default' : 'destructive'} className="text-xs">
                      {isProfit ? 'ربح' : 'خسارة'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formattedTime}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{formattedDate}</p>
                </div>

                <div className="text-left">
                  <span className={`text-lg font-bold ${
                    isProfit ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isProfit ? '+' : ''}{exchange.profit.toFixed(2)} $
                  </span>
                  <p className="text-xs text-muted-foreground">صافي</p>
                </div>
              </div>
            </div>

            {/* Exchange Details */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2">
                {/* Outgoing */}
                <div className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <div className="flex items-center gap-1 text-red-600 mb-1">
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="text-xs font-medium">صادر</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">
                      {exchange.outgoingAmount.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {outgoingCurrency?.symbol || '?'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {outgoingCurrency?.name || 'غير معروف'}
                  </p>
                </div>

                {/* Arrow */}
                <div className={`p-1.5 rounded-full ${
                  isProfit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {isProfit ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>

                {/* Incoming */}
                <div className="flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <div className="flex items-center gap-1 text-green-600 mb-1">
                    <ArrowDownRight className="w-3 h-3" />
                    <span className="text-xs font-medium">وارد</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">
                      {exchange.incomingAmount.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {incomingCurrency?.symbol || '?'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {incomingCurrency?.name || 'غير معروف'}
                  </p>
                </div>
              </div>
            </div>

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full px-4 py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors border-t"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  إخفاء التفاصيل
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  عرض التفاصيل
                </>
              )}
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 space-y-3 bg-muted/30">
                    {/* Snapshot Info */}
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Info className="w-3 h-3" />
                      <span>Snapshot - القيم محفوظة وقت العملية</span>
                    </div>

                    {/* USD Values */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 rounded bg-white dark:bg-gray-800">
                        <span className="text-xs text-muted-foreground block">الصادر (USD)</span>
                        <span className="font-medium">{exchange.outgoingUsd.toFixed(4)} $</span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-gray-800">
                        <span className="text-xs text-muted-foreground block">الوارد (USD)</span>
                        <span className="font-medium">{exchange.incomingUsd.toFixed(4)} $</span>
                      </div>
                    </div>

                    {/* Exchange Rates at Time */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        أسعار الصرف وقت العملية:
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2 rounded bg-white dark:bg-gray-800">
                          <span className="text-muted-foreground">{outgoingCurrency?.symbol}:</span>
                          <span className="mr-1 font-medium">{exchange.outgoingRateAtTime}</span>
                          <span className="text-muted-foreground">
                            ({exchange.outgoingConversionMethod === 'MULTIPLY' ? '×' : '÷'})
                          </span>
                        </div>
                        <div className="p-2 rounded bg-white dark:bg-gray-800">
                          <span className="text-muted-foreground">{incomingCurrency?.symbol}:</span>
                          <span className="mr-1 font-medium">{exchange.incomingRateAtTime}</span>
                          <span className="text-muted-foreground">
                            ({exchange.incomingConversionMethod === 'MULTIPLY' ? '×' : '÷'})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {exchange.description && (
                      <div className="p-2 rounded bg-white dark:bg-gray-800">
                        <span className="text-xs text-muted-foreground block mb-1">ملاحظات:</span>
                        <p className="text-sm">{exchange.description}</p>
                      </div>
                    )}

                    {/* Delete Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        حذف العملية
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عملية الصرف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه العملية؟
              <br />
              <span className="text-xs text-muted-foreground">
                سيتم عكس تأثير العملية على أرصدة الصناديق.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                onDelete(exchange.id);
                setShowDeleteDialog(false);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
