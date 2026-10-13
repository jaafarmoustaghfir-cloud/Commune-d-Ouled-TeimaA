import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { translations } from '../types.ts';
import { 
  FileText, Search, CheckCircle, XCircle, AlertCircle, AlertTriangle, Eye, Printer, 
  Calendar, Download, RefreshCw, Filter, Layers, Clock, ShieldCheck, 
  User, MapPin, Phone, Mail, FileDown, Check, ExternalLink, X, Paperclip, ChevronRight,
  ZoomIn, Maximize2, CheckCircle2
} from 'lucide-react';
import { 
  DemandeModel, StatutDemande, subscribeDemandes, updateDemande, 
  formatDemandeDate 
} from '../services/demandesService.ts';
import { 
  getPiecesForDemande, 
  updatePieceVerification, 
  PieceModel, 
  PieceResume 
} from '../services/piecesService.ts';
import { generateReceiptPdf, generateOfficialCivilDocumentPdf } from '../services/pdfService.ts';

interface EmployeeDashboardProps {
  lang: 'ar' | 'fr';
  token?: string;
  user?: any;
}

export default function EmployeeDashboard({ lang, user }: EmployeeDashboardProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Real-time Firestore Demandes List
  const [demandes, setDemandes] = useState<DemandeModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string>('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');

  // Selected Demande for Details Drawer / Modal
  const [selectedDemande, setSelectedDemande] = useState<DemandeModel | null>(null);

  // Edit fields for selected Demande
  const [editStatus, setEditStatus] = useState<StatutDemande>('Nouvelle');
  const [editNotesInternes, setEditNotesInternes] = useState<string>('');
  const [editNotesCitoyen, setEditNotesCitoyen] = useState<string>('');
  const [editDateRetrait, setEditDateRetrait] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string>('');

  // Pieces from subcollection for the selected demand
  const [piecesList, setPiecesList] = useState<PieceModel[]>([]);
  const [piecesLoading, setPiecesLoading] = useState<boolean>(false);
  const [previewModalPiece, setPreviewModalPiece] = useState<PieceModel | null>(null);
  const [rejectModalPiece, setRejectModalPiece] = useState<PieceModel | null>(null);
  const [rejectMotif, setRejectMotif] = useState<string>('');
  const [verifyingPieceId, setVerifyingPieceId] = useState<string | null>(null);

  // Load pieces from subcollection when a demande is selected
  useEffect(() => {
    if (selectedDemande) {
      setPiecesLoading(true);
      getPiecesForDemande(selectedDemande.numeroSuivi)
        .then((pieces) => {
          setPiecesList(pieces);
        })
        .catch((err) => {
          console.error('Erreur chargement pièces subcollection:', err);
        })
        .finally(() => {
          setPiecesLoading(false);
        });
    } else {
      setPiecesList([]);
      setPreviewModalPiece(null);
      setRejectModalPiece(null);
    }
  }, [selectedDemande?.numeroSuivi]);

  // Validation d'une pièce par l'agent
  const handleValidatePiece = async (piece: PieceModel) => {
    if (!selectedDemande) return;
    setVerifyingPieceId(piece.id);
    const agentEmail = user?.email || 'agent@ouledteima.ma';

    try {
      await updatePieceVerification(selectedDemande.numeroSuivi, piece.id, 'validee', agentEmail);
      const updatedList = piecesList.map((p) =>
        p.id === piece.id
          ? { ...p, statut: 'validee' as const, verifiePar: agentEmail, verifieLe: new Date() }
          : p
      );
      setPiecesList(updatedList);

      const updatedResume: PieceResume[] = updatedList.map((p) => ({
        id: p.id,
        categorie: p.categorie,
        nom: p.nom,
        type: p.type,
        statut: p.statut,
        motifRefus: p.motifRefus,
      }));

      await updateDemande(selectedDemande.numeroSuivi, {
        piecesResume: updatedResume,
      });

      setSelectedDemande((prev) => (prev ? { ...prev, piecesResume: updatedResume } : null));
    } catch (err: any) {
      console.error('Erreur validation pièce:', err);
    } finally {
      setVerifyingPieceId(null);
    }
  };

  // Ouverture du dialogue de refus d'une pièce
  const handleOpenRejectPiece = (piece: PieceModel) => {
    setRejectModalPiece(piece);
    setRejectMotif(lang === 'ar' ? 'صورة غير واضحة أو باهتة' : 'Document illisible ou image floue');
  };

  // Confirmation du refus d'une pièce avec motif
  const handleConfirmRejectPiece = async () => {
    if (!selectedDemande || !rejectModalPiece) return;
    setVerifyingPieceId(rejectModalPiece.id);
    const agentEmail = user?.email || 'agent@ouledteima.ma';
    const motif =
      rejectMotif.trim() ||
      (lang === 'ar' ? 'وثيقة غير مطابقة أو غير واضحة' : 'Document non conforme ou illisible');

    try {
      // 1. Enregistre dans la pièce : statut: 'refusee', motifRefus, verifiePar, verifieLe
      await updatePieceVerification(
        selectedDemande.numeroSuivi,
        rejectModalPiece.id,
        'refusee',
        agentEmail,
        motif
      );

      const updatedList = piecesList.map((p) =>
        p.id === rejectModalPiece.id
          ? {
              ...p,
              statut: 'refusee' as const,
              motifRefus: motif,
              verifiePar: agentEmail,
              verifieLe: new Date(),
            }
          : p
      );
      setPiecesList(updatedList);

      // 2. Si une pièce est refusée : statut de la demande passe à "Pièces manquantes",
      // l'agent saisit un motif, et le citoyen voit ce motif dans la page de suivi
      const noticeCitoyen =
        lang === 'ar'
          ? `وثائق غير مقبولة (${rejectModalPiece.nom}): ${motif}. يرجى الحضور إلى شباك الحالة المدنية مع الأصل لتسوية الطلب.`
          : `Pièce refusée (${rejectModalPiece.nom}) : ${motif}. Veuillez vous présenter au guichet municipal avec vos originaux physiques.`;

      const updatedResume: PieceResume[] = updatedList.map((p) => ({
        id: p.id,
        categorie: p.categorie,
        nom: p.nom,
        type: p.type,
        statut: p.statut,
        motifRefus: p.motifRefus,
      }));

      await updateDemande(selectedDemande.numeroSuivi, {
        statut: 'Pièces manquantes',
        piecesStatut: 'echec',
        notesCitoyen: noticeCitoyen,
        piecesResume: updatedResume,
      });

      setEditStatus('Pièces manquantes');
      setEditNotesCitoyen(noticeCitoyen);
      setSelectedDemande((prev) =>
        prev
          ? {
              ...prev,
              statut: 'Pièces manquantes',
              piecesStatut: 'echec',
              notesCitoyen: noticeCitoyen,
              piecesResume: updatedResume,
            }
          : null
      );

      setRejectModalPiece(null);
    } catch (err: any) {
      console.error('Erreur refus pièce:', err);
    } finally {
      setVerifyingPieceId(null);
    }
  };

  // Téléchargement d'une pièce
  const downloadPieceFile = (piece: PieceModel) => {
    const link = document.createElement('a');
    link.href = piece.dataUrl;
    link.download = piece.nom || `${piece.categorie}.${piece.type === 'application/pdf' ? 'pdf' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real-time Firestore subscription
  useEffect(() => {
    setLoading(true);
    setFirestoreError('');

    const unsubscribe = subscribeDemandes(
      (items) => {
        setDemandes(items);
        setLoading(false);
      },
      (error) => {
        console.error('Erreur Firestore demandes:', error);
        setFirestoreError(
          lang === 'ar'
            ? 'تعذر تحميل الطلبات في الوقت الفعلي من قاعدة البيانات.'
            : 'Impossible de synchroniser les demandes en temps réel depuis Firestore.'
        );
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [lang]);

  // When a demande is opened, sync local edit state
  useEffect(() => {
    if (selectedDemande) {
      setEditStatus(selectedDemande.statut || 'Nouvelle');
      setEditNotesInternes(selectedDemande.notesInternes || '');
      setEditNotesCitoyen(selectedDemande.notesCitoyen || '');
      setEditDateRetrait(selectedDemande.dateRetrait || '');
      setUpdateSuccessMsg('');
    }
  }, [selectedDemande]);

  // Keep selectedDemande updated when the realtime list updates
  useEffect(() => {
    if (selectedDemande) {
      const fresh = demandes.find((d) => d.id === selectedDemande.id);
      if (fresh) {
        setSelectedDemande(fresh);
      }
    }
  }, [demandes]);

  // Filtered & Searched list
  const filteredDemandes = demandes.filter((item) => {
    // Status filter
    if (statusFilter !== 'all' && item.statut !== statusFilter) {
      return false;
    }
    // Document type filter
    if (docTypeFilter !== 'all' && item.typeDocument !== docTypeFilter) {
      return false;
    }
    // Search text
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const matchCin = item.cin?.toLowerCase().includes(term);
      const matchName = item.nomComplet?.toLowerCase().includes(term);
      const matchNum = item.numeroSuivi?.toLowerCase().includes(term);
      const matchPhone = item.telephone?.toLowerCase().includes(term);
      const matchActe = item.numeroActe?.toLowerCase().includes(term);
      if (!matchCin && !matchName && !matchNum && !matchPhone && !matchActe) {
        return false;
      }
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: demandes.length,
    nouvelles: demandes.filter((d) => d.statut === 'Nouvelle').length,
    enCours: demandes.filter((d) => d.statut === 'En cours').length,
    manquantes: demandes.filter((d) => d.statut === 'Pièces manquantes').length,
    pretes: demandes.filter((d) => d.statut === 'Prêt pour retrait').length,
    delivrees: demandes.filter((d) => d.statut === 'Délivré').length,
    rejetees: demandes.filter((d) => d.statut === 'Rejetée').length,
  };

  // Status badge config
  const getStatusBadge = (statut: StatutDemande) => {
    switch (statut) {
      case 'Nouvelle':
        return {
          bg: 'bg-blue-50 text-[#005BAC] dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
          dot: 'bg-[#005BAC]',
          labelAr: 'طلب جديد',
          labelFr: 'Nouvelle',
        };
      case 'En cours':
        return {
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
          dot: 'bg-amber-500',
          labelAr: 'قيد المعالجة',
          labelFr: 'En cours',
        };
      case 'Pièces manquantes':
        return {
          bg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900',
          dot: 'bg-orange-500',
          labelAr: 'وثائق ناقصة',
          labelFr: 'Pièces manquantes',
        };
      case 'Prêt pour retrait':
        return {
          bg: 'bg-emerald-50 text-[#198754] dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
          dot: 'bg-[#198754]',
          labelAr: 'جاهز للاستلام',
          labelFr: 'Prêt pour retrait',
        };
      case 'Délivré':
        return {
          bg: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900',
          dot: 'bg-teal-600',
          labelAr: 'تم التسليم',
          labelFr: 'Délivré',
        };
      case 'Rejetée':
        return {
          bg: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900',
          dot: 'bg-red-500',
          labelAr: 'مرفوضة',
          labelFr: 'Rejetée',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
          dot: 'bg-slate-400',
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

  // Export to Excel function using xlsx
  const handleExportExcel = () => {
    const dataToExport = filteredDemandes.map((d) => ({
      [lang === 'ar' ? 'رقم التتبع' : 'N° Suivi']: d.numeroSuivi,
      [lang === 'ar' ? 'الحالة' : 'Statut']: d.statut,
      [lang === 'ar' ? 'صاحب الطلب' : 'Nom Complet']: d.nomComplet,
      [lang === 'ar' ? 'رقم البطاقة الوطنية' : 'CIN']: d.cin,
      [lang === 'ar' ? 'نوع الوثيقة' : 'Type Document']: getDocTypeLabel(d.typeDocument),
      [lang === 'ar' ? 'عدد النسخ' : 'Copies']: d.nombreCopies,
      [lang === 'ar' ? 'رقم رسم الولادة' : 'N° Acte']: d.numeroActe,
      [lang === 'ar' ? 'سنة الرسم' : 'Année Acte']: d.anneeEnregistrement,
      [lang === 'ar' ? 'جماعة التسجيل' : 'Commune']: d.communeEnregistrement,
      [lang === 'ar' ? 'الهاتف' : 'Téléphone']: d.telephone,
      [lang === 'ar' ? 'البريد الإلكتروني' : 'Email']: d.email || '-',
      [lang === 'ar' ? 'العنوان' : 'Adresse']: d.adresse,
      [lang === 'ar' ? 'تاريخ الإيداع' : 'Date Dépôt']: formatDemandeDate(d.createdAt, 'fr'),
      [lang === 'ar' ? 'تاريخ الاستلام' : 'Date Retrait']: d.dateRetrait || '-',
      [lang === 'ar' ? 'ملاحظات داخلية' : 'Notes Internes']: d.notesInternes || '-',
      [lang === 'ar' ? 'ملاحظات للمواطن' : 'Notes Citoyen']: d.notesCitoyen || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes_Etat_Civil');

    const fileName = `Demandes_Etat_Civil_Ouled_Teima_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Save changes to selected Demande
  const handleSaveDemandeChanges = async () => {
    if (!selectedDemande) return;
    setIsUpdating(true);
    setUpdateSuccessMsg('');

    try {
      await updateDemande(selectedDemande.numeroSuivi, {
        statut: editStatus,
        notesInternes: editNotesInternes,
        notesCitoyen: editNotesCitoyen,
        dateRetrait: editDateRetrait,
      });

      setUpdateSuccessMsg(
        lang === 'ar' ? 'تم تحديث بيانات الطلب بنجاح في قاعدة البيانات.' : 'Demande mise à jour avec succès dans Firestore.'
      );
      setTimeout(() => setUpdateSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
      alert(
        lang === 'ar'
          ? 'حدث خطأ أثناء حفظ التعديلات.'
          : 'Erreur lors de l\'enregistrement des modifications.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{lang === 'ar' ? 'اتصال مباشر متزامن مع Firestore' : 'Connecté en temps réel à Firestore'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-sans font-bold text-slate-900 dark:text-white tracking-tight">
            {lang === 'ar' ? 'لوحة تحكم موظفي الحالة المدنية' : 'Tableau de Bord des Officiers d\'État Civil'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar' 
              ? 'تدبير ومعالجة طلبات المواطنين، مراجعة الوثائق المرفقة، وتوليد الرسوم الرسمية' 
              : 'Gestion des demandes d\'actes, instruction des pièces jointes et délivrance officielle'}
          </p>
        </div>

        {/* Header Action: Export Excel */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={filteredDemandes.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#198754] hover:bg-[#157145] text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير جدول Excel' : 'Exporter Excel'}</span>
          </button>
        </div>
      </div>

      {/* Statistics Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {[
          { labelAr: 'مجموع الطلبات', labelFr: 'Total', count: stats.total, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-900' },
          { labelAr: 'جديدة', labelFr: 'Nouvelles', count: stats.nouvelles, color: 'text-[#005BAC] dark:text-blue-400', bg: 'bg-blue-50/50 dark:bg-blue-950/20' },
          { labelAr: 'قيد المعالجة', labelFr: 'En cours', count: stats.enCours, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
          { labelAr: 'وثائق ناقصة', labelFr: 'Manquantes', count: stats.manquantes, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50/50 dark:bg-orange-950/20' },
          { labelAr: 'جاهزة للسحب', labelFr: 'Prêtes', count: stats.pretes, color: 'text-[#198754] dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
          { labelAr: 'تم التسليم', labelFr: 'Délivrées', count: stats.delivrees, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50/50 dark:bg-teal-950/20' },
          { labelAr: 'مرفوضة', labelFr: 'Rejetées', count: stats.rejetees, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50/50 dark:bg-red-950/20' },
        ].map((c, i) => (
          <div key={i} className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-800 ${c.bg} shadow-xs`}>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {lang === 'ar' ? c.labelAr : c.labelFr}
            </span>
            <span className={`text-2xl font-extrabold font-mono ${c.color}`}>{c.count}</span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <div className={`absolute inset-y-0 ${isRTL ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث بالاسم، CIN، أو رقم التتبع...' : 'Recherche par nom, CIN, n° suivi...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#005BAC]`}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold">{lang === 'ar' ? 'الحالة :' : 'Statut :'}</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:border-[#005BAC]"
            >
              <option value="all">{lang === 'ar' ? 'جميع الحالات' : 'Tous les statuts'}</option>
              <option value="Nouvelle">{lang === 'ar' ? 'جديدة' : 'Nouvelle'}</option>
              <option value="En cours">{lang === 'ar' ? 'قيد المعالجة' : 'En cours'}</option>
              <option value="Pièces manquantes">{lang === 'ar' ? 'وثائق ناقصة' : 'Pièces manquantes'}</option>
              <option value="Prêt pour retrait">{lang === 'ar' ? 'جاهز للاستلام' : 'Prêt pour retrait'}</option>
              <option value="Délivré">{lang === 'ar' ? 'تم التسليم' : 'Délivré'}</option>
              <option value="Rejetée">{lang === 'ar' ? 'مرفوضة' : 'Rejetée'}</option>
            </select>
          </div>

          {/* Doc Type filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold">{lang === 'ar' ? 'نوع الوثيقة :' : 'Document :'}</span>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:border-[#005BAC]"
            >
              <option value="all">{lang === 'ar' ? 'جميع الوثائق' : 'Tous les actes'}</option>
              <option value="extrait_naissance">{lang === 'ar' ? 'نسخة موجزة' : 'Extrait'}</option>
              <option value="copie_integrale">{lang === 'ar' ? 'نسخة كاملة' : 'Copie intégrale'}</option>
              <option value="acte_deces">{lang === 'ar' ? 'شهادة الوفاة' : 'Acte de décès'}</option>
              <option value="declaration_naissance">{lang === 'ar' ? 'تصريح بالولادة' : 'Déclaration'}</option>
              <option value="rectification">{lang === 'ar' ? 'تصحيح الحالة' : 'Rectification'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-[#005BAC] animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">{t.loading}</p>
          </div>
        ) : filteredDemandes.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">{t.noData}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'رقم التتبع' : 'N° Suivi'}</th>
                  <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'صاحب الطلب' : 'Citoyen'}</th>
                  <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'رقم البطاقة' : 'CIN'}</th>
                  <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'نوع الوثيقة' : 'Document'}</th>
                  <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'رسم وسنة الولادة' : 'Acte / Année'}</th>
                  <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'تاريخ الإيداع' : 'Date dépôt'}</th>
                  <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'الحالة' : 'Statut'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredDemandes.map((item) => {
                  const badge = getStatusBadge(item.statut);
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedDemande(item)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#005BAC] dark:text-blue-400">
                        {item.numeroSuivi}
                      </td>
                      <td className="py-3 px-4 font-semibold">{item.nomComplet}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{item.cin}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {getDocTypeLabel(item.typeDocument)}
                        {item.nombreCopies > 1 && (
                          <span className="ml-1 text-[11px] text-slate-400">({item.nombreCopies}x)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {item.numeroActe} / {item.anneeEnregistrement}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {formatDemandeDate(item.createdAt, lang)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{lang === 'ar' ? badge.labelAr : badge.labelFr}</span>
                          </span>
                          {(item.piecesStatut === 'echec' || (!item.cinRectoUrl && (!item.piecesJointes || item.piecesJointes.length === 0))) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>{lang === 'ar' ? 'وثائق ناقصة' : 'Pièces manquantes'}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDemande(item);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#005BAC] dark:text-blue-400 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                        >
                          {lang === 'ar' ? 'معاينة' : 'Ouvrir'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedDemande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Top Header */}
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-[#005BAC] dark:text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {lang === 'ar' ? 'تفاصيل ملف الطلب :' : 'Dossier de demande :'}
                    </h2>
                    <span className="font-mono font-extrabold text-[#005BAC] dark:text-blue-400 text-lg">
                      {selectedDemande.numeroSuivi}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDemandeDate(selectedDemande.createdAt, lang)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDemande(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              
              {/* Alert Feedback */}
              {updateSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>{updateSuccessMsg}</span>
                </div>
              )}

              {/* Citizen & Act Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Requerant Info */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/30">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#005BAC]" />
                    <span>{lang === 'ar' ? 'معلومات صاحب الطلب' : 'Identité du requérant'}</span>
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'الاسم الكامل :' : 'Nom complet :'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedDemande.nomComplet}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'رقم البطاقة (CIN) :' : 'CIN :'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedDemande.cin}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'تاريخ ومكان الازدياد :' : 'Date / Lieu naiss. :'}</span>
                      <span>{selectedDemande.dateNaissance} ({selectedDemande.lieuNaissance})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'رقم الهاتف :' : 'Téléphone :'}</span>
                      <span className="font-mono">{selectedDemande.telephone}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'البريد الإلكتروني :' : 'Email :'}</span>
                      <span>{selectedDemande.email || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">{lang === 'ar' ? 'عنوان الإقامة :' : 'Adresse :'}</span>
                      <span className="text-start">{selectedDemande.adresse}</span>
                    </div>
                  </div>
                </div>

                {/* Act Registry Info */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/30">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#198754]" />
                    <span>{lang === 'ar' ? 'بيانات رسم الحالة المدنية بالسجل' : 'Données du registre d\'état civil'}</span>
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'نوع الوثيقة المطلوبة :' : 'Type d\'acte :'}</span>
                      <span className="font-bold text-[#005BAC] dark:text-blue-400">{getDocTypeLabel(selectedDemande.typeDocument)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'عدد النسخ :' : 'Nombre de copies :'}</span>
                      <span className="font-bold">{selectedDemande.nombreCopies}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'رقم رسم الولادة :' : 'N° Acte :'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedDemande.numeroActe}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{lang === 'ar' ? 'سنة التسجيل بالسجل :' : 'Année d\'enregistrement :'}</span>
                      <span className="font-mono font-bold">{selectedDemande.anneeEnregistrement}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">{lang === 'ar' ? 'جماعة التسجيل :' : 'Commune d\'enregistrement :'}</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{selectedDemande.communeEnregistrement}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Attachments & Inspection Section (Subcollection Firestore) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-950/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#005BAC]" />
                    <span>{lang === 'ar' ? 'فحص ومطابقة الوثائق المرفقة (مسؤولية الموظف)' : 'Vérification et conformité des pièces jointes'}</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'مستخرجة من قاعدة البيانات Firestore' : 'Documents extraits de Firestore'}
                  </span>
                </div>

                {/* Missing pieces alert if piecesStatut is echec or demand is flagged */}
                {(selectedDemande.piecesStatut === 'echec' || selectedDemande.statut === 'Pièces manquantes' || (piecesList.length === 0 && !piecesLoading)) && (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">
                        {lang === 'ar' ? 'تنبيه: وثائق ناقصة أو غير مطابقة' : 'Attention : Pièces manquantes ou non conformes'}
                      </span>
                      <span>
                        {lang === 'ar'
                          ? 'يمكن للموظف رفض الوثيقة غير المقروءة لتحويل الطلب تلقائياً إلى "وثائق ناقصة" وإشعار المواطن بالحضور للشباك.'
                          : 'L\'agent peut refuser une pièce illisible pour basculer la demande en "Pièces manquantes" et inviter le citoyen au guichet.'}
                      </span>
                    </div>
                  </div>
                )}

                {piecesLoading ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#005BAC]" />
                    <span className="text-xs font-semibold">
                      {lang === 'ar' ? 'جاري تحميل وثائق الطلب من السيرفر...' : 'Chargement des pièces justificatives...'}
                    </span>
                  </div>
                ) : piecesList.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-slate-400 text-xs italic">
                      {lang === 'ar' ? 'لم يتم إرفاق أي ملفات في هذا الطلب.' : 'Aucun fichier joint à cette demande.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {piecesList.map((piece) => {
                      const isImage = piece.dataUrl?.startsWith('data:image') || piece.type?.startsWith('image/');
                      const isPdf = piece.type === 'application/pdf' || piece.nom?.toLowerCase().endsWith('.pdf');

                      const categoryLabel = 
                        piece.categorie === 'cin_recto'
                          ? (lang === 'ar' ? 'البطاقة الوطنية (الوجه الأمامي)' : 'CIN Recto (Face avant)')
                          : piece.categorie === 'cin_verso'
                          ? (lang === 'ar' ? 'البطاقة الوطنية (الوجه الخلفي)' : 'CIN Verso (Face arrière)')
                          : (lang === 'ar' ? 'وثيقة تكميلية' : 'Document complémentaire');

                      return (
                        <div
                          key={piece.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            piece.statut === 'validee'
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                              : piece.statut === 'refusee'
                              ? 'bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div>
                            {/* Header: Category & Status */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  {categoryLabel}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block max-w-[200px]" title={piece.nom}>
                                  {piece.nom}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {piece.statut === 'validee' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{lang === 'ar' ? 'مصادق عليها' : 'Validée'}</span>
                                  </span>
                                ) : piece.statut === 'refusee' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">
                                    <XCircle className="w-3 h-3 text-red-600" />
                                    <span>{lang === 'ar' ? 'مرفوضة' : 'Refusée'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>{lang === 'ar' ? 'قيد التحقق' : 'En attente'}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Refusal Reason banner if rejected */}
                            {piece.statut === 'refusee' && piece.motifRefus && (
                              <div className="mb-3 p-2 rounded-lg bg-red-100/70 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-[11px] text-red-800 dark:text-red-300 flex items-start gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                                <div>
                                  <span className="font-bold">{lang === 'ar' ? 'سبب الرفض : ' : 'Motif : '}</span>
                                  <span>{piece.motifRefus}</span>
                                </div>
                              </div>
                            )}

                            {/* Preview Thumbnail */}
                            <div className="my-2 relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center min-h-[140px] max-h-[180px]">
                              {isImage ? (
                                <>
                                  <img
                                    src={piece.dataUrl}
                                    alt={piece.nom}
                                    className="w-full h-full object-contain max-h-[170px] cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => setPreviewModalPiece(piece)}
                                  />
                                  <button
                                    onClick={() => setPreviewModalPiece(piece)}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs"
                                  >
                                    <ZoomIn className="w-5 h-5" />
                                    <span>{lang === 'ar' ? 'تكبير وفحص' : 'Agrandir / Zoom'}</span>
                                  </button>
                                </>
                              ) : isPdf ? (
                                <div className="p-4 flex flex-col items-center justify-center gap-2 text-center w-full">
                                  <FileText className="w-12 h-12 text-rose-500" />
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                                    {piece.nom}
                                  </span>
                                  <button
                                    onClick={() => downloadPieceFile(piece)}
                                    className="text-xs text-[#005BAC] dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{lang === 'ar' ? 'فتح أو تحميل PDF' : 'Télécharger / Ouvrir'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="p-4 text-xs text-slate-400 italic">
                                  {lang === 'ar' ? 'ملف مرفق' : 'Fichier joint'}
                                </div>
                              )}
                            </div>

                            {/* Audit info if verified */}
                            {piece.verifiePar && (
                              <p className="text-[10px] text-slate-400 italic mb-3">
                                {lang === 'ar' ? `تم التدقيق بواسطة: ${piece.verifiePar}` : `Vérifié par : ${piece.verifiePar}`}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons for the Agent */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              {isImage && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewModalPiece(piece)}
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-[#005BAC] bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all"
                                  title={lang === 'ar' ? 'تكبير' : 'Agrandir'}
                                >
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => downloadPieceFile(piece)}
                                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-[#005BAC] bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all"
                                title={lang === 'ar' ? 'تحميل' : 'Télécharger'}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Verification Decision Buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={verifyingPieceId === piece.id}
                                onClick={() => handleValidatePiece(piece)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  piece.statut === 'validee'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{lang === 'ar' ? 'مطابقة' : 'Valider'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={verifyingPieceId === piece.id}
                                onClick={() => handleOpenRejectPiece(piece)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  piece.statut === 'refusee'
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white border border-red-200 dark:border-red-800'
                                }`}
                              >
                                <X className="w-3 h-3" />
                                <span>{lang === 'ar' ? 'رفض / غير مقروء' : 'Refuser'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Administrative Action Panel (Status, Notes, Date de Retrait) */}
              <div className="border border-blue-200 dark:border-blue-900/60 rounded-2xl p-5 bg-blue-50/30 dark:bg-blue-950/20">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                  {lang === 'ar' ? 'معالجة وتحديث حالة الطلب الإداري' : 'Instruction et mise à jour du statut administratif'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'تغيير الحالة الإدارية للطلب' : 'Statut de traitement'}
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as StatutDemande)}
                      className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs sm:text-sm outline-none focus:border-[#005BAC]"
                    >
                      <option value="Nouvelle">{lang === 'ar' ? 'جديدة' : 'Nouvelle'}</option>
                      <option value="En cours">{lang === 'ar' ? 'قيد المعالجة' : 'En cours'}</option>
                      <option value="Pièces manquantes">{lang === 'ar' ? 'وثائق ناقصة' : 'Pièces manquantes'}</option>
                      <option value="Prêt pour retrait">{lang === 'ar' ? 'جاهز للاستلام' : 'Prêt pour retrait'}</option>
                      <option value="Délivré">{lang === 'ar' ? 'تم التسليم' : 'Délivré'}</option>
                      <option value="Rejetée">{lang === 'ar' ? 'مرفوضة' : 'Rejetée'}</option>
                    </select>
                  </div>

                  {/* Date de retrait */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'تاريخ أو موعد الاستلام المقترح للمواطن' : 'Date de retrait prévue'}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'مثال: يوم الإثنين 10:00 صباحاً' : 'Ex : Le 15/10/2026 à partir de 09h00'}
                      value={editDateRetrait}
                      onChange={(e) => setEditDateRetrait(e.target.value)}
                      className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm outline-none focus:border-[#005BAC]"
                    />
                  </div>

                  {/* Notes Internes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'ملاحظات داخلية (خاصة بالموظف فقط)' : 'Notes internes (Privé agent)'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={lang === 'ar' ? 'ملاحظات تدقيق السجل...' : 'Vérification registre, annotations...'}
                      value={editNotesInternes}
                      onChange={(e) => setEditNotesInternes(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-[#005BAC]"
                    />
                  </div>

                  {/* Notes Citoyen */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'توجيهات أو أسباب مرئية للمواطن في صفحة التتبع' : 'Instructions visibles par le citoyen'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={lang === 'ar' ? 'يرجى الإدلاء بصورة واضحة لعقد الولادة القديم...' : 'Préciser les documents manquants ou lieu de retrait...'}
                      value={editNotesCitoyen}
                      onChange={(e) => setEditNotesCitoyen(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-[#005BAC]"
                    />
                  </div>

                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveDemandeChanges}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#005BAC] hover:bg-[#004b91] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{lang === 'ar' ? 'حفظ التعديلات في النظام' : 'Enregistrer les modifications'}</span>
                  </button>
                </div>

              </div>

              {/* Official Civil Document Generation Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end items-center">
                <button
                  onClick={() => generateReceiptPdf(selectedDemande, lang)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تحميل وصل الإيداع (PDF)' : 'Télécharger le Récépissé'}</span>
                </button>

                <button
                  onClick={() => generateOfficialCivilDocumentPdf(selectedDemande, lang)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#198754] hover:bg-[#157145] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'توليد الوثيقة الرسمية النهائية (PDF)' : 'Générer l\'Acte Officiel Final (PDF)'}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Zoom / Lightbox Preview Modal for Pieces */}
      {previewModalPiece && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                  {previewModalPiece.categorie === 'cin_recto'
                    ? (lang === 'ar' ? 'البطاقة الوطنية (الوجه الأمامي)' : 'CIN Recto')
                    : previewModalPiece.categorie === 'cin_verso'
                    ? (lang === 'ar' ? 'البطاقة الوطنية (الوجه الخلفي)' : 'CIN Verso')
                    : (lang === 'ar' ? 'وثيقة تكميلية' : 'Document complémentaire')}
                </span>
                <h4 className="text-sm font-bold truncate max-w-md">{previewModalPiece.nom}</h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadPieceFile(previewModalPiece)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تحميل' : 'Télécharger'}</span>
                </button>
                <button
                  onClick={() => setPreviewModalPiece(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Viewer */}
            <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-slate-950/40">
              <img
                src={previewModalPiece.dataUrl}
                alt={previewModalPiece.nom}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Piece Reason Modal */}
      {rejectModalPiece && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'رفض الوثيقة أو الإعلان عن عدم وضوحها' : 'Refuser la pièce / Document illisible'}
                </h3>
              </div>
              <button
                onClick={() => setRejectModalPiece(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              {lang === 'ar'
                ? `سيتم تغيير حالة الطلب إلى "وثائق ناقصة" وإشعار المواطن في صفحة التتبع بالسبب التالي :`
                : `La demande passera en "Pièces manquantes" et le citoyen sera notifié du motif :`}
            </p>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { ar: 'صورة غير واضحة أو باهتة', fr: 'Image floue ou illisible' },
                { ar: 'أطراف الوثيقة مقطوعة', fr: 'Document tronqué ou incomplet' },
                { ar: 'وثيقة غير مطابقة للطلب', fr: 'Document non conforme' },
                { ar: 'تاريخ الصلاحية منتهي', fr: 'Document expiré' },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectMotif(lang === 'ar' ? preset.ar : preset.fr)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700"
                >
                  {lang === 'ar' ? preset.ar : preset.fr}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectMotif}
              onChange={(e) => setRejectMotif(e.target.value)}
              placeholder={lang === 'ar' ? 'حدد سبب الرفض بالتفصيل...' : 'Préciser le motif de refus...'}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-red-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalPiece(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>

              <button
                type="button"
                disabled={verifyingPieceId !== null}
                onClick={handleConfirmRejectPiece}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {verifyingPieceId !== null ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>{lang === 'ar' ? 'تأكيد الرفض وتنبيه المواطن' : 'Confirmer le refus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
