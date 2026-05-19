'use client';

import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, RefreshCw, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * 🔸 مكون كشف حالة الاتصال + إشعار تحديث التطبيق
 * يعرض شريطاً عند فقدان الاتصال أو توفر تحديث
 * 
 * ⚠️ لا يُصيَّر على الخادم لمنع Hydration Mismatch
 */
export function OfflineDetector() {
  // 🔸 لا نعرض شيء حتى يتم التحميل على العميل (لمنع Hydration Mismatch)
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
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
          <OnlinePing key="online-ping" />
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
    </>
  );
}

/**
 * 🔸 نبضة قصيرة عند عودة الاتصال
 */
function OnlinePing() {
  const [showPing, setShowPing] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setWasOffline(true);
    const handleOnline = () => {
      if (wasOffline) {
        setShowPing(true);
        setTimeout(() => setShowPing(false), 3000);
        setWasOffline(false);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [wasOffline]);

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
