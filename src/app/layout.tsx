import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

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
          <GlobalErrorBoundary>
            {children}
          </GlobalErrorBoundary>
          <Toaster />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 🔸 تسجيل Service Worker مع معالجة الأخطاء
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('Service Worker registration failed:', err);
                  });
                });
                
                // 🔸 تحديث Service Worker تلقائيًا عند توفر نسخة جديدة
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  console.log('Service Worker updated');
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
            `,
          }}
        />
      </body>
    </html>
  );
}
