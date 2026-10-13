import React, { useState } from 'react';
import { 
  FileText, Upload, CheckCircle2, AlertCircle, Copy, Check, Download, 
  ArrowRight, ArrowLeft, Shield, Paperclip, X, Eye, Clock, User
} from 'lucide-react';
import { translations } from '../types.ts';
import { createDemande, generateNumeroSuivi, DemandeModel } from '../services/demandesService.ts';
import { validatePieceJustificative, uploadPieceJustificative, UploadedFileMeta } from '../services/storageService.ts';
import { generateReceiptPdf } from '../services/pdfService.ts';

interface DemandeFormProps {
  lang: 'ar' | 'fr';
  initialDocType?: string;
  onGoToTrack?: (numeroSuivi: string) => void;
  onCancel?: () => void;
}

export default function DemandeForm({ lang, initialDocType, onGoToTrack, onCancel }: DemandeFormProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Form State
  const [docType, setDocType] = useState<string>(initialDocType || 'extrait_naissance');
  const [numberOfCopies, setNumberOfCopies] = useState<number>(1);
  const [cin, setCin] = useState<string>('');
  const [nomComplet, setNomComplet] = useState<string>('');
  const [dateNaissance, setDateNaissance] = useState<string>('');
  const [lieuNaissance, setLieuNaissance] = useState<string>('');
  const [communeEnregistrement, setCommuneEnregistrement] = useState<string>(
    lang === 'ar' ? 'جماعة أولاد تايمة' : 'Commune d\'Ouled Teima'
  );
  const [anneeEnregistrement, setAnneeEnregistrement] = useState<string>(new Date().getFullYear().toString());
  const [numeroActe, setNumeroActe] = useState<string>('');
  const [telephone, setTelephone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [adresse, setAdresse] = useState<string>('');

  // Files State
  const [cinRectoFile, setCinRectoFile] = useState<File | null>(null);
  const [cinVersoFile, setCinVersoFile] = useState<File | null>(null);
  const [complementaryFiles, setComplementaryFiles] = useState<File[]>([]);

  // UI / Progress State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadStepMsg, setUploadStepMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [completedDemande, setCompletedDemande] = useState<DemandeModel | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Validate Act number format e.g. "234/78" or "12/2020"
  const validateActNumber = (num: string) => {
    return /^[\d]{1,6}\/[\d]{2,4}$/.test(num.trim());
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    target: 'recto' | 'verso' | 'complementaire'
  ) => {
    setErrorMessage('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === 'recto') {
      const file = files[0];
      const check = validatePieceJustificative(file, lang);
      if (!check.valid) {
        setErrorMessage(check.error || '');
        return;
      }
      setCinRectoFile(file);
    } else if (target === 'verso') {
      const file = files[0];
      const check = validatePieceJustificative(file, lang);
      if (!check.valid) {
        setErrorMessage(check.error || '');
        return;
      }
      setCinVersoFile(file);
    } else {
      // Complementary
      const newFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const check = validatePieceJustificative(file, lang);
        if (!check.valid) {
          setErrorMessage(check.error || '');
          return;
        }
        newFiles.push(file);
      }
      setComplementaryFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Field Validations
    if (!cin.trim() || !nomComplet.trim() || !dateNaissance || !lieuNaissance.trim()) {
      setErrorMessage(
        lang === 'ar' 
          ? 'يرجى ملء جميع الحقول الإلزامية الخاصة بهوية صاحب الطلب.' 
          : 'Veuillez renseigner tous les champs obligatoires du requérant.'
      );
      return;
    }

    if (!numeroActe.trim()) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى إدخال رقم رسم الولادة (مثال: 78/234).'
          : 'Veuillez saisir le numéro de l\'acte de naissance (ex: 234/78).'
      );
      return;
    }

    if (!telephone.trim()) {
      setErrorMessage(
        lang === 'ar' ? 'يرجى إدخال رقم هاتف صالح للتواصل.' : 'Veuillez renseigner un numéro de téléphone valide.'
      );
      return;
    }

    if (!adresse.trim()) {
      setErrorMessage(
        lang === 'ar' ? 'يرجى إدخال عنوان الإقامة الحالي.' : 'Veuillez renseigner votre adresse de résidence.'
      );
      return;
    }

    setIsSubmitting(true);
    const numeroSuivi = generateNumeroSuivi();

    try {
      const uploadedAttachments: UploadedFileMeta[] = [];
      let cinRectoUrl = '';
      let cinVersoUrl = '';

      // Upload CIN Recto if provided
      if (cinRectoFile) {
        setUploadStepMsg(
          lang === 'ar' 
            ? 'جاري رفع صورة الوجه الأمامي للبطاقة الوطنية...' 
            : 'Téléversement du recto de la CIN...'
        );
        const meta = await uploadPieceJustificative(numeroSuivi, cinRectoFile, 'cin_recto');
        uploadedAttachments.push(meta);
        cinRectoUrl = meta.url;
      }

      // Upload CIN Verso if provided
      if (cinVersoFile) {
        setUploadStepMsg(
          lang === 'ar' 
            ? 'جاري رفع صورة الوجه الخلفي للبطاقة الوطنية...' 
            : 'Téléversement du verso de la CIN...'
        );
        const meta = await uploadPieceJustificative(numeroSuivi, cinVersoFile, 'cin_verso');
        uploadedAttachments.push(meta);
        cinVersoUrl = meta.url;
      }

      // Upload Complementary files
      for (let i = 0; i < complementaryFiles.length; i++) {
        const file = complementaryFiles[i];
        setUploadStepMsg(
          lang === 'ar' 
            ? `جاري رفع الوثيقة المرفقة (${i + 1}/${complementaryFiles.length})...` 
            : `Téléversement du document complémentaire (${i + 1}/${complementaryFiles.length})...`
        );
        const meta = await uploadPieceJustificative(numeroSuivi, file, 'complementaire');
        uploadedAttachments.push(meta);
      }

      // Enregistrement dans Firestore (collection "demandes")
      setUploadStepMsg(
        lang === 'ar' ? 'جاري تسجيل الطلب وتوليد وصل الإيداع...' : 'Enregistrement de la demande dans la base de données...'
      );

      const demandeData: DemandeModel = {
        id: numeroSuivi,
        numeroSuivi,
        cin: cin.trim().toUpperCase(),
        nomComplet: nomComplet.trim(),
        dateNaissance,
        lieuNaissance: lieuNaissance.trim(),
        communeEnregistrement: communeEnregistrement.trim(),
        anneeEnregistrement: anneeEnregistrement.trim(),
        numeroActe: numeroActe.trim(),
        telephone: telephone.trim(),
        email: email.trim() || undefined,
        adresse: adresse.trim(),
        typeDocument: docType,
        nombreCopies: Number(numberOfCopies) || 1,
        statut: 'Nouvelle',
        cinRectoUrl,
        cinVersoUrl,
        piecesJointes: uploadedAttachments,
        notesInternes: '',
        notesCitoyen: '',
        dateRetrait: '',
        createdAt: new Date().toISOString(),
      };

      await createDemande(demandeData);
      setCompletedDemande(demandeData);
    } catch (err: any) {
      console.error('Erreur soumission demande:', err);
      setErrorMessage(
        err.message || 
        (lang === 'ar' 
          ? 'تعذر إرسال الطلب. يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً.' 
          : 'Impossible d\'envoyer la demande. Veuillez vérifier votre connexion et réessayer.')
      );
    } finally {
      setIsSubmitting(false);
      setUploadStepMsg('');
    }
  };

  const handleCopyCode = () => {
    if (!completedDemande) return;
    navigator.clipboard.writeText(completedDemande.numeroSuivi);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // SUCCESS CONFIRMATION VIEW
  if (completedDemande) {
    return (
      <div className="max-w-3xl mx-auto my-10 p-6 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl text-center">
        {/* Moroccan Success Badge */}
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-sans font-bold text-slate-900 dark:text-white tracking-tight">
          {lang === 'ar' ? 'تم تسجيل طلبكم بنجاح تام !' : 'Demande enregistrée avec succès !'}
        </h2>
        
        <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
          {lang === 'ar' 
            ? 'تم إرسال طلبكم رسمياً إلى مصلحة الحالة المدنية بجماعة أولاد تايمة. احتفظوا برقم التتبع الخاص بكم للاستعلام عن مسار المعالجة أو سحب الوثيقة.'
            : 'Votre demande a été officiellement transmise au service de l\'état civil de la Commune d\'Ouled Teima. Conservez précieusement votre numéro de suivi.'}
        </p>

        {/* Highlighted Tracking Number Box */}
        <div className="mt-8 p-6 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl max-w-md mx-auto">
          <p className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
            {lang === 'ar' ? 'رقم التتبع الخاص بطلبكم' : 'Votre Numéro de Suivi Unique'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#005BAC] dark:text-blue-400 tracking-wider">
              {completedDemande.numeroSuivi}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 text-slate-500 hover:text-[#005BAC] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
              title={lang === 'ar' ? 'نسخ الرمز' : 'Copier'}
            >
              {copiedSuccess ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          {copiedSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              {lang === 'ar' ? 'تم نسخ رقم التتبع بنجاح' : 'Numéro copié dans le presse-papiers'}
            </p>
          )}
        </div>

        {/* Download Receipt and Track Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => generateReceiptPdf(completedDemande, lang)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#198754] hover:bg-[#157145] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
          >
            <Download className="w-5 h-5" />
            <span>{lang === 'ar' ? 'تحميل وصل الإيداع الرسمي (PDF)' : 'Télécharger le Récépissé Officiel (PDF)'}</span>
          </button>

          {onGoToTrack && (
            <button
              onClick={() => onGoToTrack(completedDemande.numeroSuivi)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#005BAC] hover:bg-[#004b91] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              <Eye className="w-5 h-5" />
              <span>{lang === 'ar' ? 'تتبع حالة الطلب الآن' : 'Suivre ma demande'}</span>
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-start">
          <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">
            {lang === 'ar' ? 'تعليمات الاستلام :' : 'Consignes de retrait :'}
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>{lang === 'ar' ? 'سيتم إشعاركم فور جاهزية وثيقتكم من خلال خانة التتبع.' : 'Le statut passera à "Prêt pour retrait" après instruction de votre dossier.'}</li>
            <li>{lang === 'ar' ? 'يجب الإدلاء بالبطاقة الوطنية للتعريف الأصلية ووصل الإيداع عند سحب الوثيقة.' : 'Présentez votre CIN originale et ce récépissé au guichet communal.'}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        
        {/* Header Header */}
        <div className="bg-gradient-to-r from-[#005BAC] via-[#004b91] to-[#198754] text-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm">
              <FileText className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-tight">
                {lang === 'ar' ? 'طلب وثيقة الحالة المدنية عبر الإنترنت' : 'Demande d\'acte d\'état civil en ligne'}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5">
                {lang === 'ar' ? 'مصلحة الحالة المدنية - جماعة أولاد تايمة (خدمة مجانية ومباشرة بدون إنشاء حساب)' : 'Service de l\'État Civil - Commune d\'Ouled Teima (Sans création de compte préalable)'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs sm:text-sm flex gap-3 items-start animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Section 1: Document Details */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#005BAC] text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                {lang === 'ar' ? 'نوع الوثيقة المطلوبة وعدد النسخ' : 'Document demandé et nombre d\'exemplaires'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formDocType} <span className="text-red-500">*</span>
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium outline-none focus:border-[#005BAC]"
                >
                  <option value="extrait_naissance">{t.srvExtrait}</option>
                  <option value="copie_integrale">{t.srvCopie}</option>
                  <option value="acte_deces">{t.srvDeces}</option>
                  <option value="declaration_naissance">{t.srvNaissance}</option>
                  <option value="rectification">{t.srvRectif}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formCopies} (1 - 10) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={numberOfCopies}
                  onChange={(e) => setNumberOfCopies(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-semibold outline-none focus:border-[#005BAC]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Act & Register Information */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#005BAC] text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                {lang === 'ar' ? 'معلومات رسم الحالة المدنية بالسجل' : 'Informations du registre de l\'état civil'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'رقم رسم الولادة (مثال: 78/234)' : 'N° de l\'acte (ex: 234/78)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="234/78"
                  value={numeroActe}
                  onChange={(e) => setNumeroActe(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-mono font-bold outline-none focus:border-[#005BAC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formActYear} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1920"
                  max={new Date().getFullYear()}
                  value={anneeEnregistrement}
                  onChange={(e) => setAnneeEnregistrement(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-semibold outline-none focus:border-[#005BAC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formActOffice} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={communeEnregistrement}
                  onChange={(e) => setCommuneEnregistrement(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium outline-none focus:border-[#005BAC]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Citizen Personal Data */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#005BAC] text-white text-xs font-bold flex items-center justify-center">3</span>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                {lang === 'ar' ? 'البيانات الشخصية لصاحب الطلب' : 'Identité et coordonnées du requérant'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formFullName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'الاسم العائلي والشخصي' : 'Nom et prénom'}
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-semibold outline-none focus:border-[#005BAC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formCin} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: JH123456"
                  value={cin}
                  onChange={(e) => setCin(e.target.value.toUpperCase())}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-mono font-bold outline-none focus:border-[#005BAC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formDob} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateNaissance}
                  onChange={(e) => setDateNaissance(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-semibold outline-none focus:border-[#005BAC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formPob} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'مكان الازدياد (أولاد تايمة مثلاً)' : 'Lieu de naissance'}
                  value={lieuNaissance}
                  onChange={(e) => setLieuNaissance(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium outline-none focus:border-[#005BAC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formPhone} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="06 XX XX XX XX"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium outline-none focus:border-[#005BAC]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formEmail} ({lang === 'ar' ? 'اختياري' : 'Facultatif'})
                </label>
                <input
                  type="email"
                  placeholder="citoyen@domaine.ma"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium outline-none focus:border-[#005BAC]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.formAddress} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'العنوان الحالي بأولاد تايمة أو خارجها' : 'Adresse complète de résidence'}
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium outline-none focus:border-[#005BAC]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 4: Attachments & Justificatifs */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#005BAC] text-white text-xs font-bold flex items-center justify-center">4</span>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                {lang === 'ar' ? 'الوثائق والشهادات الداعمة (الحد الأقصى: 5 ميغابايت لكل ملف - PDF, JPG, PNG)' : 'Pièces justificatives (Max 5 Mo / fichier - PDF, JPG, PNG)'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* CIN Recto */}
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40 text-center hover:bg-slate-50 dark:hover:bg-slate-950 transition-all">
                <div className="flex flex-col items-center">
                  <Upload className="w-7 h-7 text-[#005BAC] mb-2" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {t.formCinFront}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {cinRectoFile ? cinRectoFile.name : (lang === 'ar' ? 'انقر لاختيار الملف (5 ميغابايت كحد أقصى)' : 'Cliquer pour choisir (Max 5 Mo)')}
                  </p>
                  <label className="mt-3 cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#005BAC] transition-all">
                    <span>{cinRectoFile ? (lang === 'ar' ? 'تغيير الملف' : 'Changer') : (lang === 'ar' ? 'اختيار ملف' : 'Sélectionner')}</span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => handleFileChange(e, 'recto')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* CIN Verso */}
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40 text-center hover:bg-slate-50 dark:hover:bg-slate-950 transition-all">
                <div className="flex flex-col items-center">
                  <Upload className="w-7 h-7 text-[#005BAC] mb-2" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {t.formCinBack}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {cinVersoFile ? cinVersoFile.name : (lang === 'ar' ? 'انقر لاختيار الملف (5 ميغابايت كحد أقصى)' : 'Cliquer pour choisir (Max 5 Mo)')}
                  </p>
                  <label className="mt-3 cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#005BAC] transition-all">
                    <span>{cinVersoFile ? (lang === 'ar' ? 'تغيير الملف' : 'Changer') : (lang === 'ar' ? 'اختيار ملف' : 'Sélectionner')}</span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => handleFileChange(e, 'verso')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Complementary Documents */}
              <div className="sm:col-span-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">
                      {lang === 'ar' ? 'وثائق إضافية اختيارية (دفتر العائلة، عقد قديم، إلخ)' : 'Documents complémentaires facultatifs (Livret de famille, etc.)'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lang === 'ar' ? 'يمكنكم إرفاق وثائق مساعدة بصيغة PDF أو JPG أو PNG' : 'Formats autorisés : PDF, JPG, PNG (Max 5 Mo par document)'}
                    </p>
                  </div>
                  <label className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#005BAC] transition-all">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة وثيقة' : 'Ajouter un fichier'}</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => handleFileChange(e, 'complementaire')}
                      className="hidden"
                    />
                  </label>
                </div>

                {complementaryFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {complementaryFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700">
                        <span className="truncate max-w-xs text-slate-700 dark:text-slate-300">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setComplementaryFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{lang === 'ar' ? 'معالجة آمنة مشفرة ومطابقة للقوانين المغربية' : 'Traitement sécurisé et conforme aux lois marocaines'}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#005BAC] hover:bg-[#004b91] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                <span>
                  {isSubmitting
                    ? uploadStepMsg || (lang === 'ar' ? 'جاري الإرسال...' : 'Envoi en cours...')
                    : (lang === 'ar' ? 'إرسال الطلب الآن' : 'Soumettre la demande')}
                </span>
                {!isSubmitting && (isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
