'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useAppStore } from '@/store/app-store';
import { formatCurrency, formatDateTimeAr, getCurrencyName } from '@/lib/api';
import type { Remittance, RemittanceStatus } from '@/lib/types';
import { CheckCircle2, XCircle, Clock, ListChecks } from 'lucide-react';
import { useState } from 'react';

function getStatusConfig(status: RemittanceStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'معلقة',
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      };
    case 'completed':
      return {
        label: 'مكتملة',
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      };
    case 'cancelled':
      return {
        label: 'ملغاة',
        variant: 'destructive' as const,
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
      };
  }
}

export function PendingRemittances() {
  const { remittances, completeRemittance, cancelRemittance } = useAppStore();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'complete' | 'cancel';
    remittance: Remittance | null;
  }>({ open: false, action: 'complete', remittance: null });

  const pendingRemittances = remittances.filter((r) => r.status === 'pending');
  const allRemittances = remittances;

  const handleConfirm = () => {
    if (!confirmDialog.remittance) return;
    if (confirmDialog.action === 'complete') {
      completeRemittance(confirmDialog.remittance.id);
    } else {
      cancelRemittance(confirmDialog.remittance.id);
    }
    setConfirmDialog({ open: false, action: 'complete', remittance: null });
  };

  return (
    <>
      <Card className="shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5 text-emerald-600" />
              الحوالات
            </CardTitle>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {pendingRemittances.length} معلقة
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right font-semibold">الرقم</TableHead>
                  <TableHead className="text-right font-semibold">المرسل</TableHead>
                  <TableHead className="text-right font-semibold">المستلم</TableHead>
                  <TableHead className="text-right font-semibold">الهاتف</TableHead>
                  <TableHead className="text-right font-semibold">المبلغ</TableHead>
                  <TableHead className="text-right font-semibold">الرسوم</TableHead>
                  <TableHead className="text-right font-semibold">الحالة</TableHead>
                  <TableHead className="text-right font-semibold">التاريخ</TableHead>
                  <TableHead className="text-right font-semibold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRemittances.map((rem) => {
                  const statusConfig = getStatusConfig(rem.status);
                  return (
                    <TableRow
                      key={rem.id}
                      className="hover:bg-emerald-50/50 transition-colors"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground" title={rem.id}>
                        {rem.id.length > 8 ? `${rem.id.slice(0, 4)}...${rem.id.slice(-4)}` : rem.id}
                      </TableCell>
                      <TableCell className="font-medium">{rem.senderName}</TableCell>
                      <TableCell>{rem.recipientName}</TableCell>
                      <TableCell className="text-xs" dir="ltr">
                        {rem.recipientPhone}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-700">
                        {formatCurrency(rem.amount, rem.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatCurrency(rem.fee, rem.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusConfig.variant}
                          className={`text-xs ${statusConfig.bg} ${statusConfig.color} border-0`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTimeAr(rem.createdAt)}
                      </TableCell>
                      <TableCell>
                        {rem.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  action: 'complete',
                                  remittance: rem,
                                })
                              }
                              className="hover:bg-emerald-100 h-8 w-8 p-0"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  action: 'cancel',
                                  remittance: rem,
                                })
                              }
                              className="hover:bg-red-100 h-8 w-8 p-0"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'complete'
                ? 'تأكيد إتمام الحوالة'
                : 'تأكيد إلغاء الحوالة'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'complete'
                ? `هل أنت متأكد من إتمام الحوالة رقم ${confirmDialog.remittance?.id}؟`
                : `هل أنت متأكد من إلغاء الحوالة رقم ${confirmDialog.remittance?.id}؟ لا يمكن التراجع عن هذا الإجراء.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmDialog.action === 'complete'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmDialog.action === 'complete' ? 'إتمام' : 'تأكيد الإلغاء'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
