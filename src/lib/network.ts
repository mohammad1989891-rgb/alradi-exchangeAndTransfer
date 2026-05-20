/**
 * 🔸 وحدة أدوات الشبكة
 * توفر وظائف للتعامل مع حالات الشبكة المختلفة:
 * - إعادة المحاولة التلقائية عند فشل الطلب
 * - كشف حالة الاتصال
 * - إدارة أحداث الشبكة
 * - Timeout مناسب للطلبات
 */

// 🔸 ثوابت
const DEFAULT_TIMEOUT = 10000; // 10 ثواني
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // ثانية واحدة
const MAX_RETRY_DELAY = 10000; // 10 ثواني كحد أقصى

// ============================================
// 🔸 كشف حالة الاتصال
// ============================================

/**
 * التحقق من حالة الاتصال الحالية
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true; // SSR
  return navigator.onLine;
}

/**
 * التحقق من دعم Service Worker
 */
export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

// ============================================
// 🔸 fetch مع إعادة المحاولة و Timeout
// ============================================

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;       // Timeout بالملي ثانية
  retries?: number;       // عدد مرات إعادة المحاولة
  retryDelay?: number;    // التأخير بين المحاولات بالملي ثانية
  retryOn?: number[];     // رموز الحالة HTTP التي يجب إعادة المحاولة عليها
  requireOnline?: boolean; // هل الطلب يتطلب اتصالاً بالإنترنت؟
}

/**
 * تنفيذ طلب fetch مع:
 * - Timeout لمنع الانتظار اللانهائي
 * - إعادة المحاولة التلقائية عند الفشل
 * - تخطي الطلب إذا كان الجهاز غير متصل (للطلبات التي تتطلب إنترنت)
 * - Exponential backoff بين المحاولات
 */
export async function fetchWithRetry<T = Response>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryOn = [408, 429, 500, 502, 503, 504],
    requireOnline = false,
    ...fetchOptions
  } = options;

  // 🔸 إذا كان الطلب يتطلب إنترنت والجهاز غير متصل، نرمي خطأ فوراً
  if (requireOnline && !isOnline()) {
    throw new NetworkError('لا يوجد اتصال بالإنترنت', 'OFFLINE');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 🔸 إضافة Timeout لمنع الانتظار اللانهائي
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 🔸 دمج إشارة الإلغاء مع أي إشارة موجودة
      const signal = fetchOptions.signal
        ? combineAbortSignals(fetchOptions.signal, controller.signal)
        : controller.signal;

      const response = await fetch(url, {
        ...fetchOptions,
        signal,
      });

      clearTimeout(timeoutId);

      // 🔸 التحقق من حالة الاستجابة
      if (!response.ok) {
        // 🔸 إذا كانت حالة HTTP تستدعي إعادة المحاولة
        if (retryOn.includes(response.status) && attempt < retries) {
          const delay = calculateBackoff(attempt, retryDelay);
          console.warn(`طلب فشل (${response.status})، إعادة المحاولة ${attempt}/${retries} بعد ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        throw new NetworkError(
          `فشل الطلب: ${response.status} ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      // 🔸 إذا كان الرد من نوع JSON، نحوله تلقائياً
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return (await response.json()) as T;
      }

      return response as unknown as T;

    } catch (error) {
      clearTimeout(undefined as unknown as number); // تنظيف أي timeout متبقي

      if (error instanceof NetworkError) {
        // 🔸 إذا كان خطأ HTTP لا يستدعي إعادة المحاولة، نرميه فوراً
        if (error.status && !retryOn.includes(error.status)) {
          throw error;
        }
        lastError = error;
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new NetworkError('انتهت مهلة الطلب (Timeout)', 'TIMEOUT');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // 🔸 خطأ شبكة - لا يوجد اتصال
        lastError = new NetworkError('فشل الاتصال بالخادم', 'NETWORK_ERROR');
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // 🔸 إعادة المحاولة مع exponential backoff
      if (attempt < retries) {
        const delay = calculateBackoff(attempt, retryDelay);
        console.warn(`محاولة ${attempt}/${retries} فشلت، إعادة المحاولة بعد ${delay}ms...`, lastError.message);
        await sleep(delay);
      }
    }
  }

  // 🔸 فشلت جميع المحاولات
  throw lastError || new NetworkError('فشلت جميع المحاولات', 'MAX_RETRIES_EXCEEDED');
}

// ============================================
// 🔸 أحداث الشبكة المخصصة
// ============================================

type NetworkEventHandler = (isOnline: boolean) => void;

const networkListeners = new Set<NetworkEventHandler>();
let isMonitoringNetwork = false;
let lastKnownOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;

/**
 * بدء مراقبة أحداث الشبكة
 */
function startNetworkMonitoring() {
  if (isMonitoringNetwork || typeof window === 'undefined') return;
  isMonitoringNetwork = true;

  const handleOnline = () => {
    lastKnownOnlineState = true;
    // 🔸 إطلاق حدث مخصص لعودة الاتصال
    window.dispatchEvent(new CustomEvent('app-network-restored', {
      detail: { timestamp: Date.now() }
    }));
    // 🔸 إعلام جميع المستمعين
    networkListeners.forEach(listener => {
      try { listener(true); } catch (e) { console.error('Network listener error:', e); }
    });
  };

  const handleOffline = () => {
    lastKnownOnlineState = false;
    // 🔸 إطلاق حدث مخصص لفقدان الاتصال
    window.dispatchEvent(new CustomEvent('app-network-lost', {
      detail: { timestamp: Date.now() }
    }));
    // 🔸 إعلام جميع المستمعين
    networkListeners.forEach(listener => {
      try { listener(false); } catch (e) { console.error('Network listener error:', e); }
    });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // 🔸 تخزين مراجع للتنظيف
  (startNetworkMonitoring as any)._cleanup = () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    isMonitoringNetwork = false;
  };
}

/**
 * الاشتراك في أحداث الشبكة
 * @returns دالة لإلغاء الاشتراك
 */
export function onNetworkChange(handler: NetworkEventHandler): () => void {
  startNetworkMonitoring();
  networkListeners.add(handler);

  // 🔸 إرسال الحالة الحالية فوراً
  try { handler(lastKnownOnlineState); } catch (e) { /* تجاهل */ }

  return () => {
    networkListeners.delete(handler);
  };
}

/**
 * الحصول على آخر حالة شبكة معروفة
 */
export function getLastKnownNetworkState(): boolean {
  return lastKnownOnlineState;
}

// ============================================
// 🔸 فئة أخطاء الشبكة
// ============================================

export class NetworkError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly isNetworkError: boolean = true;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.status = status;
  }
}

/**
 * التحقق مما إذا كان الخطأ خطأ شبكة
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError || (error as any)?.isNetworkError === true;
}

// ============================================
// 🔸 أدوات مساعدة
// ============================================

/**
 * حساب التأخير مع Exponential Backoff
 */
function calculateBackoff(attempt: number, baseDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  // 🔸 إضافة jitter عشوائي لتجنب thundering herd
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, MAX_RETRY_DELAY);
}

/**
 * تأخير بسيط
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * دمج إشارتي إلغاء (AbortSignal)
 */
function combineAbortSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const onAbort = () => {
    controller.abort();
    cleanup();
  };

  const cleanup = () => {
    signal1.removeEventListener('abort', onAbort);
    signal2.removeEventListener('abort', onAbort);
  };

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
    return controller.signal;
  }

  signal1.addEventListener('abort', onAbort);
  signal2.addEventListener('abort', onAbort);

  return controller.signal;
}

// ============================================
// 🔸 واجهة طلب API مع معالجة الشبكة
// ============================================

interface ApiCallOptions {
  timeout?: number;
  retries?: number;
  offlineFallback?: () => any;
}

/**
 * تنفيذ طلب API مع دعم كامل للشبكة
 * - إذا كان الجهاز متصلاً: ينفذ الطلب عادياً مع retry
 * - إذا كان الجهاز غير متصل: يستخدم offlineFallback إن وُجد
 */
export async function safeApiCall<T>(
  url: string,
  options: RequestInit = {},
  apiOptions: ApiCallOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, retries = 2, offlineFallback } = apiOptions;

  // 🔸 إذا كان الجهاز غير متصل ولدينا بديل محلي
  if (!isOnline() && offlineFallback) {
    console.warn('الجهاز غير متصل، استخدام البديل المحلي');
    return offlineFallback() as T;
  }

  try {
    const result = await fetchWithRetry<T>(url, {
      ...options,
      timeout,
      retries,
    });
    return result;
  } catch (error) {
    // 🔸 إذا فشل الطلب ولدينا بديل محلي
    if (offlineFallback) {
      console.warn('فشل الطلب، استخدام البديل المحلي:', (error as Error).message);
      return offlineFallback() as T;
    }
    throw error;
  }
}
