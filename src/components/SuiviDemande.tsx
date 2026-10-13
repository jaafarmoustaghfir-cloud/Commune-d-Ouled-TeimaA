import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, CheckCircle2, Clock, AlertTriangle, XCircle, 
  Download, Calendar, User, MapPin, Phone, ShieldCheck, RefreshCw, ArrowRight, ArrowLeft
} from 'lucide-react';
import { translations } from '../types.ts';
import { getDemandeByNumero, DemandeModel, formatDemandeDate, StatutDemande } from '../services/demandesService.ts';
import { generateReceiptPdf } from '../services/pdfService.ts';

interface SuiviDemandeProps {
  lang: 'ar' | 'fr';
  initialTrackingNumber?: string;
  onNewRequest?: () => void;
}

export default function SuiviDemande({ lang, initialTrackingNumber, onNewRequest }: SuiviDemandeProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [numeroSuivi, setNumeroSuivi] = useState<string>(initialTrackingNumber || '');
  const [demande, setDemande] = useState<DemandeModel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchDemande = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) {
      setErrorMsg(
        lang === 'ar' ? 'يرجى إدخال رقم التتبع الخاص بطلبكم.' : 'Veuillez saisir votre numéro de suivi.'
      );
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSearched(true);

    try {
      const result = await getDemandeByNumero(codeToSearch.trim().toUpperCase());
      if (result) {
        setDemande(result);
      } else {
        setDemande(null);
        setErrorMsg(
          lang === 'ar'
            ? 'لم يتم العثور على أي طلب مسجل بهذا الرقم. يرجى التحقق من صحة الرمز المدخل (مثال: OT-2026-123456).'
            : 'Aucun dossier trouvé avec ce numéro. Veuillez vérifier le code saisi (ex : OT-2026-123456).'
        );
      }
    } catch (err: any) {
      console.error('Erreur recherche suivi:', err);
      setErrorMsg(
        lang === 'ar'
          ? 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
          : 'Erreur lors de la récupération du dossier. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingNumber) {
      fetchDemande(initialTrackingNumber);
    }
  }, [initialTrackingNumber]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDemande(numeroSuivi);
  };

  // Helper for status progress styling
  const getStatusBadge = (statut: StatutDemande) => {
    switch (statut) {
      case 'Nouvelle':
        return {
          color: 'bg-blue-100 text-[#005BAC] dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900',
          icon: Clock,
          labelAr: 'طلب جديد مسجل',
          labelFr: 'Demande enregistrée',
        };
      case 'En cours':
        return {
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
          icon: RefreshCw,
          labelAr: 'قيد المعالجة الإدارية',
          labelFr: 'En cours de traitement',
        };
      case 'Pièces manquantes':
        return {
          color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900',
          icon: AlertTriangle,
          labelAr: 'وثائق ناقصة مطلوبة',
          labelFr: 'Pièces manquantes requises',
        };
      case 'Prêt pour retrait':
        return {
          color: 'bg-emerald-100 text-[#198754] dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
          icon: CheckCircle2,
          labelAr: 'جاهز للاستلام بمقر الجماعة',
          labelFr: 'Prêt pour retrait au guichet',
        };
      case 'Délivré':
        return {
          color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 dark:border-teal-900',
          icon: CheckCircle2,
          labelAr: 'تم التسليم بنجاح',
          labelFr: 'Document délivré',
        };
      case 'Rejetée':
        return {
          color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900',
          icon: XCircle,
          labelAr: 'الطلب مرفوض',
          labelFr: 'Demande rejetée',
        };
      default:
        return {
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
          icon: Clock,
          labelAr: statut,
          labelFr: statut,
        };
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'extrait_naissance':
        return lang === 'ar' ? 'نسخة موجزة من رسم الولادة' : 'Extrait d\'acte de naissance';
      case 'copie_integrale':
        return lang === 'ar' ? 'نسخة كاملة من رسم الولادة' : 'Copie intégrale de naissance';
      case 'acte_deces':
        return lang === 'ar' ? 'شهادة الوفاة' : 'Acte de décès';
      case 'declaration_naissance':
        return lang === 'ar' ? 'التصريح بولادة جديدة' : 'Déclaration de naissance';
      case 'rectification':
        return lang === 'ar' ? 'تصحيح الحالة المدنية' : 'Rectification d\'état civil';
      default:
        return type;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      
      {/* Title Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-[#005BAC] dark:text-blue-400 mb-3 border border-blue-200 dark:border-blue-900/40">
          <ShieldCheck className="w-4 h-4" />
          <span>{lang === 'ar' ? 'خدمة الاستعلام الفوري' : 'Suivi en temps réel'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-sans font-bold text-slate-900 dark:text-white tracking-tight">
          {lang === 'ar' ? 'تتبع حالة طلب وثيقة الحالة المدنية' : 'Suivi de votre demande d\'état civil'}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
          {lang === 'ar'
            ? 'أدخل رقم التتبع الفريد المسجل في وصل الإيداع الخاص بك للاطلاع على تقدم ملفك وتاريخ استلام الوثيقة.'
            : 'Saisissez votre numéro de suivi officiel pour consulter l\'état d\'avancement de votre dossier et la date de retrait.'}
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-lg max-w-2xl mx-auto mb-10">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className={`absolute inset-y-0 ${isRTL ? 'right-3.5' : 'left-3.5'} flex items-center pointer-events-none text-slate-400`}>
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder={lang === 'ar' ? 'مثال: OT-2026-784912' : 'Ex : OT-2026-784912'}
              value={numeroSuivi}
              onChange={(e) => setNumeroSuivi(e.target.value.toUpperCase())}
              className={`w-full ${isRTL ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold text-sm outline-none focus:border-[#005BAC] transition-all`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-7 py-3.5 bg-[#005BAC] hover:bg-[#004b91] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>{lang === 'ar' ? 'بحث وتتبع' : 'Rechercher'}</span>
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Demande Result Display */}
      {demande && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fadeIn">
          
          {/* Card Top Banner */}
          <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {lang === 'ar' ? 'رقم التتبع المعتمد' : 'Numéro de suivi officiel'}
              </span>
              <span className="font-mono text-2xl font-extrabold text-[#005BAC] dark:text-blue-400">
                {demande.numeroSuivi}
              </span>
            </div>

            {/* Status Badge */}
            <div>
              {(() => {
                const badge = getStatusBadge(demande.statut);
                const IconComp = badge.icon;
                return (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border ${badge.color}`}>
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span>{lang === 'ar' ? badge.labelAr : badge.labelFr}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            
            {/* Visual Step Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-4">
                {lang === 'ar' ? 'مراحل معالجة الطلب' : 'Progression du traitement'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  {
                    step: 1,
                    titleAr: 'إيداع الطلب',
                    titleFr: 'Dépôt',
                    active: true,
                    done: true,
                  },
                  {
                    step: 2,
                    titleAr: 'المراجعة الإدارية',
                    titleFr: 'Instruction',
                    active: ['En cours', 'Prêt pour retrait', 'Délivré'].includes(demande.statut),
                    done: ['Prêt pour retrait', 'Délivré'].includes(demande.statut),
                  },
                  {
                    step: 3,
                    titleAr: 'جاهز للاستلام',
                    titleFr: 'Prêt pour retrait',
                    active: ['Prêt pour retrait', 'Délivré'].includes(demande.statut),
                    done: demande.statut === 'Délivré',
                  },
                  {
                    step: 4,
                    titleAr: 'تم التسليم',
                    titleFr: 'Délivré',
                    active: demande.statut === 'Délivré',
                    done: demande.statut === 'Délivré',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      item.active
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-[#005BAC] dark:text-blue-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-400 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${item.active ? 'bg-[#005BAC] text-white' : 'bg-slate-300 text-slate-600'}`}>
                          {item.step}
                        </span>
                      )}
                      <span>{lang === 'ar' ? item.titleAr : item.titleFr}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visible Citizen Notes Alert (if any) */}
            {demande.notesCitoyen && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300">
                <div className="flex items-center gap-2 mb-1.5 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'ar' ? 'ملاحظات وتوجيهات الإدارة :' : 'Instructions de l\'administration :'}</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed pl-6">{demande.notesCitoyen}</p>
              </div>
            )}

            {/* Date of Withdrawal (if specified) */}
            {demande.dateRetrait && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">
                    {lang === 'ar' ? 'موعد الاستلام المحدد :' : 'Date de retrait fixée :'}
                  </span>
                  <span className="text-sm font-semibold">{demande.dateRetrait}</span>
                </div>
              </div>
            )}

            {/* Request Summary Information */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-950/20">
              <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-4">
                {lang === 'ar' ? 'تفاصيل الطلب المسجل' : 'Détails du dossier enregistré'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'صاحب الطلب :' : 'Nom complet :'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{demande.nomComplet}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'رقم البطاقة الوطنية (محمي) :' : 'CIN (protégé) :'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tracking-widest">
                    {demande.cin ? `${demande.cin.slice(0, 2)}${'•'.repeat(Math.max(2, demande.cin.length - 4))}${demande.cin.slice(-2)}` : '••••'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'نوع الوثيقة :' : 'Document demandé :'}</span>
                  <span className="font-bold text-[#005BAC] dark:text-blue-400">{getDocTypeLabel(demande.typeDocument)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'عدد النسخ :' : 'Nombre d\'exemplaires :'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{demande.nombreCopies}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'رقم وسنة رسم الولادة :' : 'N° Acte / Année :'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{demande.numeroActe} / {demande.anneeEnregistrement}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'تاريخ ومكان الازدياد :' : 'Date & Lieu de naissance :'}</span>
                  <span className="text-slate-900 dark:text-white">{demande.dateNaissance} ({demande.lieuNaissance})</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'تاريخ إيداع الطلب :' : 'Date de dépôt :'}</span>
                  <span className="text-slate-900 dark:text-white">{formatDemandeDate(demande.createdAt, lang)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'ar' ? 'مقر الاستلام :' : 'Lieu de retrait :'}</span>
                  <span className="font-semibold text-[#198754] dark:text-emerald-400">{lang === 'ar' ? 'مقر جماعة أولاد تايمة' : 'Commune d\'Ouled Teima'}</span>
                </div>
              </div>
            </div>

            {/* Actions: Download Receipt & Refresh */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => fetchDemande(demande.numeroSuivi)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#005BAC] dark:hover:text-blue-400 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{lang === 'ar' ? 'تحديث المعطيات' : 'Actualiser l\'état'}</span>
              </button>

              <button
                onClick={() => generateReceiptPdf(demande, lang)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#198754] hover:bg-[#157145] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تحميل وصل الإيداع (PDF)' : 'Télécharger le Récépissé (PDF)'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* New Request Callout if nothing found or to start new */}
      {!demande && searched && onNewRequest && (
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 mb-3">
            {lang === 'ar' ? 'ترغب في تقديم طلب جديد للحصول على وثيقة ؟' : 'Vous souhaitez soumettre une nouvelle demande ?'}
          </p>
          <button
            onClick={onNewRequest}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all"
          >
            <FileText className="w-4 h-4 text-[#005BAC]" />
            <span>{lang === 'ar' ? 'تقديم طلب وثيقة جديدة' : 'Déposer une nouvelle demande'}</span>
          </button>
        </div>
      )}

    </div>
  );
}
