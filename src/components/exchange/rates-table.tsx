'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/app-store';
import { getCurrencyName, formatDateTimeAr } from '@/lib/api';
import { RefreshCw, Plus, Pencil, TrendingUp } from 'lucide-react';

export function RatesTable() {
  const { exchangeRates, updateExchangeRate, addExchangeRate } = useAppStore();
  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<{ id: string; buyRate: string; sellRate: string }>({
    id: '',
    buyRate: '',
    sellRate: '',
  });
  const [newRate, setNewRate] = useState({
    fromCurrency: 'USD',
    toCurrency: 'SYP',
    buyRate: '',
    sellRate: '',
  });

  const handleEdit = (id: string, buyRate: number, sellRate: number) => {
    setEditingRate({
      id,
      buyRate: buyRate.toString(),
      sellRate: sellRate.toString(),
    });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    updateExchangeRate(editingRate.id, {
      buyRate: parseFloat(editingRate.buyRate),
      sellRate: parseFloat(editingRate.sellRate),
    });
    setEditDialog(false);
  };

  const handleAddRate = () => {
    addExchangeRate({
      id: Date.now().toString(),
      fromCurrency: newRate.fromCurrency,
      toCurrency: newRate.toCurrency,
      buyRate: parseFloat(newRate.buyRate),
      sellRate: parseFloat(newRate.sellRate),
      lastUpdated: new Date().toISOString(),
    });
    setAddDialog(false);
    setNewRate({ fromCurrency: 'USD', toCurrency: 'SYP', buyRate: '', sellRate: '' });
  };

  return (
    <>
      <Card className="shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              أسعار الصرف
            </CardTitle>
            <Button
              onClick={() => setAddDialog(true)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 ml-1" />
              إضافة سعر
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-semibold">من عملة</TableHead>
                  <TableHead className="text-right font-semibold">إلى عملة</TableHead>
                  <TableHead className="text-right font-semibold">سعر الشراء</TableHead>
                  <TableHead className="text-right font-semibold">سعر البيع</TableHead>
                  <TableHead className="text-right font-semibold">الفرق</TableHead>
                  <TableHead className="text-right font-semibold">آخر تحديث</TableHead>
                  <TableHead className="text-right font-semibold">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeRates.map((rate) => {
                  const spread = rate.sellRate - rate.buyRate;
                  return (
                    <TableRow key={rate.id} className="hover:bg-emerald-50/50 transition-colors">
                      <TableCell>
                        <span className="font-medium">
                          {getCurrencyName(rate.fromCurrency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {getCurrencyName(rate.toCurrency)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-emerald-700">
                        {rate.buyRate.toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-amber-700">
                        {rate.sellRate.toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 text-xs"
                        >
                          {spread.toLocaleString('ar-SA')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTimeAr(rate.lastUpdated)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate.id, rate.buyRate, rate.sellRate)}
                          className="hover:bg-emerald-100"
                        >
                          <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Rate Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-600" />
              تحديث سعر الصرف
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سعر الشراء</Label>
              <Input
                type="number"
                value={editingRate.buyRate}
                onChange={(e) =>
                  setEditingRate({ ...editingRate, buyRate: e.target.value })
                }
                className="text-left"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>سعر البيع</Label>
              <Input
                type="number"
                value={editingRate.sellRate}
                onChange={(e) =>
                  setEditingRate({ ...editingRate, sellRate: e.target.value })
                }
                className="text-left"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rate Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              إضافة سعر صرف جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>من عملة</Label>
                <Input
                  value={newRate.fromCurrency}
                  onChange={(e) =>
                    setNewRate({ ...newRate, fromCurrency: e.target.value })
                  }
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>إلى عملة</Label>
                <Input
                  value={newRate.toCurrency}
                  onChange={(e) =>
                    setNewRate({ ...newRate, toCurrency: e.target.value })
                  }
                  className="text-left"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>سعر الشراء</Label>
                <Input
                  type="number"
                  value={newRate.buyRate}
                  onChange={(e) =>
                    setNewRate({ ...newRate, buyRate: e.target.value })
                  }
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>سعر البيع</Label>
                <Input
                  type="number"
                  value={newRate.sellRate}
                  onChange={(e) =>
                    setNewRate({ ...newRate, sellRate: e.target.value })
                  }
                  className="text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddRate}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
