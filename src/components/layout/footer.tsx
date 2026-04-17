'use client';

import { Coins, Phone, MapPin, Clock, Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto relative">
      {/* Decorative top edge */}
      <div className="h-0.5 bg-gradient-to-l from-amber-500/40 via-amber-400/60 to-amber-500/40" />

      <div className="bg-gradient-to-l from-emerald-800 via-emerald-700 to-emerald-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-start gap-3">
                <div className="bg-amber-500/90 rounded-xl p-2 shadow-sm">
                  <Coins className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">الراضي للصرافة والحوالات</h3>
                  <p className="text-emerald-200/70 text-sm mt-1.5 leading-relaxed">
                    خدمات صرافة وحوالات موثوقة منذ سنوات. نقدم أفضل أسعار الصرف وأسرع خدمات التحويل.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 bg-white/5 rounded-lg px-3 py-2 w-fit">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs text-emerald-200/80">مرخص ومعتمد رسمياً</span>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <h4 className="font-semibold text-amber-400 flex items-center gap-2">
                <div className="h-1 w-4 bg-amber-400/60 rounded-full" />
                تواصل معنا
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-emerald-200/80">
                  <div className="bg-white/8 rounded-md p-1.5">
                    <Phone className="h-3 w-3 text-emerald-300" />
                  </div>
                  <span dir="ltr">+963-11-123-4567</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-emerald-200/80">
                  <div className="bg-white/8 rounded-md p-1.5">
                    <MapPin className="h-3 w-3 text-emerald-300" />
                  </div>
                  <span>دمشق - سوريا</span>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="space-y-3">
              <h4 className="font-semibold text-amber-400 flex items-center gap-2">
                <div className="h-1 w-4 bg-amber-400/60 rounded-full" />
                ساعات العمل
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-emerald-200/80">
                  <div className="bg-white/8 rounded-md p-1.5">
                    <Clock className="h-3 w-3 text-emerald-300" />
                  </div>
                  <span>السبت - الخميس: 8:00 ص - 8:00 م</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-emerald-200/80">
                  <div className="bg-white/8 rounded-md p-1.5">
                    <Clock className="h-3 w-3 text-emerald-300" />
                  </div>
                  <span>الجمعة: 10:00 ص - 4:00 م</span>
                </div>
              </div>
            </div>

            {/* Quick Links / Services */}
            <div className="space-y-3">
              <h4 className="font-semibold text-amber-400 flex items-center gap-2">
                <div className="h-1 w-4 bg-amber-400/60 rounded-full" />
                خدماتنا
              </h4>
              <ul className="space-y-1.5 text-sm text-emerald-200/80">
                <li className="hover:text-white transition-colors cursor-pointer">تحويل العملات</li>
                <li className="hover:text-white transition-colors cursor-pointer">الحوالات المالية</li>
                <li className="hover:text-white transition-colors cursor-pointer">إدارة الحسابات</li>
                <li className="hover:text-white transition-colors cursor-pointer">الاستشارات المالية</li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-emerald-600/40 mt-8 pt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-emerald-300/60 text-xs">
                © {new Date().getFullYear()} الراضي للصرافة والحوالات - جميع الحقوق محفوظة
              </p>
              <p className="text-emerald-300/40 text-xs">
                تصميم وتطوير بكل احترافية
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
