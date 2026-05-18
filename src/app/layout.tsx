import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { OfflineDetector } from "@/components/OfflineDetector";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "الراضي للصرافة والحوالات",
  description: "تطبيق الراضي لإدارة الصرافة والحوالات المالية",
  keywords: ["صرافة", "حوالات", "عملات", "محاسبة", "الراضي"],
  authors: [{ name: "الراضي للصرافة والحوالات" }],
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "الراضي للصرافة",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "الراضي للصرافة والحوالات",
    title: "الراضي للصرافة والحوالات",
    description: "تطبيق الراضي لإدارة الصرافة والحوالات المالية",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className={`${cairo.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OfflineDetector />
          <GlobalErrorBoundary>
            {children}
          </GlobalErrorBoundary>
          <Toaster />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 🔸 تسجيل Service Worker مع دعم كامل للعمل بدون إنترنت
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('SW registered:', registration.scope);
                      
                      // 🔸 فحص تحديثات عند عودة الاتصال
                      window.addEventListener('online', function() {
                        registration.update();
                      });
                      
                      // 🔸 الاستماع لتحديثات SW
                      registration.addEventListener('updatefound', function() {
                        var newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // 🔸 يوجد تحديث جديد - نرسل رسالة للتطبيق
                              window.dispatchEvent(new CustomEvent('sw-update-available'));
                            }
                          });
                        }
                      });
                    })
                    .catch(function(err) {
                      console.warn('SW registration failed:', err);
                    });
                  
                  // 🔸 عند تغيير المتحكم (بعد تحديث SW)
                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (!refreshing) {
                      refreshing = true;
                      console.log('SW controller changed - page will reload');
                    }
                  });
                });
                
                // 🔸 تخزين الملفات الثابتة بعد تحميل الصفحة
                window.addEventListener('load', function() {
                  // 🔸 انتظار 3 ثواني بعد التحميل ثم طلب تخزين الموارد
                  setTimeout(function() {
                    if (navigator.serviceWorker.controller) {
                      // 🔸 جمع كل الروابط الموجودة في الصفحة لتخزينها
                      var urls = [];
                      var links = document.querySelectorAll('link[rel="stylesheet"], script[src]');
                      links.forEach(function(link) {
                        var href = link.getAttribute('href') || link.getAttribute('src');
                        if (href && href.startsWith('/') && !href.startsWith('/api')) {
                          urls.push(href);
                        }
                      });
                      if (urls.length > 0) {
                        navigator.serviceWorker.controller.postMessage({
                          type: 'CACHE_URLS',
                          urls: urls
                        });
                      }
                    }
                  }, 3000);
                });
              }
              
              // 🔸 معالجة الأخطاء غير الملتقطة لمنع تعطل التطبيق
              window.addEventListener('error', function(event) {
                console.error('Uncaught error:', event.error);
                event.preventDefault();
              });
              
              window.addEventListener('unhandledrejection', function(event) {
                console.error('Unhandled promise rejection:', event.reason);
                event.preventDefault();
              });
              
              // 🔸 منع التحديث التلقائي المزعج
              // لا نعيد تحميل الصفحة تلقائياً عند تحديث SW
              // بل نترك المستخدم يقرر متى يحدّث
            `,
          }}
        />
      </body>
    </html>
  );
}
