'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { BottomNav } from '@/components/exchange/BottomNav';
import { BalancesPage } from '@/components/exchange/BalancesPage';
import { AccountsPage } from '@/components/exchange/AccountsPage';
import { TransactionsPage } from '@/components/exchange/TransactionsPage';
import { DebtsPage } from '@/components/exchange/DebtsPage';
import { SettingsPage } from '@/components/exchange/SettingsPage';
import { CurrencyExchangePage } from '@/components/exchange/CurrencyExchangePage';
import { VehiclesPage } from '@/components/exchange/VehiclesPage';
import { ReportsPage } from '@/components/exchange/ReportsPage';
import { SideMenu } from '@/components/exchange/SideMenu';
import { CurrencyTransactionsModal } from '@/components/exchange/CurrencyTransactionsModal';
import { VaultQueryModal } from '@/components/exchange/VaultQueryModal';
import { AccountStatementModal } from '@/components/exchange/AccountStatementModal';
import { CurrencyModal } from '@/components/exchange/CurrencyModal';
import { OpeningBalanceModal } from '@/components/exchange/OpeningBalanceModal';
import { CurrencyExchangeModal } from '@/components/exchange/CurrencyExchangeModal';
import { SplashScreen } from '@/components/exchange/SplashScreen';
import { LoginPage } from '@/components/exchange/LoginPage';
import { SupabaseSetup } from '@/components/exchange/SupabaseSetup';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Search, Loader2, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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

// App states
type AppState = 'splash' | 'login' | 'app';

export default function Home() {
  const { 
    activeTab, setActiveTab, openSideMenu, isLoading, setIsLoading, isInitialized, setIsInitialized,
    setCurrencies, setVaults, setAccounts, setTransactions, setDebts, setCurrencyExchanges,
    isSideMenuOpen, closeSideMenu, refreshAllData
  } = useAppStore();
  
  const localData = useSupabaseData();
  const { toast } = useToast();
  
  // App state management
  const [appState, setAppState] = useState<AppState>('splash');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Exit confirmation state
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [exitToastShown, setExitToastShown] = useState(false);
  const lastBackPressTime = useRef(0);
  const EXIT_TIMEOUT = 2000;
  
  // Check if user is already logged in
  const savedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
      savedUserIdRef.current = savedUserId;
    }
  }, []);
  
  // Handle splash screen completion
  const handleSplashComplete = () => {
    if (currentUserId || savedUserIdRef.current) {
      if (savedUserIdRef.current && !currentUserId) {
        setCurrentUserId(savedUserIdRef.current);
      }
      setAppState('app');
    } else {
      setAppState('login');
    }
  };
  
  // Handle successful login
  const handleLogin = (userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem('currentUserId', userId);
    localStorage.setItem('currentUsername', 'admin');
    setAppState('app');
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    setCurrentUserId(null);
    setAppState('login');
    toast({
      title: 'تم تسجيل الخروج',
      description: 'إلى اللقاء!',
    });
  };
  
  // 🔸 اكتشاف عدم وجود جداول Supabase — عرض شاشة الإعداد
  const needsSupabaseSetup = useMemo(() => {
    // Primary check: tablesMissing flag from the hook
    if (localData.tablesMissing && localData.isInitialized) {
      return true;
    }
    // Fallback: check error message patterns (for backwards compatibility)
    if (localData.initError && localData.isInitialized) {
      const errorMsg = localData.initError.toLowerCase();
      if (
        errorMsg.includes('could not find') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('schema cache') ||
        errorMsg.includes('relation') ||
        errorMsg.includes('لم يتم العثور على جداول') ||
        errorMsg.includes('إعداد قاعدة البيانات')
      ) {
        return true;
      }
    }
    return false;
  }, [localData.tablesMissing, localData.initError, localData.isInitialized]);

  // Track if setup was completed (to dismiss the setup screen)
  const [setupCompleted, setSetupCompleted] = useState(false);
  const showSupabaseSetup = needsSupabaseSetup && !setupCompleted;

  // 🔸 عند إكمال إعداد Supabase — إعادة تهيئة التطبيق
  const handleSetupComplete = useCallback(async () => {
    setSetupCompleted(true);
    // Retry initialization
    await localData.retryInit();
  }, [localData]);

  // 🔸 تحميل البيانات عند التهيئة — مع حماية من حلقة إعادة التصيير
  // يستخدم JSON serialization للمقارنة بدل المقارنة بالمرجع
  const lastDataHashRef = useRef('');
  
  const localDataHash = useMemo(() => {
    if (!localData.isInitialized) return '';
    return JSON.stringify({
      c: localData.currencies.length,
      v: localData.vaults.length,
      a: localData.accounts.length,
      t: localData.transactions.length,
      d: localData.debts.length,
      e: localData.currencyExchanges.length,
    });
  }, [
    localData.isInitialized,
    localData.currencies.length,
    localData.vaults.length,
    localData.accounts.length,
    localData.transactions.length,
    localData.debts.length,
    localData.currencyExchanges.length,
  ]);

  useEffect(() => {
    if (localData.isInitialized && appState === 'app' && localDataHash !== lastDataHashRef.current) {
      lastDataHashRef.current = localDataHash;
      setCurrencies(localData.currencies);
      setVaults(localData.vaults);
      setAccounts(localData.accounts);
      const enrichedTransactions = localData.transactions.map(t => ({
        ...t,
        account: localData.accounts.find(a => a.id === t.accountId),
        currency: localData.currencies.find(c => c.id === t.currencyId),
        baseCurrency: localData.currencies.find(c => c.id === t.baseCurrencyId),
      }));
      setTransactions(enrichedTransactions);
      const enrichedDebts = localData.debts.map(d => ({
        ...d,
        account: localData.accounts.find(a => a.id === d.accountId),
        currency: localData.currencies.find(c => c.id === d.currencyId),
      }));
      setDebts(enrichedDebts);
      setCurrencyExchanges(localData.currencyExchanges);
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [
    localData.isInitialized,
    localDataHash,
    localData.currencies,
    localData.vaults,
    localData.accounts,
    localData.transactions,
    localData.debts,
    localData.currencyExchanges,
    setCurrencies,
    setVaults,
    setAccounts,
    setTransactions,
    setDebts,
    setCurrencyExchanges,
    setIsLoading,
    setIsInitialized,
    appState,
  ]);
  
  // 🔸 الاستماع لأحداث تحديث البيانات — مع debounce لمنع التحديثات المتكررة
  const lastEventRefreshRef = useRef(0);
  
  useEffect(() => {
    let cancelled = false;
    
    const handleDataEvent = async () => {
      if (cancelled) return;
      const now = Date.now();
      if (now - lastEventRefreshRef.current < 500) return; // debounce
      lastEventRefreshRef.current = now;
      try {
        await refreshAllData();
      } catch (error) {
        console.error('Error handling data event:', error);
      }
    };
    
    window.addEventListener('currency-updated', handleDataEvent);
    window.addEventListener('local-data-refreshed', handleDataEvent);
    window.addEventListener('app-data-refreshed', handleDataEvent);
    
    return () => {
      cancelled = true;
      window.removeEventListener('currency-updated', handleDataEvent);
      window.removeEventListener('local-data-refreshed', handleDataEvent);
      window.removeEventListener('app-data-refreshed', handleDataEvent);
    };
  }, [refreshAllData]);

  // ============================================
  // 🔸 إعادة تحميل البيانات عند عودة الاتصال
  // 🔸 يضمن تحديث الواجهة تلقائياً بعد انقطاع الشبكة
  // 🔸 لا يحتاج لإعادة تشغيل التطبيق
  // ============================================
  useEffect(() => {
    let cancelled = false;

    const handleNetworkRestored = async () => {
      if (cancelled) return;
      console.log('🔸 عودة الاتصال - تحديث بيانات الواجهة');
      try {
        await refreshAllData();
      } catch (error) {
        console.error('Error refreshing data on network restore:', error);
      }
    };

    // 🔸 الاستماع لحدث عودة الاتصال المخصص
    window.addEventListener('app-network-restored', handleNetworkRestored);

    return () => {
      cancelled = true;
      window.removeEventListener('app-network-restored', handleNetworkRestored);
    };
  }, [refreshAllData]);
  
  // Handle back button
  const handleBackButton = useCallback((e: PopStateEvent) => {
    e.preventDefault();
    
    if (isSideMenuOpen) {
      closeSideMenu();
      return;
    }
    
    const currentTime = Date.now();
    const timeSinceLastPress = currentTime - lastBackPressTime.current;
    
    if (timeSinceLastPress < EXIT_TIMEOUT && !exitToastShown) {
      setShowExitDialog(true);
      setExitToastShown(false);
    } else {
      lastBackPressTime.current = currentTime;
      setExitToastShown(true);
      
      toast({
        title: 'اضغط مرة أخرى للخروج',
        description: 'بياناتك محفوظة تلقائياً',
        duration: EXIT_TIMEOUT,
      });
      
      setTimeout(() => {
        setExitToastShown(false);
      }, EXIT_TIMEOUT);
    }
  }, [isSideMenuOpen, closeSideMenu, exitToastShown, toast]);
  
  // Listen for back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (e: PopStateEvent) => {
      handleBackButton(e);
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleBackButton]);
  
  // Confirm exit action
  const handleConfirmExit = useCallback(() => {
    window.close();
    toast({
      title: 'يمكنك إغلاق التطبيق الآن',
      description: 'بياناتك محفوظة بأمان',
    });
  }, [toast]);
  
  const renderPage = () => {
    switch (activeTab) {
      case 'balances':
        return <BalancesPage />;
      case 'accounts':
        return <AccountsPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'debts':
        return <DebtsPage />;
      case 'exchange':
        return <CurrencyExchangePage />;
      case 'settings':
        return <SettingsPage />;
      case 'vehicles':
        return <VehiclesPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <BalancesPage />;
    }
  };
  
  // Show splash screen
  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }
  
  // Show login page
  if (appState === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }
  
  // Show Supabase setup guide if tables don't exist
  if (showSupabaseSetup) {
    return <SupabaseSetup onSetupComplete={handleSetupComplete} />;
  }
  
  // Show loading screen while initializing
  if (isLoading || !isInitialized) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Animated logo */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center"
          >
            <svg 
              className="w-10 h-10 text-primary-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </motion.div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg font-medium text-foreground">الراضي للصرافة</p>
            <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
          {localData.initError && (
            <div className="text-center space-y-3 mt-2 max-w-sm px-4">
              <p className="text-sm text-red-500">{localData.initError}</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={localData.retryInit}
                  className="gap-2"
                >
                  <Loader2 className="w-4 h-4" />
                  إعادة المحاولة
                </Button>
                {(localData.tablesMissing ||
                  localData.initError.toLowerCase().includes('could not find') || 
                  localData.initError.toLowerCase().includes('does not exist') ||
                  localData.initError.toLowerCase().includes('schema cache') ||
                  localData.initError.toLowerCase().includes('لم يتم العثور على جداول')) && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setSetupCompleted(false)}
                    className="gap-2"
                  >
                    إعداد قاعدة البيانات
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={openSideMenu}
              className="rounded-full"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg 
                  className="w-5 h-5 text-primary-foreground" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <span className="font-bold text-lg">الراضي</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTab('settings')}
              className="rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutDialog(true)}
              className="rounded-full text-red-500 hover:text-red-600"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Side Menu */}
      <SideMenu />
      
      {/* Currency Transactions Modal */}
      <CurrencyTransactionsModal />
      
      {/* Vault Query Modal */}
      <VaultQueryModal />
      
      {/* Account Statement Modal */}
      <AccountStatementModal />
      
      {/* Currency Management Modal */}
      <CurrencyModal />
      
      {/* Opening Balance Modal */}
      <OpeningBalanceModal />
      
      {/* Currency Exchange Modal */}
      <CurrencyExchangeModal />
      
      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              الخروج من التطبيق
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل تريد الخروج من التطبيق؟</span>
              <span className="block text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                لا تقلق، جميع بياناتك محفوظة تلقائياً ولن تُفقد.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-primary">
              خروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-500" />
              تسجيل الخروج
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">هل أنت متأكد أنك تريد تسجيل الخروج؟</span>
              <span className="block text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                لا تقلق، جميع بياناتك محفوظة تلقائياً ولن تُفقد.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowLogoutDialog(false); handleLogout(); }} className="bg-red-500 hover:bg-red-600">
              تسجيل الخروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
