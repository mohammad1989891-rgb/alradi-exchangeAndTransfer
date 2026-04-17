'use client';

import {
  formatCurrency,
  getTransactionTypeLabel,
  getStatusLabel,
  formatDateTimeAr,
  CURRENCIES,
} from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer, X, Receipt } from 'lucide-react';
import { useCallback } from 'react';

interface ReceiptPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    type: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    rate: number;
    fee: number;
    status: string;
    customerName?: string;
    recipientName?: string;
    createdAt: string;
  } | null;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'cancelled':
      return 'bg-red-50 text-red-600 border-red-200';
    case 'failed':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500';
    case 'pending':
      return 'bg-amber-500';
    case 'cancelled':
      return 'bg-red-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case 'exchange':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'remittance':
    case 'transfer':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'deposit':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'withdrawal':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getCurrencyFlag(code: string): string {
  const curr = CURRENCIES.find((c) => c.code === code);
  return curr?.flag || '';
}

export function ReceiptPrint({ open, onOpenChange, transaction }: ReceiptPrintProps) {
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!transaction) return null;

  const fromCurr = CURRENCIES.find((c) => c.code === transaction.fromCurrency);
  const toCurr = CURRENCIES.find((c) => c.code === transaction.toCurrency);

  return (
    <>
      {/* Print-specific styles injected via style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-receipt,
          .print-receipt * {
            visibility: visible !important;
          }
          .print-receipt {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 400px !important;
            margin: 0 auto !important;
            padding: 24px !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 99999 !important;
          }
          .print-receipt .no-print {
            display: none !important;
          }
          .print-receipt .receipt-content {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="print-receipt sm:max-w-md p-0 overflow-hidden gap-0"
          showCloseButton={false}
        >
          {/* Receipt Content */}
          <div className="receipt-content bg-white">
            {/* Header - Company branding */}
            <div className="bg-gradient-to-l from-emerald-700 via-emerald-600 to-emerald-700 text-white px-6 py-5 relative overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-2 left-4 w-16 h-16 border border-white rounded-full" />
                <div className="absolute bottom-1 right-8 w-10 h-10 border border-white rounded-full" />
              </div>

              <div className="relative flex items-center gap-3">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-1.5 ring-1 ring-white/20">
                  <img
                    src="/logo.png"
                    alt="الراضي"
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight leading-tight">
                    الراضي للصرافة والحوالات
                  </h2>
                  <p className="text-emerald-200/70 text-xs mt-0.5 font-light">
                    Al-Radhi Exchange & Remittances
                  </p>
                </div>
              </div>
            </div>

            {/* Gold accent line */}
            <div className="h-1 bg-gradient-to-l from-amber-500/60 via-amber-400 to-amber-500/60" />

            {/* Receipt body */}
            <div className="px-6 py-4 space-y-4">
              {/* Receipt number & Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">
                    إيصال رقم
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {transaction.id}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>التاريخ والوقت</span>
                <span className="font-medium text-gray-700">
                  {formatDateTimeAr(transaction.createdAt)}
                </span>
              </div>

              <Separator className="bg-gray-100" />

              {/* Transaction Type */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">نوع المعاملة</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${getTypeBadgeStyle(transaction.type)}`}
                >
                  {getTransactionTypeLabel(transaction.type)}
                </span>
              </div>

              <Separator className="bg-gray-100" />

              {/* Transaction Details */}
              <div className="space-y-3">
                {/* From */}
                <div className="bg-gray-50/80 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">من (العملة)</span>
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <span>{getCurrencyFlag(transaction.fromCurrency)}</span>
                      {fromCurr?.nameAr || transaction.fromCurrency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">المبلغ</span>
                    <span className="text-base font-bold text-gray-900">
                      {formatCurrency(transaction.fromAmount, transaction.fromCurrency)}
                    </span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="flex justify-center">
                  <div className="bg-emerald-100 text-emerald-600 rounded-full p-1.5">
                    <svg
                      className="h-4 w-4 rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </div>

                {/* To */}
                <div className="bg-emerald-50/60 rounded-lg p-3 space-y-1.5 border border-emerald-100/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">إلى (العملة)</span>
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <span>{getCurrencyFlag(transaction.toCurrency)}</span>
                      {toCurr?.nameAr || transaction.toCurrency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">المبلغ</span>
                    <span className="text-base font-bold text-emerald-700">
                      {formatCurrency(transaction.toAmount, transaction.toCurrency)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-100" />

              {/* Rate, Fee, Status row */}
              <div className="grid grid-cols-3 gap-3">
                {/* Exchange Rate */}
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-gray-400 block">سعر الصرف</span>
                  <span className="text-sm font-bold text-gray-800 block">
                    {transaction.rate.toLocaleString('ar-SA')}
                  </span>
                </div>
                {/* Fee */}
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-gray-400 block">الرسوم</span>
                  <span className="text-sm font-bold text-amber-600 block">
                    {transaction.fee === 0
                      ? 'مجاني'
                      : formatCurrency(transaction.fee, transaction.fromCurrency)}
                  </span>
                </div>
                {/* Status */}
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-gray-400 block">الحالة</span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusStyle(transaction.status)}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${getStatusDot(transaction.status)}`}
                    />
                    {getStatusLabel(transaction.status)}
                  </span>
                </div>
              </div>

              <Separator className="bg-gray-100" />

              {/* Customer Info */}
              <div className="space-y-2">
                {transaction.customerName && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">اسم العميل</span>
                    <span className="font-medium text-gray-800">
                      {transaction.customerName}
                    </span>
                  </div>
                )}
                {transaction.recipientName && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">اسم المستلم</span>
                    <span className="font-medium text-gray-800">
                      {transaction.recipientName}
                    </span>
                  </div>
                )}
                {!transaction.customerName && !transaction.recipientName && (
                  <div className="text-center text-xs text-gray-400 py-1">
                    لا توجد معلومات عميل
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50/50 border-t border-gray-100">
              <div className="px-6 py-4 text-center space-y-2">
                {/* Thank you message */}
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-l from-amber-400/50 to-transparent" />
                  <span className="text-sm font-semibold text-emerald-700">
                    شكراً لتعاملكم معنا
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
                </div>

                {/* Contact info */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
                  <span dir="ltr">+963-11-123-4567</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span>دمشق - سوريا</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span>الراضي للصرافة والحوالات</span>
                </div>
              </div>

              {/* Bottom emerald stripe */}
              <div className="h-1.5 bg-gradient-to-l from-emerald-700 via-emerald-500 to-emerald-700" />
            </div>
          </div>

          {/* Action buttons - hidden in print */}
          <div className="no-print bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1.5 text-gray-600 hover:text-gray-800"
            >
              <X className="h-3.5 w-3.5" />
              إغلاق
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة الإيصال
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
