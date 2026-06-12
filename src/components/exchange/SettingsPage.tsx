'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  Archive,
  Loader2,
  Shield,
  RotateCcw,
  Clock,
  HardDrive,
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
import { exportAllData, importAllData, clearAllData, changePassword, changeUsername, getUsers, addCustomCurrency, deleteCurrencyFromDb, createBackup, getBackups, restoreBackup, deleteBackup, checkBackupsTableExists, exportBackupAsJson } from '@/lib/supabaseDb';
import type { Currency as CurrencyType } from '@/types';
import { StorageDashboard } from '@/components/exchange/StorageDashboard';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currencies, setCurrencies, vaults, accounts, transactions, debts } = useAppStore();
  const { refreshData: refreshLocalData, autoArchiveOldRecords } = useSupabaseData();
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

  // Archive
  const [archiveMonths, setArchiveMonths] = useState(6);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [archiveSetupResult, setArchiveSetupResult] = useState<{ success: boolean; message: string } | null>(null);

  // Backup System
  const [backups, setBackups] = useState<Array<{
    id: string;
    reason: string;
    recordCounts: { currencies: number; vaults: number; accounts: number; transactions: number; debts: number; debtPayments: number; currencyExchanges: number };
    sizeBytes: number;
    createdAt: Date;
  }>>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingDbBackup, setIsCreatingDbBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [backupsTableExists, setBackupsTableExists] = useState(false);
  const [isSettingUpBackups, setIsSettingUpBackups] = useState(false);
  const [backupSetupResult, setBackupSetupResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);

  // Load current username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('currentUsername');
    if (savedUsername) {
      setCurrentUsername(savedUsername);
    }
    // Also check if backups table exists on mount
    checkBackupsTableExists().then(exists => {
      setBackupsTableExists(exists);
    }).catch(() => {
      setBackupsTableExists(false);
    });
  }, []);

  // Check backups table existence when backup-management section is expanded
  // (handled in the section toggle click handler below)

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

  // Clear Data - Multi-stage protection
  const [clearStep, setClearStep] = useState<0 | 1 | 2 | 3>(0); // 0=hidden, 1=warning+backup, 2=verify, 3=countdown
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);
  const [backupError, setBackupError] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isDeleting, setIsDeleting] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Open clear dialog - start at step 1
  const handleOpenClearDialog = () => {
    setClearStep(1);
    setBackupCreated(false);
    setBackupError(false);
    setIsCreatingBackup(false);
    setVerificationInput('');
    setVerificationError('');
    setCountdown(3);
    setIsDeleting(false);
  };

  // Close clear dialog
  const handleCloseClearDialog = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setClearStep(0);
    setVerificationInput('');
    setVerificationError('');
  };

  // Step 1: Create auto-backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupError(false);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pre-delete-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupCreated(true);
    } catch (error) {
      console.error('Error creating backup:', error);
      setBackupError(true);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Step 1 → 3 (or 2 if password): Proceed from backup
  const handleProceedToVerify = async () => {
    // Check if user has a custom password
    const userId = localStorage.getItem('currentUserId');
    let userHasPassword = false;
    if (userId) {
      try {
        const { verifyUserPassword } = await import('@/lib/supabaseDb');
        const result = await verifyUserPassword(userId, 'admin');
        userHasPassword = result.hasPassword;
        setHasPassword(result.hasPassword);
      } catch {
        setHasPassword(false);
      }
    }
    // If user has password, go to step 2 for password verification
    // If no password, skip directly to step 3 (countdown)
    if (userHasPassword) {
      setClearStep(2);
    } else {
      setClearStep(3);
      startCountdown();
    }
  };

  // Step 2: Verify user password only (no "احذف" text confirmation)
  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationError('');

    const userId = localStorage.getItem('currentUserId');

    if (hasPassword && userId) {
      // Verify password
      try {
        const { verifyUserPassword } = await import('@/lib/supabaseDb');
        const result = await verifyUserPassword(userId, verificationInput);
        if (result.valid) {
          setClearStep(3);
          startCountdown();
        } else {
          setVerificationError('كلمة المرور غير صحيحة');
        }
      } catch {
        setVerificationError('حدث خطأ أثناء التحقق');
      }
    }

    setIsVerifying(false);
  };

  // Step 3: Start countdown
  const startCountdown = () => {
    setCountdown(3);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 3: Execute deletion after countdown
  const handleExecuteDeletion = async () => {
    setIsDeleting(true);
    try {
      const result = await clearAllData();
      if (result.success) {
        await refreshLocalData();
        toast({
          title: 'تم المسح',
          description: 'تم حذف جميع البيانات بنجاح. يمكنك استرجاعها من النسخة الاحتياطية.',
        });
        handleCloseClearDialog();
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
      setIsDeleting(false);
    }
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

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

  // Auto Archive
  const handleAutoArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await autoArchiveOldRecords(archiveMonths);
      await refreshLocalData();
      const total = result.archived.transactions + result.archived.debts + result.archived.debtPayments + result.archived.currencyExchanges;
      toast({
        title: total > 0 ? 'تمت الأرشفة' : 'لا توجد حركات للأرشفة',
        description: total > 0
          ? `تم أرشفة ${result.archived.transactions} حركة، ${result.archived.debts} دين، ${result.archived.debtPayments} دفعة، ${result.archived.currencyExchanges} عملية صرافة`
          : 'جميع الحركات حديثة',
      });
    } catch (error) {
      console.error('Error auto-archiving:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الأرشفة',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  // Setup Archive Database
  const handleSetupArchive = async () => {
    setIsSettingUp(true);
    setArchiveSetupResult(null);
    try {
      const response = await fetch('/api/archive/setup', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setArchiveSetupResult({ success: true, message: data.message || 'تم إعداد نظام الأرشفة بنجاح ✓' });
      } else {
        setArchiveSetupResult({
          success: false,
          message: data.note || data.error || 'يجب تشغيل SQL يدوياً في Supabase SQL Editor',
        });
      }
    } catch (error) {
      console.error('Archive setup error:', error);
      setArchiveSetupResult({ 
        success: false, 
        message: error instanceof Error && error.message.includes('Failed to fetch')
          ? 'لا يمكن الاتصال بالخادم. تأكد من تشغيل التطبيق.'
          : 'خطأ في إعداد نظام الأرشفة. حاول مرة أخرى.' 
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // ============================================
  // Backup System Handlers
  // ============================================

  // Load backups from database
  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const exists = await checkBackupsTableExists();
      setBackupsTableExists(exists);
      if (exists) {
        const data = await getBackups();
        setBackups(data);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // Create a new backup in the database
  const handleCreateDbBackup = async () => {
    setIsCreatingDbBackup(true);
    try {
      const result = await createBackup('manual');
      toast({
        title: 'تم إنشاء النسخة الاحتياطية',
        description: `تم حفظ النسخة بنجاح (${formatFileSize(result.sizeBytes)})`,
      });
      await loadBackups(); // Refresh list
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إنشاء النسخة الاحتياطية. تأكد من إعداد جدول النسخ الاحتياطية.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingDbBackup(false);
    }
  };

  // Restore from a backup
  const handleRestoreFromBackup = async (backupId: string) => {
    setIsRestoring(backupId);
    setShowRestoreConfirm(null);
    try {
      const result = await restoreBackup(backupId);
      if (result.success) {
        await refreshLocalData();
        toast({
          title: 'تم الاسترجاع',
          description: 'تم استرجاع البيانات بنجاح من النسخة الاحتياطية',
        });
      } else {
        toast({
          title: 'خطأ',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء استرجاع البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(null);
    }
  };

  // Delete a backup
  const handleDeleteBackup = async (backupId: string) => {
    try {
      const result = await deleteBackup(backupId);
      if (result.success) {
        setBackups(prev => prev.filter(b => b.id !== backupId));
        toast({ title: 'تم الحذف', description: 'تم حذف النسخة الاحتياطية' });
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({ title: 'خطأ', description: 'فشل حذف النسخة الاحتياطية', variant: 'destructive' });
    }
  };

  // Download a backup as JSON file
  const handleDownloadBackup = async (backupId: string) => {
    try {
      const result = await exportBackupAsJson(backupId);
      if (!result.data) {
        toast({ title: 'خطأ', description: 'فشل تصدير النسخة الاحتياطية', variant: 'destructive' });
        return;
      }
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'تم التحميل', description: 'تم تحميل النسخة الاحتياطية بنجاح' });
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({ title: 'خطأ', description: 'فشل تحميل النسخة الاحتياطية', variant: 'destructive' });
    }
  };

  // Setup backups table
  const handleSetupBackups = async () => {
    setIsSettingUpBackups(true);
    setBackupSetupResult(null);
    try {
      const response = await fetch('/api/backup/setup', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setBackupSetupResult({ success: true, message: data.message || 'تم إعداد نظام النسخ الاحتياطي بنجاح ✓' });
        setBackupsTableExists(true);
        await loadBackups();
      } else {
        setBackupSetupResult({
          success: false,
          message: data.note || data.error || 'يجب تشغيل SQL يدوياً في Supabase SQL Editor',
        });
      }
    } catch (error) {
      console.error('Backup setup error:', error);
      setBackupSetupResult({ 
        success: false, 
        message: error instanceof Error && error.message.includes('Failed to fetch')
          ? 'لا يمكن الاتصال بالخادم. تأكد من تشغيل التطبيق.'
          : 'خطأ في إعداد نظام النسخ الاحتياطية. حاول مرة أخرى.' 
      });
    } finally {
      setIsSettingUpBackups(false);
    }
  };

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format backup reason in Arabic
  const formatReason = (reason: string): { label: string; color: string } => {
    switch (reason) {
      case 'manual': return { label: 'يدوي', color: 'text-blue-600 dark:text-blue-400' };
      case 'pre_delete': return { label: 'قبل الحذف', color: 'text-red-600 dark:text-red-400' };
      case 'pre_archive': return { label: 'قبل الأرشفة', color: 'text-amber-600 dark:text-amber-400' };
      case 'auto': return { label: 'تلقائي', color: 'text-emerald-600 dark:text-emerald-400' };
      default: return { label: reason, color: 'text-muted-foreground' };
    }
  };

  // Format date in Arabic
  const formatDate = (date: Date): string => {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return date.toLocaleDateString();
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
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400">يتم إنشاء نسخة احتياطية تلقائيًا قبل الحذف</p>
              </div>
            </div>
            <Button
              onClick={handleOpenClearDialog}
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
      id: 'backup-management',
      title: 'إدارة النسخ المحفوظة',
      icon: HardDrive,
      content: (
        <div className="space-y-4">
          {/* Setup Backups Table */}
          {!backupsTableExists && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">إعداد جدول النسخ الاحتياطي</p>
                  <p className="text-xs text-muted-foreground">يجب إنشاء جدول backups في قاعدة البيانات</p>
                </div>
              </div>
              <Button
                onClick={handleSetupBackups}
                disabled={isSettingUpBackups}
                variant="outline"
                className="w-full"
              >
                {isSettingUpBackups ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {isSettingUpBackups ? 'جاري الإعداد...' : 'إعداد جدول النسخ الاحتياطي'}
              </Button>
              {backupSetupResult && (
                <p className={cn('text-xs mt-2', backupSetupResult.success ? 'text-emerald-600' : 'text-red-600')}>
                  {backupSetupResult.message}
                </p>
              )}
            </div>
          )}

          {/* Create Backup */}
          {backupsTableExists && (
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium">إنشاء نسخة احتياطية</p>
                  <p className="text-xs text-muted-foreground">حفظ نسخة من جميع البيانات في قاعدة البيانات</p>
                </div>
              </div>
              <Button
                onClick={handleCreateDbBackup}
                disabled={isCreatingDbBackup}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                {isCreatingDbBackup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري إنشاء النسخة...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 ml-2" />
                    إنشاء نسخة احتياطية جديدة
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Stored Backups List */}
          {backupsTableExists && (
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">النسخ المحفوظة</p>
                    <p className="text-xs text-muted-foreground">
                      {backups.length > 0 ? `آخر ${backups.length} نسخ (الحد الأقصى 5)` : 'لا توجد نسخ محفوظة'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadBackups}
                  disabled={isLoadingBackups}
                >
                  {isLoadingBackups ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تحديث'}
                </Button>
              </div>

              {isLoadingBackups && backups.length === 0 ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-2">جاري تحميل النسخ...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">لا توجد نسخ احتياطية محفوظة</p>
                  <p className="text-xs text-muted-foreground mt-1">أنشئ نسخة جديدة أو احذف بيانات لإنشاء نسخة تلقائية</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {backups.map((backup) => {
                    const reasonInfo = formatReason(backup.reason);
                    return (
                      <div
                        key={backup.id}
                        className="p-3 rounded-xl bg-background border border-border/50 space-y-2"
                      >
                        {/* Backup Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full bg-muted', reasonInfo.color)}>
                              {reasonInfo.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatFileSize(backup.sizeBytes)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(backup.createdAt)}</span>
                        </div>

                        {/* Record Counts */}
                        <div className="flex flex-wrap gap-1">
                          {backup.recordCounts.transactions > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground">
                              {backup.recordCounts.transactions} حركة
                            </span>
                          )}
                          {backup.recordCounts.debts > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground">
                              {backup.recordCounts.debts} دين
                            </span>
                          )}
                          {backup.recordCounts.currencyExchanges > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground">
                              {backup.recordCounts.currencyExchanges} صرافة
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={() => handleDownloadBackup(backup.id)}
                          >
                            <Download className="w-3 h-3 ml-1" />
                            تحميل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7 text-amber-600 hover:text-amber-700 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                            onClick={() => setShowRestoreConfirm(backup.id)}
                            disabled={isRestoring === backup.id}
                          >
                            {isRestoring === backup.id ? (
                              <Loader2 className="w-3 h-3 animate-spin ml-1" />
                            ) : (
                              <RotateCcw className="w-3 h-3 ml-1" />
                            )}
                            استرجاع
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteBackup(backup.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
    {
      id: 'archive',
      title: 'الأرشفة والأداء',
      icon: Archive,
      content: (
        <div className="space-y-4">
          {/* Auto Archive */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Archive className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">أرشفة تلقائية</p>
                <p className="text-xs text-muted-foreground">نقل الحركات القديمة إلى الأرشيف لتحسين الأداء</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={String(archiveMonths)} onValueChange={(v) => setArchiveMonths(Number(v))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 أشهر</SelectItem>
                    <SelectItem value="6">6 أشهر</SelectItem>
                    <SelectItem value="12">سنة</SelectItem>
                    <SelectItem value="24">سنتين</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAutoArchive}
                  disabled={isArchiving}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'أرشفة'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                سيتم أرشفة الحركات الأقدم من {archiveMonths} شهر (الديون المؤرشفة يجب أن تكون مدفوعة)
              </p>
            </div>
          </div>

          {/* Setup Database */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">إعداد قاعدة البيانات</p>
                <p className="text-xs text-muted-foreground">إضافة عمود الأرشفة والفهارس لتحسين الأداء</p>
              </div>
            </div>
            <Button
              onClick={handleSetupArchive}
              disabled={isSettingUp}
              variant="outline"
              className="w-full"
            >
              {isSettingUp ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {isSettingUp ? 'جاري الإعداد...' : 'إعداد نظام الأرشفة'}
            </Button>
            {archiveSetupResult && (
              <p className={cn('text-xs mt-2', archiveSetupResult.success ? 'text-emerald-600' : 'text-red-600')}>
                {archiveSetupResult.message}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'storage',
      title: 'إدارة التخزين',
      icon: Database,
      content: <StorageDashboard />,
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      {/* Header — Sticky */}
      <div className="flex items-center gap-3 sticky top-0 z-30 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/30">
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
                onClick={() => {
                  const newSection = isExpanded ? null : section.id;
                  setExpandedSection(newSection);
                  // Load backups when backup-management section is expanded
                  if (newSection === 'backup-management') {
                    loadBackups();
                  }
                }}
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

      {/* Restore Backup Confirmation Dialog */}
      <AlertDialog open={!!showRestoreConfirm} onOpenChange={(open) => { if (!open) setShowRestoreConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              استرجاع البيانات
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل أنت متأكد من استرجاع البيانات من هذه النسخة الاحتياطية؟</span>
              <span className="block text-xs text-amber-600 dark:text-amber-400 mt-2">
                سيتم استبدال البيانات الحالية ببيانات النسخة الاحتياطية. سيتم إنشاء نسخة احتياطية تلقائية للبيانات الحالية قبل الاسترجاع.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRestoreConfirm && handleRestoreFromBackup(showRestoreConfirm)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              استرجاع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Clear Data - Multi-stage Protection Dialog */}
      <Dialog open={clearStep > 0} onOpenChange={(open) => { if (!open) handleCloseClearDialog(); }}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          {/* Step 1: Warning + Auto Backup */}
          {clearStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  مسح البيانات
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">⚠️ تحذير مهم</p>
                  <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                    سيتم حذف جميع الحركات والديون وعمليات الصرافة وإعادة تعيين أرصدة الصناديق نهائيًا.
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    سيتم الحفاظ على الحسابات والعملات.
                  </p>
                </div>

                {/* Auto Backup Section */}
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4 text-emerald-500" />
                    <p className="text-sm font-medium">النسخة الاحتياطية التلقائية</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    قبل الحذف، يجب إنشاء نسخة احتياطية تضم جميع البيانات الحالية لاسترجاعها لاحقًا.
                  </p>

                  {!backupCreated && !backupError && (
                    <Button
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                      size="sm"
                    >
                      {isCreatingBackup ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          جاري إنشاء النسخة الاحتياطية...
                        </>
                      ) : (
                        'إنشاء نسخة احتياطية'
                      )}
                    </Button>
                  )}

                  {backupCreated && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>تم إنشاء النسخة الاحتياطية وتحميلها بنجاح</span>
                    </div>
                  )}

                  {backupError && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-500">فشل إنشاء النسخة الاحتياطية</p>
                      <Button
                        onClick={handleCreateBackup}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        إعادة المحاولة
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseClearDialog}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleProceedToVerify}
                    disabled={!backupCreated}
                    className="flex-1"
                  >
                    متابعة
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Password Verification Only (shown only when user has a custom password) */}
          {clearStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  التحقق من الهوية
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      يرجى إدخال كلمة المرور الخاصة بك لتأكيد الحذف
                    </p>
                  </div>
                  <div className="relative">
                    <Input
                      type={showOldPassword ? 'text' : 'password'}
                      placeholder="كلمة المرور"
                      value={verificationInput}
                      onChange={(e) => { setVerificationInput(e.target.value); setVerificationError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {verificationError && (
                    <p className="text-xs text-red-500">{verificationError}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseClearDialog}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleVerify}
                    disabled={isVerifying || !verificationInput.trim()}
                    className="flex-1"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري التحقق...
                      </>
                    ) : (
                      'تأكيد'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Countdown before deletion */}
          {clearStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  تأكيد الحذف النهائي
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    سيتم حذف جميع البيانات نهائيًا، وقد تم إنشاء نسخة احتياطية قبل الحذف.
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    يمكنك استرجاع البيانات لاحقًا من النسخة الاحتياطية.
                  </p>
                </div>

                {/* Countdown Display */}
                <div className="flex flex-col items-center gap-3 py-4">
                  {countdown > 0 ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center border-4 border-red-300 dark:border-red-700">
                        <span className="text-3xl font-bold text-red-600 dark:text-red-400">{countdown}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">انتظر حتى ينتهي العد التنازلي...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                        <Trash2 className="w-7 h-7 text-white" />
                      </div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">جاهز للحذف</p>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseClearDialog}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleExecuteDeletion}
                    disabled={countdown > 0 || isDeleting}
                    className="flex-1"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري الحذف...
                      </>
                    ) : countdown > 0 ? (
                      `انتظر ${countdown}...`
                    ) : (
                      'تأكيد الحذف'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
