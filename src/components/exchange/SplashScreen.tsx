'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // مدة شاشة الترحيب
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800"
        >
          {/* خلفية متحركة */}
          <div className="absolute inset-0 overflow-hidden">
            {/* دوائر متحركة */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/10"
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                  y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                  scale: 0,
                }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                  y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                style={{
                  width: 20 + Math.random() * 80,
                  height: 20 + Math.random() * 80,
                }}
              />
            ))}
          </div>

          {/* المحتوى الرئيسي */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-6">
            {/* الشعار */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                delay: 0.2,
              }}
              className="relative"
            >
              {/* حلقة متحركة حول الشعار */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-4 rounded-full border-4 border-dashed border-white/30"
              />
              
              {/* دائرة الشعار */}
              <div className="relative w-28 h-28 rounded-full bg-white shadow-2xl flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <svg
                    className="w-16 h-16 text-emerald-600"
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
              </div>
            </motion.div>

            {/* اسم التطبيق */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                الراضي
              </h1>
              <p className="text-lg md:text-xl text-white/90 font-medium">
                للصرافة والحوالات
              </p>
            </motion.div>

            {/* شريط التحميل */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '200px' }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="h-1 bg-white/20 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="h-full w-1/2 bg-white rounded-full"
              />
            </motion.div>

            {/* نص التحميل */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-white/70 text-sm"
            >
              جاري التحميل...
            </motion.p>
          </div>

          {/* حقوق النشر */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute bottom-8 text-white/50 text-xs"
          >
            © {new Date().getFullYear()} جميع الحقوق محفوظة
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
