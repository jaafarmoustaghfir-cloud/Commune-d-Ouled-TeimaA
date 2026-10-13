import React from 'react';
import { Megaphone, Calendar, Tag } from 'lucide-react';

interface Announcement {
  id: number;
  titleAr: string;
  titleFr: string;
  contentAr: string;
  contentFr: string;
  category: string;
  createdAt: string;
}

interface AnnouncementsProps {
  lang: 'ar' | 'fr';
  list: Announcement[];
}

export default function Announcements({ lang, list }: AnnouncementsProps) {
  const isRTL = lang === 'ar';

  return (
    <section className="py-16 bg-white dark:bg-slate-900 transition-colors duration-200" id="announcements-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16">
        
        <div className="flex items-center gap-3 mb-8 justify-center sm:justify-start">
          <Megaphone className="h-6 w-6 text-[#005BAC] dark:text-blue-400" />
          <h2 className="text-2xl font-sans font-bold text-slate-900 dark:text-white tracking-tight">
            {lang === 'ar' ? 'مستجدات وإعلانات الإدارة' : 'Actualités et Communiqués Officiels'}
          </h2>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
            <p className="text-slate-500 text-sm">
              {lang === 'ar' ? 'لا توجد إعلانات منشورة حالياً.' : 'Aucun communiqué publié pour le moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {list.map((item) => {
               const formattedDate = item.createdAt 
                 ? new Date(item.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                     day: 'numeric',
                     month: 'long',
                     year: 'numeric'
                   })
                 : '';

               // Localize categories beautifully
               const localizedCategory = lang === 'ar'
                 ? (item.category === 'news' ? 'أخبار' : item.category === 'update' ? 'تحديث هام' : 'إعلان عام')
                 : (item.category === 'news' ? 'Actualité' : item.category === 'update' ? 'Important' : 'Communiqué');

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Tag & Date */}
                    <div className="flex items-center justify-between gap-4 mb-4 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-[#198754] dark:text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">
                        <Tag className="h-3 w-3" />
                        {localizedCategory}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {formattedDate}
                      </span>
                    </div>

                    <h3 className="text-lg font-sans font-bold text-slate-900 dark:text-white mb-3">
                      {lang === 'ar' ? item.titleAr : item.titleFr}
                    </h3>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {lang === 'ar' ? item.contentAr : item.contentFr}
                    </p>
                  </div>
                  
                  <div className="mt-6 border-t border-slate-50 dark:border-slate-700/50 pt-3 text-[10px] text-slate-400 text-end font-sans font-semibold">
                    {lang === 'ar' ? 'بلاغ رسمي - جماعة أولاد تايمة' : 'Communiqué officiel - Commune d\'Ouled Teima'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
