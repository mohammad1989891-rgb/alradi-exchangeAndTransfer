'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { VehicleDetailsModal } from './VehicleDetailsModal';
import { VehicleTransactionModal } from './VehicleTransactionModal';
import { SharedTransactionsModal } from './SharedTransactionsModal';

// Vehicle type for local state
interface VehicleCard {
  id: string;
  name: string;
  firstPartnerTotal: number;
  secondPartnerTotal: number;
  totalCost: number;
  createdAt: Date;
}

export function VehiclesPage() {
  // State for partner names (editable)
  const [firstPartnerName, setFirstPartnerName] = useState('الشريك الأول');
  const [secondPartnerName, setSecondPartnerName] = useState('الشريك الثاني');
  const [isEditingFirstPartner, setIsEditingFirstPartner] = useState(false);
  const [isEditingSecondPartner, setIsEditingSecondPartner] = useState(false);
  const [tempFirstName, setTempFirstName] = useState('');
  const [tempSecondName, setTempSecondName] = useState('');

  // State for vehicles list
  const [vehicles, setVehicles] = useState<VehicleCard[]>([]);

  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCard | null>(null);

  // ============================================
  // 🔹 حسابات تلقائية للبطاقة الرئيسية
  // 🔹 المعادلة: إجمالي الرصيد = الشريك الأول - الشريك الثاني
  // 🔹 موجب = لنا | سالب = علينا
  // ============================================
  const calculatedTotals = useMemo(() => {
    const firstPartnerTotal = vehicles.reduce((sum, v) => sum + v.firstPartnerTotal, 0);
    const secondPartnerTotal = vehicles.reduce((sum, v) => sum + v.secondPartnerTotal, 0);
    const totalBalance = firstPartnerTotal - secondPartnerTotal; // الشريك الأول - الشريك الثاني
    return { firstPartnerTotal, secondPartnerTotal, totalBalance };
  }, [vehicles]);

  const { totalBalance, firstPartnerTotal, secondPartnerTotal } = calculatedTotals;

  // Generate unique ID
  const generateId = () => 'vehicle_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

  // Add new vehicle handler
  const handleAddVehicle = () => {
    const newVehicle: VehicleCard = {
      id: generateId(),
      name: `مركبة ${vehicles.length + 1}`,
      firstPartnerTotal: 0,
      secondPartnerTotal: 0,
      totalCost: 0,
      createdAt: new Date(),
    };
    setVehicles([...vehicles, newVehicle]);
  };

  // Open vehicle details
  const handleVehicleClick = (vehicle: VehicleCard) => {
    setSelectedVehicle(vehicle);
    setIsDetailsModalOpen(true);
  };

  // Open transaction modal from details modal
  const handleOpenTransactionModal = () => {
    setIsTransactionModalOpen(true);
  };

  // Close all modals
  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
  };

  // Open shared transactions modal
  const handleOpenSharedModal = () => {
    setIsSharedModalOpen(true);
  };

  // Close shared transactions modal
  const handleCloseSharedModal = () => {
    setIsSharedModalOpen(false);
  };

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
    <>
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
            onClick={handleAddVehicle}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مركبة</span>
          </Button>
        </div>

        {/* Main Summary Card - Clickable */}
        <Card 
          className="border-2 border-primary/20 shadow-lg cursor-pointer hover:border-primary/50 hover:shadow-xl transition-all"
          onClick={handleOpenSharedModal}
        >
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
              {/* Status Label: لنا / علينا */}
              <div className={cn(
                "inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium",
                totalBalance >= 0 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}>
                {totalBalance >= 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    <span>لنا</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    <span>علينا</span>
                  </>
                )}
              </div>
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

        {/* Divider between main card and vehicle cards */}
        {vehicles.length > 0 && (
          <div className="flex items-center gap-4 py-2">
            <Separator className="flex-1" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span className="text-sm font-medium">المركبات ({vehicles.length})</span>
            </div>
            <Separator className="flex-1" />
          </div>
        )}

        {/* Vehicle Cards */}
        <AnimatePresence>
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleVehicleClick(vehicle)}
              className="cursor-pointer"
            >
              <Card className="border border-border hover:border-cyan-500/50 hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  {/* Vehicle Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Truck className="w-5 h-5 text-cyan-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{vehicle.name}</h3>
                  </div>

                  {/* Vehicle Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* First Partner Total */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{firstPartnerName}</p>
                      <p className="text-lg font-bold text-emerald-500">
                        {vehicle.firstPartnerTotal.toLocaleString('ar-SA')}
                      </p>
                    </div>

                    {/* Second Partner Total */}
                    <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{secondPartnerName}</p>
                      <p className="text-lg font-bold text-orange-500">
                        {vehicle.secondPartnerTotal.toLocaleString('ar-SA')}
                      </p>
                    </div>

                    {/* Total Cost = First + Second */}
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1">التكلفة الإجمالية</p>
                      <p className="text-lg font-bold text-primary">
                        {(vehicle.firstPartnerTotal + vehicle.secondPartnerTotal).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">لا توجد مركبات حالياً</p>
            <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة مركبة" لبدء الإضافة</p>
          </div>
        )}
      </div>

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        onAddTransaction={handleOpenTransactionModal}
        vehicle={selectedVehicle}
        firstPartnerName={firstPartnerName}
        secondPartnerName={secondPartnerName}
      />

      {/* Vehicle Transaction Modal */}
      <VehicleTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        vehicle={selectedVehicle}
        firstPartnerName={firstPartnerName}
        secondPartnerName={secondPartnerName}
      />

      {/* Shared Transactions Modal */}
      <SharedTransactionsModal
        isOpen={isSharedModalOpen}
        onClose={handleCloseSharedModal}
        firstPartnerName={firstPartnerName}
        secondPartnerName={secondPartnerName}
        firstPartnerTotal={firstPartnerTotal}
        secondPartnerTotal={secondPartnerTotal}
        totalBalance={totalBalance}
      />
    </>
  );
}
