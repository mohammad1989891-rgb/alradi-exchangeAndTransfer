'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * 🔸 Error Boundary شامل لمنع الشاشة البيضاء
 * يلتقط أي خطأ في المكونات الفرعية ويعرض رسالة واضحة
 * مع خيار إعادة المحاولة
 */
export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 Global Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    // 🔸 تنظيف الكاش وإعادة التحميل
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isRepeatedError = this.state.errorCount > 2;
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                حدث خطأ غير متوقع
              </h2>
              <p className="text-muted-foreground text-sm">
                {isRepeatedError
                  ? 'يبدو أن المشكلة مستمرة. يرجى تحديث الصفحة بالكامل.'
                  : 'لا تقلق، بياناتك محفوظة بأمان. يمكنك إعادة المحاولة.'}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-xs text-left bg-muted p-3 rounded-lg overflow-auto max-h-32" dir="ltr">
                <code className="text-red-500">{this.state.error.message}</code>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
              
              {isRepeatedError && (
                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="gap-2"
                >
                  تحديث الصفحة
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
