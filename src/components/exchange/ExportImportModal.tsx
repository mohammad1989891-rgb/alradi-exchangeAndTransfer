'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Upload, 
  FileJson, 
  Check, 
  AlertTriangle, 
  Database,
  RefreshCw,
  Trash2,
  Info
} from 'lucide-react';
import {
  exportAllData,
  downloadDataAsJson,
  importDataFromFile,
  restoreFromBackup,
  getDataStats,
  clearAllData,
} from '@/lib/supabaseDb';
import type { ExportData } from '@/lib/supabaseDb';

interface DataStats {
  currencies: number;
  activeCurrencies: number;
  vaults: number;
  accounts: number;
  transactions: number;
  debts: number;
  unpaidDebts: number;
}

export function ExportImportModal() {
  const { isExportImportModalOpen, closeExportImportModal } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [importedData, setImportedData] = useState<ExportData | null>(null);
  const [importPreview, setImportPreview] = useState<DataStats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stats on mount
  const loadStats = async () => {
    const dataStats = await getDataStats();
    setStats(dataStats);
  };

  // Handle export
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const data = await exportAllData();
      downloadDataAsJson(data);
      setMessage({ type: 'success', text: 'تم تصدير البيانات بنجاح!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في تصدير البيانات' });
    }
    setIsLoading(false);
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportedData(null);
    setImportPreview(null);

    try {
      const data = await importDataFromFile(file);
      setImportedData(data);
      
      // Create preview stats
      setImportPreview({
        currencies: data.currencies.length,
        activeCurrencies: data.currencies.filter(c => c.isActive).length,
        vaults: data.vaults.length,
        accounts: data.accounts.length,
        transactions: data.transactions.length,
        debts: data.debts.length,
        unpaidDebts: data.debts.filter(d => !d.isPaid).length,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'فشل في قراءة الملف' });
    }
    setIsLoading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importedData) return;

    setIsLoading(true);
    try {
      const result = await restoreFromBackup(importedData, mergeMode);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setImportedData(null);
        setImportPreview(null);
        await loadStats();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في استعادة البيانات' });
    }
    setIsLoading(false);
  };

  // Handle clear all data
  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const result = await clearAllData();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setShowClearConfirm(false);
        await loadStats();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل في تفريغ البيانات' });
    }
    setIsClearing(false);
  };

  // Reset modal state when opened
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeExportImportModal();
      setImportedData(null);
      setImportPreview(null);
      setMessage(null);
      setMergeMode(false);
    } else {
      loadStats();
    }
  };

  return (
    <Dialog open={isExportImportModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            النسخ الاحتياطي والاستعادة
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="mt-4 space-y-4">
            {/* Info Box */}
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p>قم بتصدير بياناتك كملف JSON لحفظها على جهازك.</p>
                  <p className="mt-1">يمكنك استعادة البيانات لاحقاً من نفس الملف.</p>
                </div>
              </div>
            </div>

            {/* Current Stats */}
            {stats && (
              <div className="rounded-xl bg-muted/50 p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">البيانات الحالية</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>العملات المفعلة:</span>
                    <span className="font-bold">{stats.activeCurrencies}/{stats.currencies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الصناديق:</span>
                    <span className="font-bold">{stats.vaults}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الحسابات:</span>
                    <span className="font-bold">{stats.accounts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الحركات:</span>
                    <span className="font-bold">{stats.transactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الديون:</span>
                    <span className="font-bold">{stats.debts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>غير مدفوعة:</span>
                    <span className="font-bold text-orange-500">{stats.unpaidDebts}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Export Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">تصدير البيانات</h3>
              <Button
                className="w-full h-12"
                onClick={handleExport}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير كملف JSON
              </Button>
            </div>

            {/* Import Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">استعادة البيانات</h3>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload className="w-4 h-4 ml-2" />
                اختر ملف النسخة الاحتياطية
              </Button>

              {/* Import Preview */}
              <AnimatePresence>
                {importPreview && importedData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* File Info */}
                    <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <FileJson className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          تاريخ النسخة: {new Date(importedData.exportDate).toLocaleDateString('ar')}
                        </span>
                      </div>
                    </div>

                    {/* Preview Stats */}
                    <div className="rounded-xl border p-3">
                      <h4 className="text-sm font-medium mb-2">البيانات في الملف:</h4>
                      <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                        <div>• العملات: {importPreview.currencies}</div>
                        <div>• الصناديق: {importPreview.vaults}</div>
                        <div>• الحسابات: {importPreview.accounts}</div>
                        <div>• الحركات: {importPreview.transactions}</div>
                        <div>• الديون: {importPreview.debts}</div>
                      </div>
                    </div>

                    {/* Merge Mode Toggle */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                      <input
                        type="checkbox"
                        id="mergeMode"
                        checked={mergeMode}
                        onChange={(e) => setMergeMode(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="mergeMode" className="text-sm">
                        دمج مع البيانات الحالية (بدون حذف)
                      </label>
                    </div>

                    {/* Warning */}
                    {!mergeMode && (
                      <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
                        <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">تحذير!</p>
                            <p>سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات من الملف.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Import Button */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setImportedData(null);
                          setImportPreview(null);
                        }}
                      >
                        إلغاء
                      </Button>
                      <Button
                        className={cn("flex-1", !mergeMode && "bg-red-500 hover:bg-red-600")}
                        onClick={handleImport}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 ml-2" />
                        )}
                        استعادة
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Message */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "rounded-xl p-3 text-sm whitespace-pre-line",
                    message.type === 'success' 
                      ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {message.type === 'success' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {message.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clear All Data Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <h3 className="text-sm font-medium text-red-600">تفريغ البيانات</h3>
              <Button
                variant="outline"
                className="w-full h-12 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                تفريغ جميع البيانات
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Clear All Data Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تحذير! تفريغ جميع البيانات
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              <div className="mt-4 space-y-3">
                <p className="font-medium text-red-600">
                  هذا الإجراء لا يمكن التراجع عنه!
                </p>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-sm">
                  <p className="font-medium mb-2">سيتم حذف:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>جميع العملات المفعلة</li>
                    <li>جميع الصناديق والأرصدة</li>
                    <li>جميع الحسابات</li>
                    <li>جميع الحركات المالية</li>
                    <li>جميع الديون المسجلة</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  ننصح بتصدير نسخة احتياطية قبل تفريغ البيانات.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isClearing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  جاري التفريغ...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 ml-2" />
                  نعم، تفريغ البيانات
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
