import React from 'react';
import { translations } from '../types.ts';
import { FileText, Award, UserX, FilePlus, RefreshCw, Calendar, Eye, ShieldAlert } from 'lucide-react';

interface ServicesProps {
  lang: 'ar' | 'fr';
  onSelectService: (serviceId: string) => void;
}

export default function Services({ lang, onSelectService }: ServicesProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const servicesList = [
    {
      id: 'extrait_naissance',
      title: t.srvExtrait,
      desc: lang === 'ar' 
        ? 'احصل على نسخة موجزة من رسم الولادة مستخرجة من سجلات الحالة المدنية الأصلية لجماعة أولاد تايمة.' 
        : 'Demandez l\'extrait officiel de votre acte de naissance issu du registre de la commune.',
      icon: FileText,
      color: 'blue'
    },
    {
      id: 'copie_integrale',
      title: t.srvCopie,
      desc: lang === 'ar' 
        ? 'نسخة كاملة ومطابقة للأصل من رسم الولادة تتضمن جميع البيانات الهامشية والتسجيلات الرسمية.' 
        : 'Copie intégrale et certifiée conforme mentionnant l\'ensemble des annotations marginales.',
      icon: Award,
      color: 'blue'
    },
    {
      id: 'acte_deces',
      title: t.srvDeces,
      desc: lang === 'ar' 
        ? 'طلب استخراج شهادة الوفاة المسجلة لغرض تقديمها للمؤسسات والمصالح الإدارية.' 
        : 'Demandez la délivrance d\'un acte de décès enregistré auprès de notre commune.',
      icon: UserX,
      color: 'green'
    },
    {
      id: 'declaration_naissance',
      title: t.srvNaissance,
      desc: lang === 'ar' 
        ? 'التصريح الأولي بولادة طفل جديد لتسجيله رسمياً في سجلات مصلحة الحالة المدنية.' 
        : 'Démarche préliminaire pour déclarer et enregistrer la naissance d\'un nouveau-né.',
      icon: FilePlus,
      color: 'green'
    },
    {
      id: 'rectification',
      title: t.srvRectif,
      desc: lang === 'ar' 
        ? 'تقديم طلب لتصحيح الأخطاء المادية أو الإملائية الواردة في سجلات أو وثائق الحالة المدنية.' 
        : 'Introduisez une demande pour rectifier une erreur matérielle ou d\'orthographe sur un acte.',
      icon: RefreshCw,
      color: 'amber'
    },
    {
      id: 'appointment',
      title: t.srvRdv,
      desc: lang === 'ar' 
        ? 'احجز موعداً مسبقاً لتفادي الانتظار وتسهيل معاملاتك الحضورية بمقر جماعة أولاد تايمة.' 
        : 'Prenez rendez-vous en ligne pour programmer votre visite physique et gagner du temps.',
      icon: Calendar,
      color: 'amber'
    },
    {
      id: 'track',
      title: t.srvSuivi,
      desc: lang === 'ar' 
        ? 'تتبع حالة طلباتك الحالية، واعرف ما إذا كانت جاهزة للاستلام أو تتطلب وثائق إضافية.' 
        : 'Consultez en temps réel l\'état de traitement de vos demandes administratives en cours.',
      icon: Eye,
      color: 'blue'
    },
  ];

  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16 text-center">
        
        <h2 className="text-3xl font-sans font-bold text-slate-900 dark:text-white tracking-tight">
          {t.servicesTitle}
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          {t.servicesSubtitle}
        </p>

        {/* Services Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {servicesList.map((srv) => {
            const IconComp = srv.icon;
            
            // Resolve color schemes with exact palette values
            let iconContainerClasses = '';
            let borderHoverClass = '';
            let textHoverClass = '';

            if (srv.color === 'blue') {
              iconContainerClasses = 'bg-blue-50 text-[#005BAC] border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40';
              borderHoverClass = 'hover:border-b-[#005BAC]';
              textHoverClass = 'group-hover:text-[#005BAC] dark:group-hover:text-blue-400';
            } else if (srv.color === 'green') {
              iconContainerClasses = 'bg-emerald-50 text-[#198754] border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
              borderHoverClass = 'hover:border-b-[#198754]';
              textHoverClass = 'group-hover:text-[#198754] dark:group-hover:text-emerald-400';
            } else {
              iconContainerClasses = 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40';
              borderHoverClass = 'hover:border-b-amber-500';
              textHoverClass = 'group-hover:text-amber-600 dark:group-hover:text-amber-400';
            }

            return (
              <div
                key={srv.id}
                onClick={() => onSelectService(srv.id)}
                className={`group relative flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-200 cursor-pointer border-b-4 border-b-transparent ${borderHoverClass} hover:shadow-md transform hover:-translate-y-1`}
              >
                {/* Icon Wrapper */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${iconContainerClasses} mb-4 transition-transform duration-200 group-hover:scale-105`}>
                  <IconComp className="h-6 w-6" />
                </div>

                <h3 className={`font-sans font-bold text-base text-slate-900 dark:text-white ${textHoverClass} transition-colors`}>
                  {srv.title}
                </h3>
                
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs flex-1">
                  {srv.desc}
                </p>

                <div className="mt-5 flex justify-center w-full pt-4 border-t border-slate-50 dark:border-slate-800/60">
                  <span className={`text-xs font-bold ${srv.color === 'green' ? 'text-[#198754]' : 'text-[#005BAC]'} dark:text-blue-400 flex items-center gap-1 group-hover:underline`}>
                    {lang === 'ar' ? 'ولوج الخدمة ←' : 'Accéder au service →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-12 p-6 rounded-2xl border border-slate-100 bg-white shadow-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-4 max-w-4xl mx-auto">
          <ShieldAlert className="h-5 w-5 text-[#005BAC] dark:text-blue-400 shrink-0" />
          <p className="text-start leading-relaxed">
            {lang === 'ar'
              ? 'إن جميع الوثائق المستخرجة والمسلمة عبر هذه البوابة تحمل توقيعاً رقمياً معتمداً ورمز استجابة سريعة (QR Code) فريد يثبت صلاحيتها ومطابقتها التامة للأصول الممسوكة بسجلات الجماعة.'
              : 'Tous les documents délivrés via ce portail intègrent une signature numérique homologuée et un QR code unique certifiant leur conformité totale avec les registres de la commune.'}
          </p>
        </div>

      </div>
    </section>
  );
}
