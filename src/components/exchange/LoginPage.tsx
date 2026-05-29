'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { loginUser, initializeDefaultUser } from '@/lib/supabaseDb';
import { Loader2, Eye, EyeOff, Lock, User } from 'lucide-react';

interface LoginPageProps {
  onLogin: (userId: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // تهيئة المستخدم الافتراضي
    const init = async () => {
      await initializeDefaultUser();
      setIsInitialized(true);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم المستخدم وكلمة المرور',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginUser(username, password);
      
      if (result.success && result.user) {
        toast({
          title: 'مرحباً بك',
          description: `تم تسجيل الدخول بنجاح`,
        });
        onLogin(result.user.id);
      } else {
        toast({
          title: 'خطأ في تسجيل الدخول',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* الشعار */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center">
            <svg
              className="w-12 h-12 text-emerald-600"
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
        </motion.div>

        {/* العنوان */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">الراضي</h1>
          <p className="text-white/80">للصرافة والحوالات</p>
        </motion.div>

        {/* نموذج تسجيل الدخول */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* حقل اسم المستخدم */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">
                اسم المستخدم
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="pr-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* حقل كلمة المرور */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="pr-10 pl-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* زر تسجيل الدخول */}
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري التحقق...
                </>
              ) : (
                'دخول'
              )}
            </Button>
          </form>

          {/* معلومات افتراضية */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 bg-gray-50 rounded-lg"
          >
            <p className="text-xs text-gray-500 text-center">
              <span className="font-medium">بيانات الدخول الافتراضية:</span>
              <br />
              المستخدم: <code className="bg-gray-200 px-1 rounded">admin</code>
              {' | '}
              كلمة المرور: <code className="bg-gray-200 px-1 rounded">admin</code>
            </p>
          </motion.div>
        </motion.div>

        {/* حقوق النشر */}
        <p className="text-center text-white/50 text-xs mt-6">
          © {new Date().getFullYear()} الراضي للصرافة والحوالات
        </p>
      </motion.div>
    </div>
  );
}
