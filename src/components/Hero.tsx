import React from 'react';
import { translations } from '../types.ts';
import { FileText, Search, Clock, ShieldCheck, CheckCircle } from 'lucide-react';

interface HeroProps {
  lang: 'ar' | 'fr';
  onRequestBtn: () => void;
  onTrackBtn: () => void;
}

export default function Hero({ lang, onRequestBtn, onTrackBtn }: HeroProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#005BAC] to-[#003B70] text-white transition-colors py-16 sm:py-24 select-none border-b-4 border-b-[#198754]">
      {/* Absolute background decoration */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
          
          {/* Main content */}
          <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-start">
            <div className={`inline-flex items-center gap-1.5 self-center lg:self-start px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 mb-8`}>
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                {lang === 'ar' ? 'البوابة الرسمية المعتمدة للحالة المدنية بالمملكة المغربية' : 'Portail Officiel Homologué de l\'État Civil au Royaume du Maroc'}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold tracking-tight text-white leading-tight">
              {t.heroTitle}
            </h1>
            
            <p className="mt-6 text-md sm:text-lg text-blue-50/90 leading-relaxed max-w-2xl">
              {t.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={onRequestBtn}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-white bg-[#198754] hover:bg-[#157145] text-base font-bold shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <FileText className="h-5 w-5" />
                <span>{t.heroRequestBtn}</span>
              </button>
              
              <button
                onClick={onTrackBtn}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-white bg-white/10 backdrop-filter backdrop-blur-md hover:bg-white/20 text-base font-bold transition-all border border-white/30 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Search className="h-5 w-5 text-emerald-300" />
                <span>{t.heroTrackBtn}</span>
              </button>
            </div>

            {/* Quick trust metrics - ALL local languages, NO ENGLISH */}
            <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-3 gap-4">
              <div>
                <span className="block text-2xl sm:text-3xl font-bold text-emerald-400">100%</span>
                <span className="text-xs sm:text-sm text-blue-100 font-medium">
                  {lang === 'ar' ? 'رقمنة كاملة' : 'Entièrement Digitalisé'}
                </span>
              </div>
              <div>
                <span className="block text-2xl sm:text-3xl font-bold text-white">&lt; 24h</span>
                <span className="text-xs sm:text-sm text-blue-100 font-medium">
                  {lang === 'ar' ? 'معدل المعالجة' : 'Délai d\'examen'}
                </span>
              </div>
              <div>
                <span className="block text-2xl sm:text-3xl font-bold text-emerald-400">
                  {lang === 'ar' ? 'آمن' : 'Sécurisé'}
                </span>
                <span className="text-xs sm:text-sm text-blue-100 font-medium">
                  {lang === 'ar' ? 'حماية مشددة' : 'Haute Sécurité'}
                </span>
              </div>
            </div>

          </div>

          {/* Graphic Side */}
          <div className="mt-12 lg:mt-0 lg:col-span-5 flex justify-center text-slate-800">
            <div className="relative w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="absolute top-4 right-4 text-[#198754] flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30 font-bold">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'نشط ومفعل' : 'Actif'}</span>
              </div>

              <h3 className="text-[#005BAC] dark:text-blue-400 font-sans text-md font-bold mb-1 uppercase tracking-wider">
                {lang === 'ar' ? 'خطوات تقديم طلبك' : 'Étapes de votre demande'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-6">
                {lang === 'ar' ? 'الخدمة الرقمية متوفرة على مدار الساعة 24/7' : 'Service disponible 24h/24, 7j/7'}
              </p>

              <div className="flex flex-col gap-5">
                {[
                  {
                    step: '٠١',
                    stepFr: '01',
                    title: lang === 'ar' ? 'إنشاء حساب أو تسجيل الدخول' : 'Inscription ou connexion',
                    desc: lang === 'ar' ? 'قم بإنشاء حسابك الآمن باستخدام الاسم الكامل ورقم بطاقتك الوطنية.' : 'Inscrivez-vous de manière sécurisée en saisissant vos données et votre CIN.',
                    bgIcon: 'bg-blue-50 text-[#005BAC] dark:bg-slate-800 dark:text-blue-400'
                  },
                  {
                    step: '٠٢',
                    stepFr: '02',
                    title: lang === 'ar' ? 'تعبئة استمارة الطلب' : 'Remplir le formulaire',
                    desc: lang === 'ar' ? 'اختر نوع الوثيقة المطلوبة، حدد عدد النسخ، وأرفق صورة بطاقتك الوطنية.' : 'Sélectionnez le document recherché et téléchargez le recto/verso de votre CIN.',
                    bgIcon: 'bg-emerald-50 text-[#198754] dark:bg-slate-800 dark:text-emerald-400'
                  },
                  {
                    step: '٠٣',
                    stepFr: '03',
                    title: lang === 'ar' ? 'التتبع المباشر والاستلام' : 'Suivi en direct et retrait',
                    desc: lang === 'ar' ? 'تتبع تقدم معالجة ملفك واستلم إشعاراً فور جاهزية وثيقتك للاستلام.' : 'Suivez son état d\'avancement et retirez-le dès réception de l\'alerte de mise à disposition.',
                    bgIcon: 'bg-amber-50 text-amber-600 dark:bg-slate-800 dark:text-amber-400'
                  }
                ].map((s, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bgIcon} font-sans font-bold text-sm`}>
                      {lang === 'ar' ? s.step : s.stepFr}
                    </span>
                    <div>
                      <h4 className="font-sans text-sm font-bold text-slate-800 dark:text-white">{s.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
