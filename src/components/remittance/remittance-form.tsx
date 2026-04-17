'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAppStore } from '@/store/app-store';
import { CURRENCIES } from '@/lib/api';
import type { Remittance } from '@/lib/types';
import { Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function RemittanceForm() {
  const { addRemittance } = useAppStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({
    senderName: '',
    recipientName: '',
    recipientPhone: '',
    amount: '',
    currency: 'USD',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.senderName || !form.recipientName || !form.amount) return;

    const remittance: Remittance = {
      id: 'R' + Date.now(),
      senderName: form.senderName,
      recipientName: form.recipientName,
      recipientPhone: form.recipientPhone,
      amount: parseFloat(form.amount),
      currency: form.currency,
      fee: parseFloat(form.amount) * 0.02, // 2% fee
      status: 'pending',
      notes: form.notes,
      createdAt: new Date().toISOString(),
    };

    addRemittance(remittance);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setForm({
      senderName: '',
      recipientName: '',
      recipientPhone: '',
      amount: '',
      currency: 'USD',
      notes: '',
    });
  };

  const isFormValid = form.senderName && form.recipientName && form.amount;

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-emerald-600" />
          إرسال حوالة جديدة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>اسم المرسل *</Label>
            <Input
              placeholder="أدخل اسم المرسل"
              value={form.senderName}
              onChange={(e) => setForm({ ...form, senderName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>اسم المستلم *</Label>
            <Input
              placeholder="أدخل اسم المستلم"
              value={form.recipientName}
              onChange={(e) =>
                setForm({ ...form, recipientName: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>هاتف المستلم</Label>
            <Input
              placeholder="+963-XXX-XXX-XXX"
              value={form.recipientPhone}
              onChange={(e) =>
                setForm({ ...form, recipientPhone: e.target.value })
              }
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>العملة</Label>
            <Select
              value={form.currency}
              onValueChange={(v) => setForm({ ...form, currency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.filter(
                  (c) => !['SYP', 'LBP'].includes(c.code)
                ).map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.nameAr} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>المبلغ *</Label>
          <Input
            type="number"
            placeholder="أدخل المبلغ"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="text-lg font-semibold h-12"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label>ملاحظات</Label>
          <Textarea
            placeholder="أضف ملاحظات (اختياري)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
        </div>

        {/* Fee Preview */}
        {form.amount && parseFloat(form.amount) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-amber-700">الرسوم (2%):</span>
              <span className="font-semibold text-amber-800" dir="ltr">
                {(parseFloat(form.amount) * 0.02).toFixed(2)} {form.currency}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-amber-700">الإجمالي:</span>
              <span className="font-bold text-amber-900" dir="ltr">
                {(parseFloat(form.amount) * 1.02).toFixed(2)} {form.currency}
              </span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 bg-emerald-100 text-emerald-700 p-3 rounded-lg"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">تم إنشاء الحوالة بنجاح!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
          size="lg"
        >
          <Send className="h-5 w-5 ml-2" />
          إرسال الحوالة
        </Button>
      </CardContent>
    </Card>
  );
}
