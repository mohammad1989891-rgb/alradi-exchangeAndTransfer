'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, 
  Plus, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Scale,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function VehiclesPage() {
  // State for partner names (editable)
  const [firstPartnerName, setFirstPartnerName] = useState('الشريك الأول');
  const [secondPartnerName, setSecondPartnerName] = useState('الشريك الثاني');
  const [isEditingFirstPartner, setIsEditingFirstPartner] = useState(false);
  const [isEditingSecondPartner, setIsEditingSecondPartner] = useState(false);
  const [tempFirstName, setTempFirstName] = useState('');
  const [tempSecondName, setTempSecondName] = useState('');

  // Placeholder values (no accounting logic yet)
  const totalBalance = 0;
  const firstPartnerTotal = 0;
  const secondPartnerTotal = 0;

  // Edit partner name handlers
  const handleEditFirstPartner = () => {
    setTempFirstName(firstPartnerName);
    setIsEditingFirstPartner(true);
  };

  const handleEditSecondPartner = () => {
    setTempSecondName(secondPartnerName);
    setIsEditingSecondPartner(true);
  };

  const handleSaveFirstPartner = () => {
    if (tempFirstName.trim()) {
      setFirstPartnerName(tempFirstName.trim());
    }
    setIsEditingFirstPartner(false);
  };

  const handleSaveSecondPartner = () => {
    if (tempSecondName.trim()) {
      setSecondPartnerName(tempSecondName.trim());
    }
    setIsEditingSecondPartner(false);
  };

  const handleCancelFirstPartner = () => {
    setIsEditingFirstPartner(false);
  };

  const handleCancelSecondPartner = () => {
    setIsEditingSecondPartner(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">المركبات</h1>
            <p className="text-xs text-muted-foreground">إدارة شراكات المركبات</p>
          </div>
        </div>
        
        <Button 
          className="gap-2 bg-primary hover:bg-primary/90"
          onClick={() => {
            // Add vehicle logic will be implemented later
          }}
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مركبة</span>
        </Button>
      </div>

      {/* Main Summary Card */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="w-5 h-5 text-primary" />
            ملخص الشراكة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Balance */}
          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">إجمالي الرصيد</p>
            <p className={cn(
              "text-4xl font-bold",
              totalBalance >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {totalBalance.toLocaleString('ar-SA')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
          </div>

          {/* Partner Names Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* First Partner */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">اسم الشريك الأول</Label>
                {!isEditingFirstPartner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleEditFirstPartner}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {isEditingFirstPartner ? (
                <div className="flex gap-2">
                  <Input
                    value={tempFirstName}
                    onChange={(e) => setTempFirstName(e.target.value)}
                    className="text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-emerald-500"
                    onClick={handleSaveFirstPartner}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500"
                    onClick={handleCancelFirstPartner}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground">{firstPartnerName}</p>
                </div>
              )}
            </div>

            {/* Second Partner */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">اسم الشريك الثاني</Label>
                {!isEditingSecondPartner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleEditSecondPartner}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {isEditingSecondPartner ? (
                <div className="flex gap-2">
                  <Input
                    value={tempSecondName}
                    onChange={(e) => setTempSecondName(e.target.value)}
                    className="text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-emerald-500"
                    onClick={handleSaveSecondPartner}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500"
                    onClick={handleCancelSecondPartner}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground">{secondPartnerName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Partners Totals */}
          <div className="grid grid-cols-2 gap-4">
            {/* First Partner Total */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">مجموع {firstPartnerName}</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">
                {firstPartnerTotal.toLocaleString('ar-SA')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
            </motion.div>

            {/* Second Partner Total */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">مجموع {secondPartnerName}</span>
              </div>
              <p className="text-2xl font-bold text-orange-500">
                {secondPartnerTotal.toLocaleString('ar-SA')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">دولار أمريكي</p>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles List Placeholder */}
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
          <Car className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">لا توجد مركبات حالياً</p>
        <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة مركبة" لبدء الإضافة</p>
      </div>
    </div>
  );
}
