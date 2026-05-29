'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  Settings,
  Moon,
  Sun,
  Palette,
  Currency,
  Database,
  ChevronLeft,
  Plus,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  FileJson,
  Merge,
  Replace,
  Lock,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { exportAllData, importAllData, clearAllData, changePassword, changeUsername, getUsers, addCustomCurrency, deleteCurrencyFromDb } from '@/lib/supabaseDb';
import type { Currency as CurrencyType } from '@/types';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currencies, setCurrencies, vaults, accounts, transactions, debts } = useAppStore();
  const { refreshData: refreshLocalData } = useSupabaseData();
  const { toast } = useToast();
  
  const [expandedSection, setExpandedSection] = useState<string | null>('appearance');
  const [isAddCurrencyOpen, setIsAddCurrencyOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });
  const [deleteCurrency, setDeleteCurrency] = useState<CurrencyType | null>(null);
  
  // Backup & Restore
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);

  // Load current username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('currentUsername');
    if (savedUsername) {
      setCurrentUsername(savedUsername);
    }
  }, []);

  // Statistics
  const stats = {
    currencies: currencies.length,
    vaults: vaults.length,
    accounts: accounts.length,
    transactions: transactions.length,
    debts: debts.length,
  };

  // Add Currency (بدون إنترنت - يستخدم قاعدة البيانات المحلية)
  const handleAddCurrency = async () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) return;

    try {
      const result = await addCustomCurrency({
        code: newCurrency.code,
        name: newCurrency.name,
        symbol: newCurrency.symbol,
      });

      // 🔸 تحديث الحالة محلياً
      setCurrencies([...currencies, result]);
      setNewCurrency({ code: '', name: '', symbol: '' });
      setIsAddCurrencyOpen(false);
      
      // 🔸 إعادة تحميل البيانات من قاعدة البيانات المحلية
      await refreshLocalData();
      
      toast({
        title: 'تمت الإضافة',
        description: `تمت إضافة عملة ${result.name} بنجاح`,
      });
    } catch (error) {
      console.error('Error adding currency:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إضافة العملة',
        variant: 'destructive',
      });
    }
  };

  // Delete Currency (بدون إنترنت - يستخدم قاعدة البيانات المحلية)
  const handleDeleteCurrency = async () => {
    if (!deleteCurrency) return;

    try {
      await deleteCurrencyFromDb(deleteCurrency.id);
      setCurrencies(currencies.filter(c => c.id !== deleteCurrency.id));
      setDeleteCurrency(null);
      
      // 🔸 إعادة تحميل البيانات من قاعدة البيانات المحلية
      await refreshLocalData();
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف العملة بنجاح',
      });
    } catch (error) {
      console.error('Error deleting currency:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء حذف العملة',
        variant: 'destructive',
      });
    }
  };

  // Export Data
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'تم التصدير',
        description: 'تم إنشاء النسخة الاحتياطية بنجاح',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء التصدير',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import Data
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importAllData(data, importMode === 'merge');

      if (result.success) {
        await refreshLocalData();
        toast({
          title: 'تم الاستيراد',
          description: result.message,
        });
      } else {
        toast({
          title: 'خطأ',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل قراءة الملف. تأكد من صحة الملف',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setShowImportDialog(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clear Data
  const handleClearData = async () => {
    try {
      const result = await clearAllData();
      if (result.success) {
        await refreshLocalData();
        toast({
          title: 'تم المسح',
          description: result.message,
        });
      } else {
        toast({
          title: 'خطأ',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء مسح البيانات',
        variant: 'destructive',
      });
    } finally {
      setShowClearDialog(false);
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور الجديدة غير متطابقة',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        toast({
          title: 'خطأ',
          description: 'لم يتم العثور على المستخدم',
          variant: 'destructive',
        });
        return;
      }

      const result = await changePassword(userId, oldPassword, newPassword);
      
      if (result.success) {
        toast({
          title: 'تم بنجاح',
          description: result.message,
        });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({
          title: 'خطأ',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Change Username
  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم المستخدم الجديد',
        variant: 'destructive',
      });
      return;
    }

    if (newUsername.length < 3) {
      toast({
        title: 'خطأ',
        description: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingUsername(true);
    try {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        toast({
          title: 'خطأ',
          description: 'لم يتم العثور على المستخدم',
          variant: 'destructive',
        });
        return;
      }

      const result = await changeUsername(userId, newUsername);
      
      if (result.success) {
        toast({
          title: 'تم بنجاح',
          description: result.message,
        });
        setCurrentUsername(newUsername);
        setNewUsername('');
      } else {
        toast({
          title: 'خطأ',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsChangingUsername(false);
    }
  };

  const sections = [
    {
      id: 'account',
      title: 'الحساب',
      icon: User,
      content: (
        <div className="space-y-4">
          {/* Change Username */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">تغيير اسم المستخدم</p>
                <p className="text-xs text-muted-foreground">اسم المستخدم الحالي: {currentUsername || localStorage.getItem('currentUsername') || 'admin'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="اسم المستخدم الجديد"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleChangeUsername}
                disabled={isChangingUsername || !newUsername.trim()}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isChangingUsername ? '...' : 'حفظ'}
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium">تغيير كلمة المرور</p>
                <p className="text-xs text-muted-foreground">يُنصح باستخدام كلمة مرور قوية</p>
              </div>
            </div>
            
            {/* Old Password */}
            <div className="relative">
              <Input
                type={showOldPassword ? 'text' : 'password'}
                placeholder="كلمة المرور الحالية"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* New Password */}
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="تأكيد كلمة المرور الجديدة"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {isChangingPassword ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 'appearance',
      title: 'المظهر',
      icon: Palette,
      content: (
        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-blue-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium">الوضع الليلي</p>
                <p className="text-xs text-muted-foreground">
                  {theme === 'dark' ? 'مفعل' : 'غير مفعل'}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {/* Color Theme */}
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="font-medium mb-3">ألوان التمييز</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500 mx-auto mb-1" />
                <p className="text-xs">لنا</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-red-500 mx-auto mb-1" />
                <p className="text-xs">علينا</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-amber-500 mx-auto mb-1" />
                <p className="text-xs">ديون</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'currencies',
      title: 'إدارة العملات',
      icon: Currency,
      content: (
        <div className="space-y-4">
          {/* Currency List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currencies.map((currency) => (
              <motion.div
                key={currency.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold">
                    {currency.symbol}
                  </div>
                  <div>
                    <p className="font-medium">{currency.name}</p>
                    <p className="text-xs text-muted-foreground">{currency.code}</p>
                  </div>
                  {currency.isDefault && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      افتراضي
                    </span>
                  )}
                </div>
                {!currency.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteCurrency(currency)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Add Currency Button */}
          <Dialog open={isAddCurrencyOpen} onOpenChange={setIsAddCurrencyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                إضافة عملة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>إضافة عملة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>رمز العملة</Label>
                  <Input
                    placeholder="USD"
                    value={newCurrency.code}
                    onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم العملة</Label>
                  <Input
                    placeholder="دولار أمريكي"
                    value={newCurrency.name}
                    onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الرمز</Label>
                  <Input
                    placeholder="$"
                    value={newCurrency.symbol}
                    onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                    maxLength={3}
                  />
                </div>
                <Button
                  onClick={handleAddCurrency}
                  disabled={!newCurrency.code || !newCurrency.name || !newCurrency.symbol}
                  className="w-full"
                >
                  إضافة العملة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ),
    },
    {
      id: 'backup',
      title: 'النسخ الاحتياطي',
      icon: FileJson,
      content: (
        <div className="space-y-4">
          {/* Export Section */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium">تصدير البيانات</p>
                <p className="text-xs text-muted-foreground">إنشاء نسخة احتياطية</p>
              </div>
            </div>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {isExporting ? 'جاري التصدير...' : 'تصدير النسخة الاحتياطية'}
            </Button>
          </div>

          {/* Import Section */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">استيراد البيانات</p>
                <p className="text-xs text-muted-foreground">استعادة نسخة احتياطية</p>
              </div>
            </div>
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="w-full"
            >
              استيراد نسخة احتياطية
            </Button>
          </div>

          {/* Clear Data */}
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">مسح البيانات</p>
                <p className="text-xs text-muted-foreground">حذف الحركات والديون وعمليات الصرافة</p>
              </div>
            </div>
            <Button
              onClick={() => setShowClearDialog(true)}
              variant="destructive"
              className="w-full"
            >
              مسح جميع البيانات
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 'data',
      title: 'إحصائيات البيانات',
      icon: Database,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-primary">{stats.currencies}</p>
              <p className="text-xs text-muted-foreground">عملة</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-primary">{stats.vaults}</p>
              <p className="text-xs text-muted-foreground">صندوق</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-primary">{stats.accounts}</p>
              <p className="text-xs text-muted-foreground">حساب</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-primary">{stats.transactions}</p>
              <p className="text-xs text-muted-foreground">حركة</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/50 col-span-2">
              <p className="text-2xl font-bold text-primary">{stats.debts}</p>
              <p className="text-xs text-muted-foreground">دين</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-sm text-muted-foreground">تخصيص التطبيق</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <motion.div
              key={section.id}
              initial={false}
              className="rounded-2xl bg-card border border-border overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{section.title}</span>
                </div>
                <ChevronLeft
                  className={cn(
                    'w-5 h-5 text-muted-foreground transition-transform duration-200',
                    isExpanded && '-rotate-90'
                  )}
                />
              </button>

              {/* Section Content */}
              <motion.div
                initial={false}
                animate={{
                  height: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0">
                  {section.content}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* App Version */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">الإصدار 1.0.0</p>
      </div>

      {/* Delete Currency Confirmation */}
      <AlertDialog open={!!deleteCurrency} onOpenChange={() => setDeleteCurrency(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العملة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف عملة "{deleteCurrency?.name}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCurrency} className="bg-red-500 hover:bg-red-600">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Mode Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>استيراد نسخة احتياطية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              اختر طريقة الاستيراد:
            </p>
            
            <div className="space-y-2">
              <div
                onClick={() => setImportMode('merge')}
                className={cn(
                  'p-3 rounded-xl border-2 cursor-pointer transition-all',
                  importMode === 'merge'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Merge className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="font-medium">دمج مع البيانات الحالية</p>
                    <p className="text-xs text-muted-foreground">إضافة البيانات الجديدة فقط</p>
                  </div>
                </div>
              </div>
              
              <div
                onClick={() => setImportMode('replace')}
                className={cn(
                  'p-3 rounded-xl border-2 cursor-pointer transition-all',
                  importMode === 'replace'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Replace className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium">استبدال البيانات</p>
                    <p className="text-xs text-muted-foreground">حذف البيانات الحالية واستبدالها</p>
                  </div>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? 'جاري الاستيراد...' : 'اختر ملف النسخة الاحتياطية'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Data Confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              مسح البيانات
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل أنت متأكد من مسح جميع البيانات؟</span>
              <span className="block text-xs mt-2">سيتم حذف جميع الحركات والديون وعمليات الصرافة وإعادة تعيين أرصدة الصناديق.</span>
              <span className="block text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                سيتم الحفاظ على الحسابات والعملات.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} className="bg-red-500 hover:bg-red-600">
              مسح البيانات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
