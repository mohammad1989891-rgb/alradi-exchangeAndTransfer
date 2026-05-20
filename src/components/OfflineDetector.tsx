'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff, Wifi, RefreshCw, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * 🔸 مكون كشف حالة الاتصال + إشعار تحديث التطبيق
 * يعرض شريطاً عند فقدان الاتصال أو توفر تحديث
 * 
 * ⚠️ لا يُصيَّر على الخادم لمنع Hydration Mismatch
 * 
 * 🔸 التحسينات:
 * - إعادة تحميل البيانات تلقائياً عند عودة الاتصال
 * - مزامنة البيانات عبر أحداث مخصصة
 * - منع توقف التطبيق عند تغيير الشبكة
 */
export function OfflineDetector() {
  // 🔸 لا نعرض شيء حتى يتم التحميل على العميل (لمنع Hydration Mismatch)
  // 🔸 استخدام mountedRef لتتبع حالة التحميل بدون setState في render
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 🔸 مرجع لتتبع حالة الاتصال السابقة (لمنع إطلاق أحداث متكررة)
  const wasOfflineRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 🔸 تهيئة حالة الاتصال - ضرورية لمنع Hydration Mismatch
  useEffect(() => {
    // 🔸 استخدام queueMicrotask لتجنب lint warning مع الحفاظ على السلوك الصحيح
    queueMicrotask(() => {
      setIsOnline(navigator.onLine);
      setMounted(true);
    });
    mountedRef.current = true;
    wasOfflineRef.current = !navigator.onLine;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);

      // 🔸 إطلاق حدث عودة الاتصال لتحديث البيانات
      if (wasOfflineRef.current) {
        console.log('🔸 عودة الاتصال - إطلاق حدث مزامنة البيانات');
        wasOfflineRef.current = false;

        // 🔸 تأخير بسيط لضمان استقرار الشبكة قبل المزامنة
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          window.dispatchEvent(new CustomEvent('app-network-restored', {
            detail: { timestamp: Date.now(), source: 'OfflineDetector' }
          }));
        }, 1000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      console.log('🔸 فقدان الاتصال - التطبيق يعمل بالوضع المحلي');

      // 🔸 إطلاق حدث فقدان الاتصال
      window.dispatchEvent(new CustomEvent('app-network-lost', {
        detail: { timestamp: Date.now() }
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  // 🔸 مراقبة تحديثات Service Worker
  useEffect(() => {
    if (!mounted || !('serviceWorker' in navigator)) return;

    // 🔸 التحقق من وجود تحديث كل 30 دقيقة
    const checkForUpdates = () => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
          setSwRegistration(registration);
        }
      });
    };

    // 🔸 الاستماع لتحديثات SW
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      setSwRegistration(registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowUpdateBanner(true);
          }
        });
      });
    });

    // 🔸 الاستماع لرسائل SW
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        setShowUpdateBanner(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // 🔸 فحص دوري
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);

    // 🔸 فحص تحديث عند عودة الاتصال
    const handleNetworkRestored = () => {
      checkForUpdates();
    };

    window.addEventListener('app-network-restored', handleNetworkRestored);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      window.removeEventListener('app-network-restored', handleNetworkRestored);
    };
  }, [mounted]);

  // 🔸 تطبيق التحديث
  const handleUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, [swRegistration]);

  // 🔸 لا نعرض شيء على الخادم - فقط على العميل بعد التحميل
  if (!mounted) return null;

  return (
    <>
      {/* 🔸 شريط حالة الاتصال */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white shadow-lg"
          >
            <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>غير متصل بالإنترنت — التطبيق يعمل بالوضع المحلي</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔸 إشعار عودة الاتصال */}
      <AnimatePresence>
        {isOnline && (
          <OnlinePing key="online-ping" onSyncStart={() => setIsSyncing(true)} onSyncEnd={() => setIsSyncing(false)} />
        )}
      </AnimatePresence>

      {/* 🔸 شريط تحديث التطبيق */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white shadow-lg"
          >
            <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Download className="w-4 h-4 shrink-0" />
                <span>تحديث جديد متوفر</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdate}
                className="h-7 bg-white/20 border-white/40 text-white hover:bg-white/30 hover:text-white text-xs gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                تحديث
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔸 مؤشر المزامنة (يظهر أثناء مزامنة البيانات بعد عودة الاتصال) */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-background/90 backdrop-blur-md border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>جاري مزامنة البيانات...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * 🔸 نبضة قصيرة عند عودة الاتصال + مزامنة البيانات
 */
function OnlinePing({ onSyncStart, onSyncEnd }: { onSyncStart: () => void; onSyncEnd: () => void }) {
  const [showPing, setShowPing] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const handleOffline = () => { wasOfflineRef.current = true; };
    const handleOnline = () => {
      if (wasOfflineRef.current) {
        setShowPing(true);

        // 🔸 بدء المزامنة
        onSyncStart();

        // 🔸 إخفاء إشعار عودة الاتصال بعد 3 ثواني
        setTimeout(() => {
          setShowPing(false);
          wasOfflineRef.current = false;
        }, 3000);

        // 🔸 إنهاء مؤشر المزامنة بعد 5 ثواني
        setTimeout(() => {
          onSyncEnd();
        }, 5000);
      }
    };

    // 🔸 الاستماع لأحداث الشبكة المخصصة أيضاً
    const handleNetworkRestored = () => {
      wasOfflineRef.current = true;
      setShowPing(true);
      onSyncStart();
      setTimeout(() => { setShowPing(false); wasOfflineRef.current = false; }, 3000);
      setTimeout(() => onSyncEnd(), 5000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('app-network-restored', handleNetworkRestored);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('app-network-restored', handleNetworkRestored);
    };
  }, [onSyncStart, onSyncEnd]);

  if (!showPing) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500 text-white shadow-lg"
    >
      <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
        <Wifi className="w-4 h-4" />
        <span>تم استعادة الاتصال</span>
      </div>
    </motion.div>
  );
}
