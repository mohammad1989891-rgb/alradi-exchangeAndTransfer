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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/app-store';
import {
  formatCurrency,
  formatDateAr,
  getTransactionTypeLabel,
  getStatusLabel,
} from '@/lib/api';
import type { Customer, Transaction } from '@/lib/types';
import { Users, Search, Eye } from 'lucide-react';

export function CustomerList() {
  const { customers, transactions } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.includes(searchQuery) ||
      c.phone.includes(searchQuery) ||
      c.idNumber.includes(searchQuery) ||
      (c.address && c.address.includes(searchQuery))
  );

  const customerTransactions: Transaction[] = selectedCustomer
    ? transactions.filter((t) => t.customerName === selectedCustomer.name)
    : [];

  return (
    <>
      <Card className="shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-emerald-600" />
              العملاء
              <Badge variant="secondary" className="mr-2 bg-emerald-100 text-emerald-700">
                {customers.length}
              </Badge>
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، الهاتف، رقم الهوية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-semibold">الاسم</TableHead>
                  <TableHead className="text-right font-semibold">الهاتف</TableHead>
                  <TableHead className="text-right font-semibold">رقم الهوية</TableHead>
                  <TableHead className="text-right font-semibold">العنوان</TableHead>
                  <TableHead className="text-right font-semibold">المعاملات</TableHead>
                  <TableHead className="text-right font-semibold">الإجمالي</TableHead>
                  <TableHead className="text-right font-semibold">تاريخ التسجيل</TableHead>
                  <TableHead className="text-right font-semibold">عرض</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="hover:bg-emerald-50/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      {customer.name}
                      {customer.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {customer.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm" dir="ltr">
                      {customer.phone}
                    </TableCell>
                    <TableCell className="font-mono text-sm" dir="ltr">
                      {customer.idNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.address || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {customer.totalTransactions}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(customer.totalAmount, 'USD')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateAr(customer.createdAt)}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="hover:bg-emerald-100 rounded-full p-1.5 transition-colors"
                      >
                        <Eye className="h-4 w-4 text-emerald-600" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">الهاتف:</span>
                  <p className="font-medium" dir="ltr">
                    {selectedCustomer.phone}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">رقم الهوية:</span>
                  <p className="font-medium" dir="ltr">
                    {selectedCustomer.idNumber}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">العنوان:</span>
                  <p className="font-medium">{selectedCustomer.address || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">تاريخ التسجيل:</span>
                  <p className="font-medium">{formatDateAr(selectedCustomer.createdAt)}</p>
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h4 className="font-semibold mb-3 text-sm">
                  سجل المعاملات ({customerTransactions.length})
                </h4>
                {customerTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    لا توجد معاملات سابقة
                  </p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {customerTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-muted/30 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {getTransactionTypeLabel(tx.type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(tx.fromAmount, tx.fromCurrency)} →{' '}
                              {formatCurrency(tx.toAmount, tx.toCurrency)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              tx.status === 'completed' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {getStatusLabel(tx.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
