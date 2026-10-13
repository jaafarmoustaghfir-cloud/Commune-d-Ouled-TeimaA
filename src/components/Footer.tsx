import React from 'react';
import { translations } from '../types.ts';
import { Phone, Mail, MapPin, Clock, ShieldCheck, Landmark } from 'lucide-react';

interface FooterProps {
  lang: 'ar' | 'fr';
}

export default function Footer({ lang }: FooterProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  return (
    <footer className="bg-slate-900 text-slate-300 dark:bg-slate-950 pt-16 pb-8 border-t-4 border-t-[#198754] transition-colors select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* Logo and About */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3.5">
              <div className="relative p-0.5 bg-white rounded-full">
                <img 
                  src="https://i.imgur.com/y0NHtSU.png" 
                  alt="Commune d'Ouled Teima" 
                  className="h-14 w-14 object-contain rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-bold text-lg text-white tracking-tight">
                  {t.siteTitle}
                </span>
                <span className="font-sans text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  {t.siteSubtitle}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {lang === 'ar' 
                ? 'البوابة الإلكترونية الرسمية المعتمدة لمصلحة الحالة المدنية التابعة لجماعة أولاد تايمة. نهدف لرقمنة وتسهيل المساطر الإدارية وتوفير الخدمات عن بعد لكافة المواطنين.'
                : 'Le portail électronique officiel homologué du Bureau de l\'État Civil de la Commune d\'Ouled Teima. Notre objectif est de digitaliser et simplifier l\'accès aux documents administratifs.'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-sans text-md font-bold tracking-wide border-b border-slate-800 pb-3">
              {t.contactUs}
            </h3>
            <ul className="flex flex-col gap-4 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#005BAC] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{t.addressVal}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[#198754] shrink-0" />
                <span dir="ltr" className="font-semibold">{t.phoneVal}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-400 shrink-0" />
                <span className="hover:text-white transition-colors">{t.emailVal}</span>
              </li>
            </ul>
          </div>

          {/* Working Hours */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-sans text-md font-bold tracking-wide border-b border-slate-800 pb-3">
              {t.workingHours}
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 text-sm text-slate-400">
                <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">{t.workingHoursVal}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {lang === 'ar' 
                      ? 'مغلق في عطل نهاية الأسبوع والأعياد الوطنية الرسمية.' 
                      : 'Fermé durant les week-ends et les jours fériés nationaux officiels.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? 'بوابة حكومية آمنة ومحمية بالكامل.'
                    : 'Portail gouvernemental sécurisé et entièrement protégé.'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} {t.siteTitle} - {t.siteSubtitle}.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <Landmark className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-sans text-[11px] font-bold">
              {lang === 'ar' ? 'المملكة المغربية' : 'Royaume du Maroc'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
