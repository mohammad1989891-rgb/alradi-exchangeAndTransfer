'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/app-store';
import type { Customer } from '@/lib/types';
import { UserPlus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CustomerForm() {
  const { addCustomer } = useAppStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    idNumber: '',
    address: '',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.idNumber) return;

    const customer: Customer = {
      id: 'C' + Date.now(),
      name: form.name,
      phone: form.phone,
      idNumber: form.idNumber,
      address: form.address || undefined,
      notes: form.notes || undefined,
      totalTransactions: 0,
      totalAmount: 0,
      createdAt: new Date().toISOString(),
    };

    addCustomer(customer);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setForm({ name: '', phone: '', idNumber: '', address: '', notes: '' });
  };

  const isFormValid = form.name && form.phone && form.idNumber;

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5 text-emerald-600" />
          إضافة عميل جديد
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>الاسم الكامل *</Label>
            <Input
              placeholder="أدخل اسم العميل"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>رقم الهاتف *</Label>
            <Input
              placeholder="+963-XXX-XXX-XXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>رقم الهوية *</Label>
          <Input
            placeholder="أدخل رقم الهوية"
            value={form.idNumber}
            onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label>العنوان</Label>
          <Input
            placeholder="المدينة - الحي"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>ملاحظات</Label>
          <Textarea
            placeholder="أضف ملاحظات عن العميل (اختياري)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 bg-emerald-100 text-emerald-700 p-3 rounded-lg"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">تم إضافة العميل بنجاح!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
        >
          <UserPlus className="h-4 w-4 ml-2" />
          إضافة العميل
        </Button>
      </CardContent>
    </Card>
  );
}
