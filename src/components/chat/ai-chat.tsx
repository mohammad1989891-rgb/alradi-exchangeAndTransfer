'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, Sparkles, Trash2, WifiOff, Wifi } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'ما هي أسعار الصرف اليوم؟',
  'كيف أرسل حوالة؟',
  'ما هي ساعات العمل؟',
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'مرحباً بك! 👋 أنا المساعد الذكي لشركة الراضي للصرافة والحوالات. يمكنني مساعدتك في الاستفسار عن أسعار الصرف، خدمات الحوالات، والمزيد. كيف يمكنني مساعدتك اليوم؟',
  timestamp: new Date(),
};

const messageAnimation = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.97 },
  transition: { duration: 0.25, ease: 'easeOut' },
};

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [sessionId] = useState(
    () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🔸 مراقبة حالة الاتصال
  useEffect(() => {
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      // 🔸 التحقق من الاتصال بالإنترنت قبل الإرسال
      if (!navigator.onLine) {
        const offlineMessage: Message = {
          id: `offline-${Date.now()}`,
          role: 'assistant',
          content: '📡 أنت غير متصل بالإنترنت حالياً. المساعد الذكي يتطلب اتصالاً بالإنترنت للعمل. يرجى المحاولة لاحقاً عند استعادة الاتصال.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, offlineMessage]);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, sessionId }),
        });

        const data = await res.json();

        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.success
            ? data.response
            : 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'عذراً، لم أتمكن من الاتصال بالخادم. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, sessionId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Card className="shadow-md border-0 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-xl p-2">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                المساعد الذكي
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isOnline ? (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-emerald-200/80 text-xs">متصل الآن</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-amber-300" />
                    <span className="text-amber-200/80 text-xs">غير متصل</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
              aria-label="مسح المحادثة"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="max-h-[400px]">
        <div className="p-4 space-y-4" dir="rtl">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                {...messageAnimation}
                className={`flex ${
                  msg.role === 'user' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-l from-emerald-600 to-emerald-700 text-white rounded-bl-sm'
                      : 'bg-gray-100 text-gray-800 rounded-br-sm'
                  }`}
                >
                  {/* AI avatar indicator */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[11px] font-medium text-emerald-700">
                        المساعد الذكي
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <p
                    className={`text-[10px] mt-2 ${
                      msg.role === 'user'
                        ? 'text-emerald-200/60'
                        : 'text-gray-400'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex justify-end"
              >
                <div className="bg-gray-100 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bot className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[11px] font-medium text-emerald-700">
                      المساعد الذكي
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                    <span className="text-sm text-gray-500">
                      جاري التفكير...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Suggested Questions */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-4 pb-3" dir="rtl">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <motion.button
                key={question}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-full px-3.5 py-1.5 transition-colors font-medium"
              >
                {question}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-gray-100" />

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-4 flex items-center gap-2"
        dir="rtl"
      >
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="اكتب رسالتك هنا..."
          disabled={isLoading}
          className="flex-1 border-gray-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm h-10"
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 gap-1.5 shrink-0 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="text-sm">إرسال</span>
        </Button>
      </form>
    </Card>
  );
}
