'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SYPDisplayVersion = 'NEW' | 'OLD';

interface SYPSettingsState {
  /** إصدار العرض الحالي (جديد/قديم) */
  displayVersion: SYPDisplayVersion;
  /** تبديل إصدار العرض */
  toggleDisplayVersion: () => void;
  /** تعيين إصدار العرض */
  setDisplayVersion: (version: SYPDisplayVersion) => void;
}

/**
 * مخزن إعدادات عرض الليرة السورية
 * - يُخزّن محلياً (localStorage) للاستمرار عبر الجلسات
 * - الإصدار الافتراضي: جديد (NEW)
 */
export const useSYPSettings = create<SYPSettingsState>()(
  persist(
    (set) => ({
      displayVersion: 'NEW',
      toggleDisplayVersion: () =>
        set((state) => ({
          displayVersion: state.displayVersion === 'NEW' ? 'OLD' : 'NEW',
        })),
      setDisplayVersion: (version) => set({ displayVersion: version }),
    }),
    {
      name: 'syp-display-settings',
    }
  )
);
