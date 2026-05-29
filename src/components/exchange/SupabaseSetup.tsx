'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Database,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Server,
  ChevronDown,
  ChevronUp,
  Key,
  Zap,
} from 'lucide-react';

interface SupabaseSetupProps {
  onSetupComplete: () => void;
}

const SUPABASE_URL = 'https://hdlpvtuplwthqcksaynt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zcZexMLCWisjShuWEINCAQ_34FQCViu';
const SQL_EDITOR_URL =
  'https://supabase.com/dashboard/project/hdlpvtuplwthqcksaynt/sql';
const DB_SETTINGS_URL =
  'https://supabase.com/dashboard/project/hdlpvtuplwthqcksaynt/settings/database';

export function SupabaseSetup({ onSetupComplete }: SupabaseSetupProps) {
  const [sql, setSql] = useState('');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // One-click setup state
  const [dbPassword, setDbPassword] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [migrationError, setMigrationError] = useState('');
  const [migrationTables, setMigrationTables] = useState<string[]>([]);

  // Connection string state (advanced)
  const [connectionString, setConnectionString] = useState('');

  // Fetch SQL on mount
  useEffect(() => {
    fetch('/api/setup-supabase')
      .then((r) => {
        if (!r.ok) throw new Error('فشل في جلب كود SQL');
        return r.json();
      })
      .then((data) => {
        setSql(data.sql || '');
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message || 'حدث خطأ أثناء تحميل كود SQL');
        setLoading(false);
      });
  }, []);

  const copySQL = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = sql;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // silently fail
      }
      document.body.removeChild(textarea);
    }
  }, [sql]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult('idle');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/currencies?select=id&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        setTestResult('success');
        setTimeout(() => onSetupComplete(), 1500);
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }, [onSetupComplete]);

  // One-click migration with password
  const runOneClickMigration = useCallback(async () => {
    if (!dbPassword.trim()) return;
    setMigrating(true);
    setMigrationResult('idle');
    setMigrationError('');
    setMigrationTables([]);
    try {
      const res = await fetch('/api/setup-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbPassword: dbPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMigrationResult('success');
        setMigrationTables(data.tables || []);
        // Auto-test after migration
        setTimeout(() => testConnection(), 1000);
      } else {
        setMigrationResult('error');
        setMigrationError(data.error || 'فشل في تشغيل الترحيل');
      }
    } catch (err) {
      setMigrationResult('error');
      setMigrationError(
        err instanceof Error ? err.message : 'حدث خطأ في الاتصال بالخادم'
      );
    } finally {
      setMigrating(false);
    }
  }, [dbPassword, testConnection]);

  // Advanced: migration with connection string
  const runAdvancedMigration = useCallback(async () => {
    if (!connectionString.trim()) return;
    setMigrating(true);
    setMigrationResult('idle');
    setMigrationError('');
    try {
      const res = await fetch('/api/setup-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseUrl: connectionString.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMigrationResult('success');
        setMigrationTables(data.tables || []);
        setTimeout(() => testConnection(), 1000);
      } else {
        setMigrationResult('error');
        setMigrationError(data.error || 'فشل في تشغيل الترحيل');
      }
    } catch (err) {
      setMigrationResult('error');
      setMigrationError(
        err instanceof Error ? err.message : 'حدث خطأ في الاتصال بالخادم'
      );
    } finally {
      setMigrating(false);
    }
  }, [connectionString, testConnection]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 overflow-y-auto">
      <div className="w-full max-w-2xl mx-4 my-8" dir="rtl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 mb-4">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            إعداد قاعدة البيانات
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            يلزم إنشاء جداول قاعدة البيانات في Supabase قبل استخدام التطبيق
          </p>
        </div>

        {/* Success overlay */}
        {testResult === 'success' && (
          <div className="mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-6 text-center animate-pulse">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 mb-3">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-1">
              تم الاتصال بنجاح!
            </h3>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm">
              جاري التحويل إلى التطبيق...
            </p>
          </div>
        )}

        {/* Method 1: One-Click Setup (RECOMMENDED) */}
        <Card className="mb-6 border-2 border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-100/50 dark:shadow-emerald-900/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
                <Zap className="w-4 h-4" />
              </div>
              إعداد تلقائي (موصى به)
            </CardTitle>
            <CardDescription>
              أدخل كلمة مرور قاعدة البيانات وسيتم إنشاء الجداول تلقائيًا
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Password input */}
            <div className="space-y-2">
              <label htmlFor="db-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                كلمة مرور قاعدة البيانات
              </label>
              <Input
                id="db-password"
                type="password"
                placeholder="أدخل كلمة مرور قاعدة البيانات من Supabase"
                value={dbPassword}
                onChange={(e) => setDbPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runOneClickMigration()}
                dir="ltr"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                تجدها في{' '}
                <a
                  href={DB_SETTINGS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  Supabase ← Settings ← Database
                </a>
              </p>
            </div>

            {/* Run button */}
            <Button
              onClick={runOneClickMigration}
              disabled={migrating || !dbPassword.trim()}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-11"
              size="lg"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري إنشاء الجداول...
                </>
              ) : migrationResult === 'success' ? (
                <>
                  <Check className="w-5 h-5" />
                  تم إنشاء الجداول بنجاح!
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  إنشاء الجداول تلقائيًا
                </>
              )}
            </Button>

            {/* Migration result */}
            {migrationResult === 'success' && migrationTables.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-2">
                  تم إنشاء الجداول التالية ({migrationTables.length}):
                </p>
                <div className="flex flex-wrap gap-1.5" dir="ltr">
                  {migrationTables.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {migrationResult === 'error' && migrationError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-destructive text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {migrationError}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Method 2: Manual SQL Setup */}
        <Card className="mb-6 border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              إعداد يدوي (بديل)
            </CardTitle>
            <CardDescription>
              إذا لم تنجح الطريقة التلقائية، يمكنك إنشاء الجداول يدويًا عبر محرر SQL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Open SQL Editor */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-sm shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">افتح محرر SQL في Supabase</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => window.open(SQL_EDITOR_URL, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  فتح محرر SQL
                </Button>
              </div>
            </div>

            {/* Step 2: Copy SQL */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-sm shrink-0">
                2
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-2">انسخ كود SQL والصقه في المحرر</p>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تحميل كود SQL...
                  </div>
                ) : fetchError ? (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 inline ml-2" />
                    {fetchError}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="bg-slate-900 dark:bg-slate-800 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 dark:bg-slate-700/50 border-b border-slate-700">
                        <span className="text-xs text-slate-400 font-mono">SQL</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1.5 text-slate-300 hover:text-white hover:bg-slate-700"
                          onClick={copySQL}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 text-xs">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-xs">نسخ</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <pre
                        className="p-3 text-xs text-slate-300 font-mono overflow-x-auto max-h-48 overflow-y-auto leading-relaxed"
                        dir="ltr"
                      >
                        {sql || '-- لا يوجد كود SQL متاح'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Test */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-sm shrink-0">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">اختبر الاتصال بعد تشغيل SQL</p>
                <Button
                  onClick={testConnection}
                  disabled={testing || testResult === 'success'}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الاختبار...
                    </>
                  ) : testResult === 'success' ? (
                    <>
                      <Check className="w-4 h-4" />
                      تم الاتصال بنجاح
                    </>
                  ) : testResult === 'error' ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      إعادة المحاولة
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      اختبر الاتصال
                    </>
                  )}
                </Button>
                {testResult === 'error' && (
                  <p className="mt-2 text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    فشل الاتصال — تأكد من تشغيل كود SQL بنجاح ثم حاول مرة أخرى
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced: Connection String Option */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-5 text-right hover:bg-muted/30 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">خيارات متقدمة</h3>
                <p className="text-xs text-muted-foreground">تشغيل الترحيل عبر سلسلة اتصال PostgreSQL كاملة</p>
              </div>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showAdvanced && (
            <div className="px-5 pb-5 space-y-4">
              <div className="space-y-2">
                <label htmlFor="connection-string" className="text-sm font-medium text-foreground">
                  سلسلة اتصال PostgreSQL كاملة
                </label>
                <Input
                  id="connection-string"
                  type="password"
                  placeholder="postgresql://user:password@host:5432/database"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  dir="ltr"
                  className="font-mono text-sm"
                />
              </div>

              <Button
                onClick={runAdvancedMigration}
                disabled={migrating || !connectionString.trim()}
                className="w-full gap-2"
                variant="outline"
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تشغيل الترحيل...
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4" />
                    تشغيل الترحيل
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6 mb-4">
          جميع البيانات مخزنة بشكل آمن في Supabase • الاتصال مشفر عبر HTTPS
        </p>
      </div>
    </div>
  );
}
