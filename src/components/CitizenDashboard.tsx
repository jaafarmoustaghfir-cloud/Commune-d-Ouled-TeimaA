import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../types.ts';
import DemandeForm from './DemandeForm.tsx';
import { 
  FileText, Upload, Calendar, Bell, CheckCircle, FileCheck, Clock, Check, AlertCircle, 
  MapPin, Phone, Mail, User, ShieldAlert, ChevronRight, ArrowLeft, Printer, RefreshCw
} from 'lucide-react';

interface RequestModel {
  id: number;
  requestNumber: string;
  fullName: string;
  cin: string;
  dateOfBirth: string;
  placeOfBirth: string;
  birthRegNum?: string;
  birthRegYear?: string;
  birthRegOffice?: string;
  phone: string;
  email?: string;
  address: string;
  typeOfDocument: string;
  numberOfCopies: number;
  modeOfDelivery: string;
  status: string;
  rejectionReason?: string;
  missingDocsDescription?: string;
  cinFrontUrl?: string;
  cinBackUrl?: string;
  qrCodeContent?: string;
  createdAt: string;
}

interface AppointmentModel {
  id: number;
  fullName: string;
  cin: string;
  phone: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  remarks?: string;
}

interface NotificationModel {
  id: number;
  titleAr: string;
  titleFr: string;
  messageAr: string;
  messageFr: string;
  isRead: boolean;
  createdAt: string;
}

interface ComplaintModel {
  id: number;
  complaintNumber: string;
  citizenName: string;
  cin: string;
  phone: string;
  email?: string;
  category: string;
  subject: string;
  description: string;
  supportingDocUrl?: string;
  status: string;
  assignedEmployeeName?: string;
  resolutionNotes?: string;
  replyMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface CitizenDashboardProps {
  lang: 'ar' | 'fr';
  token: string;
  user: any;
  preselectedService?: string;
}

export default function CitizenDashboard({ lang, token, user, preselectedService }: CitizenDashboardProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'new-request' | 'appointments' | 'profile' | 'notifications' | 'complaints' | 'new-complaint'>('requests');
  const [requestsList, setRequestsList] = useState<RequestModel[]>([]);
  const [appointmentsList, setAppointmentsList] = useState<AppointmentModel[]>([]);
  const [notificationsList, setNotificationsList] = useState<NotificationModel[]>([]);
  
  // Complaints states
  const [complaintsList, setComplaintsList] = useState<ComplaintModel[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintModel | null>(null);
  const [complaintFields, setComplaintFields] = useState({
    citizenName: user?.name || '',
    cin: '',
    phone: '',
    email: user?.email || '',
    category: 'delay',
    subject: '',
    description: '',
    supportingDoc: '',
  });
  const [complaintError, setComplaintError] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  
  // Single request details for tracking / timeline
  const [selectedRequest, setSelectedRequest] = useState<RequestModel | null>(null);

  // Profile fields state
  const [profile, setProfile] = useState<any>(null);
  const [profileEditSuccess, setProfileEditSuccess] = useState(false);

  // New Request Form fields
  const [formFields, setFormFields] = useState({
    fullName: user?.name || '',
    cin: '',
    dateOfBirth: '',
    placeOfBirth: '',
    birthRegNum: '',
    birthRegYear: '',
    birthRegOffice: 'Commune d\'Ouled Teima',
    phone: '',
    email: user?.email || '',
    address: '',
    typeOfDocument: 'extrait_naissance',
    numberOfCopies: 1,
    modeOfDelivery: 'pickup',
  });

  const [cinFrontBase64, setCinFrontBase64] = useState<string>('');
  const [cinBackBase64, setCinBackBase64] = useState<string>('');
  const [cinFrontName, setCinFrontName] = useState<string>('');
  const [cinBackName, setCinBackName] = useState<string>('');
  
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Appointment Form state
  const [apptFields, setApptFields] = useState({
    fullName: user?.name || '',
    cin: '',
    phone: '',
    serviceType: 'extrait_naissance',
    appointmentDate: '',
    appointmentTime: '09:00',
    remarks: '',
  });
  const [apptError, setApptError] = useState('');
  const [apptSuccess, setApptSuccess] = useState('');

  // Auto-redirect if a service is preselected from home page
  useEffect(() => {
    if (preselectedService) {
      if (preselectedService === 'appointment') {
        setActiveSubTab('appointments');
      } else if (preselectedService === 'track') {
        setActiveSubTab('requests');
      } else {
        setFormFields(prev => ({ ...prev, typeOfDocument: preselectedService }));
        setActiveSubTab('new-request');
      }
    }
  }, [preselectedService]);

  // Load everything
  useEffect(() => {
    loadRequests();
    loadAppointments();
    loadNotifications();
    loadProfile();
    loadComplaints();
  }, [token]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // Prefill form
        setFormFields(prev => ({
          ...prev,
          fullName: data.name || prev.fullName,
          cin: data.cin || '',
          dateOfBirth: data.dateOfBirth || '',
          placeOfBirth: data.placeOfBirth || '',
          birthRegNum: data.birthRegNum || '',
          birthRegYear: data.birthRegYear || '',
          birthRegOffice: data.birthRegOffice || prev.birthRegOffice,
          phone: data.phone || '',
          address: data.address || '',
        }));
        setApptFields(prev => ({
          ...prev,
          fullName: data.name || prev.fullName,
          cin: data.cin || '',
          phone: data.phone || '',
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/citizen/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequestsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAppointments = async () => {
    try {
      const res = await fetch('/api/citizen/my-appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointmentsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/citizen/my-notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setProfileEditSuccess(true);
        setTimeout(() => setProfileEditSuccess(false), 4000);
        loadProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (notifId: number) => {
    try {
      const res = await fetch(`/api/citizen/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadComplaints = async () => {
    try {
      const res = await fetch('/api/citizen/my-complaints', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComplaintsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setComplaintError('');
    setComplaintSuccess('');
    setIsSubmittingComplaint(true);

    if (!complaintFields.citizenName || !complaintFields.cin || !complaintFields.phone || !complaintFields.subject || !complaintFields.description) {
      setComplaintError(lang === 'ar' ? 'يرجى ملء جميع الحقول الإلزامية' : 'Veuillez remplir tous les champs obligatoires.');
      setIsSubmittingComplaint(false);
      return;
    }

    try {
      const res = await fetch('/api/citizen/submit-complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          citizenName: complaintFields.citizenName,
          cin: complaintFields.cin,
          phone: complaintFields.phone,
          email: complaintFields.email,
          category: complaintFields.category,
          subject: complaintFields.subject,
          description: complaintFields.description,
          supportingDoc: complaintFields.supportingDoc,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setComplaintSuccess(
          lang === 'ar'
            ? `تم تقديم شكواكم بنجاح! رقم الشكوى هو: ${data.complaintNumber}`
            : `Votre plainte a été enregistrée avec succès ! Numéro de plainte : ${data.complaintNumber}`
        );
        // Clear fields
        setComplaintFields({
          citizenName: user?.name || '',
          cin: '',
          phone: '',
          email: user?.email || '',
          category: 'delay',
          subject: '',
          description: '',
          supportingDoc: '',
        });
        loadComplaints();
        loadNotifications();
        // Go back to list after a short delay
        setTimeout(() => {
          setActiveSubTab('complaints');
          setComplaintSuccess('');
        }, 3000);
      } else {
        setComplaintError(data.error || 'Failed to submit complaint.');
      }
    } catch (err: any) {
      setComplaintError(err.message || 'Error occurred.');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Handle files conversion to Base64
  const processFile = (file: File, setter: (base64: string) => void, nameSetter: (n: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'ar' ? 'حجم الملف يتعدى 5 ميغابايت!' : 'La taille du fichier dépasse 5 Mo !');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
      nameSetter(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!cinFrontBase64 || !cinBackBase64) {
      setFormError(lang === 'ar' ? 'يرجى تحميل الوجهين الأمامي والخلفي لبطاقة التعريف الوطنية.' : 'Veuillez télécharger les deux faces de votre CIN.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formFields,
        cinFront: cinFrontBase64,
        cinBack: cinBackBase64,
      };

      const res = await fetch('/api/citizen/submit-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess(data.requestNumber);
        // Clear files
        setCinFrontBase64('');
        setCinBackBase64('');
        setCinFrontName('');
        setCinBackName('');
        loadRequests();
        loadNotifications();
      } else {
        setFormError(data.error || 'Submission failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setApptError('');
    setApptSuccess('');

    try {
      const res = await fetch('/api/citizen/book-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(apptFields)
      });
      const data = await res.json();
      if (res.ok) {
        setApptSuccess(data.appointmentDate);
        setApptFields(prev => ({
          ...prev,
          remarks: '',
          appointmentDate: '',
        }));
        loadAppointments();
        loadNotifications();
      } else {
        setApptError(data.error || 'Booking failed');
      }
    } catch (err: any) {
      setApptError(err.message);
    }
  };

  // Printable receipt references
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrintReceipt = () => {
    const printContent = receiptRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      const win = window.open('', '', 'height=650,width=900');
      win?.document.write(`
        <html>
          <head>
            <title>Récépissé - Commune d'Ouled Teima</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #005BAC; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { color: #005BAC; margin: 0; font-size: 24px; }
              .header h2 { color: #198754; margin: 5px 0 0; font-size: 16px; }
              .section { margin-bottom: 20px; }
              .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .item { border-bottom: 1px solid #eee; padding-bottom: 8px; }
              .item label { font-size: 11px; color: #666; display: block; text-transform: uppercase; }
              .item value { font-weight: bold; font-size: 14px; }
              .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #777; border-top: 1px solid #ddd; pt: 20px; }
              .qr-container { text-align: center; margin: 30px 0; }
              .badge { display: inline-block; padding: 5px 10px; background: #e2f0fd; color: #005BAC; border-radius: 5px; font-weight: bold; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>window.print();</script>
          </body>
        </html>
      `);
      win?.document.close();
    }
  };

  // Status mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400';
      case 'under_review': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400';
      case 'missing_documents': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400';
      case 'approved': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400';
      case 'ready_for_pickup': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16 py-10">
      <div className="md:grid md:grid-cols-12 md:gap-8">
        
        {/* Sidebar Nav */}
        <div className="md:col-span-3 mb-8 md:mb-0">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 flex flex-col gap-2">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b dark:border-slate-700">
              <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400 rounded-xl">
                <User className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-bold text-sm text-slate-800 dark:text-white">{user?.name}</span>
                <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">{lang === 'ar' ? 'بوابة المواطن' : 'Portail Citoyen'}</span>
              </div>
            </div>

            {[
              { id: 'requests', label: lang === 'ar' ? 'طلباتي الإلكترونية' : 'Mes demandes', icon: FileText },
              { id: 'new-request', label: lang === 'ar' ? 'طلب وثيقة جديدة' : 'Nouvelle demande', icon: Upload },
              { id: 'appointments', label: lang === 'ar' ? 'حجز موعد' : 'Mes rendez-vous', icon: Calendar },
              { id: 'complaints', label: lang === 'ar' ? 'الشكاوى والتظلمات' : 'Mes Plaintes', icon: ShieldAlert },
              { id: 'new-complaint', label: lang === 'ar' ? 'تقديم شكوى جديدة' : 'Déposer une plainte', icon: ShieldAlert },
              { id: 'notifications', label: lang === 'ar' ? 'الإشعارات' : 'Mes notifications', icon: Bell, count: notificationsList.filter(n => !n.isRead).length },
              { id: 'profile', label: lang === 'ar' ? 'الملف الشخصي' : 'Mon Profil', icon: User },
            ].map((sub) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubTab(sub.id as any);
                    setSelectedRequest(null);
                    setSelectedComplaint(null);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeSubTab === sub.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SubIcon className="h-4 w-4" />
                    <span>{sub.label}</span>
                  </div>
                  {sub.count && sub.count > 0 ? (
                    <span className="bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                      {sub.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace Display */}
        <div className="md:col-span-9">
          
          {/* Subtab: Requests Queue */}
          {activeSubTab === 'requests' && !selectedRequest && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-xl font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'طلباتك المسجلة' : 'Historique de vos demandes'}
              </h2>

              {requestsList.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl p-6 dark:border-slate-700">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">{lang === 'ar' ? 'لم تقم بتقديم أي طلب حتى الآن.' : 'Aucune demande soumise pour le moment.'}</p>
                  <button
                    onClick={() => setActiveSubTab('new-request')}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm"
                  >
                    {lang === 'ar' ? 'تقديم أول طلب الآن' : 'Nouvelle demande'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {requestsList.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="border dark:border-slate-700 p-5 rounded-xl hover:border-blue-300 dark:hover:border-blue-900 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400">{req.requestNumber}</span>
                        <span className="font-sans font-semibold text-slate-800 dark:text-white mt-1 text-md">
                          {lang === 'ar' ? translations.ar[`srv${req.typeOfDocument.replace('extrait_naissance', 'Extrait').replace('copie_integrale', 'Copie').replace('acte_deces', 'Deces').replace('declaration_naissance', 'Naissance').replace('rectification', 'Rectif')}` as any] || req.typeOfDocument 
                                         : translations.fr[`srv${req.typeOfDocument.replace('extrait_naissance', 'Extrait').replace('copie_integrale', 'Copie').replace('acte_deces', 'Deces').replace('declaration_naissance', 'Naissance').replace('rectification', 'Rectif')}` as any] || req.typeOfDocument}
                        </span>
                        <span className="text-xs text-slate-400 mt-1">
                          {new Date(req.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(req.status)}`}>
                          {lang === 'ar' ? t[`status${req.status.replace('submitted', 'Submitted').replace('under_review', 'Review').replace('missing_documents', 'Missing').replace('approved', 'Approved').replace('ready_for_pickup', 'Ready').replace('delivered', 'Delivered').replace('rejected', 'Rejected')}` as any] || req.status
                                         : t[`status${req.status.replace('submitted', 'Submitted').replace('under_review', 'Review').replace('missing_documents', 'Missing').replace('approved', 'Approved').replace('ready_for_pickup', 'Ready').replace('delivered', 'Delivered').replace('rejected', 'Rejected')}` as any] || req.status}
                        </span>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detailed Request / Timeline view */}
          {activeSubTab === 'requests' && selectedRequest && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <button
                onClick={() => setSelectedRequest(null)}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 mb-6 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{lang === 'ar' ? 'الرجوع للقائمة' : 'Retour à la liste'}</span>
              </button>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b dark:border-slate-700 pb-6">
                <div>
                  <h3 className="font-mono text-xl font-bold text-blue-700 dark:text-blue-400">{selectedRequest.requestNumber}</h3>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">
                    {lang === 'ar' ? translations.ar[`srv${selectedRequest.typeOfDocument.replace('extrait_naissance', 'Extrait').replace('copie_integrale', 'Copie').replace('acte_deces', 'Deces').replace('declaration_naissance', 'Naissance').replace('rectification', 'Rectif')}` as any] || selectedRequest.typeOfDocument 
                                   : translations.fr[`srv${selectedRequest.typeOfDocument.replace('extrait_naissance', 'Extrait').replace('copie_integrale', 'Copie').replace('acte_deces', 'Deces').replace('declaration_naissance', 'Naissance').replace('rectification', 'Rectif')}` as any] || selectedRequest.typeOfDocument}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-sm font-semibold"
                  >
                    <Printer className="h-4 w-4" />
                    <span>{lang === 'ar' ? 'طبع الوصل' : 'Imprimer le Récépissé'}</span>
                  </button>
                </div>
              </div>

              {/* TIMELINE */}
              <div className="mb-8">
                <h4 className="font-sans font-bold text-sm text-slate-800 dark:text-white mb-6 uppercase tracking-wide">
                  {lang === 'ar' ? 'تتبع حالة المعالجة' : 'Timeline de traitement'}
                </h4>
                
                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 pl-6 flex flex-col gap-8">
                  {[
                    { key: 'submitted', titleAr: 'تم تقديم الطلب', titleFr: 'Demande soumise', descAr: 'تم تسجيل طلبكم بنجاح وهو بانتظار المراجعة الإدارية.', descFr: 'Votre demande a été enregistrée et attend sa révision administrative.' },
                    { key: 'under_review', titleAr: 'قيد الدراسة والمطابقة', titleFr: 'En cours d\'examen', descAr: 'مصلحة الحالة المدنية تقوم بمطابقة معلوماتك مع السجلات الرسمية.', descFr: 'Le bureau de l\'état civil vérifie vos données avec les registres d\'état civil.' },
                    { key: 'missing_documents', titleAr: 'مطلوب وثائق تكميلية', titleFr: 'Documents requis', descAr: `يرجى مراجعة مصلحة الحالة المدنية. السبب: ${selectedRequest.missingDocsDescription || ''}`, descFr: `Dossier incomplet. Motif : ${selectedRequest.missingDocsDescription || ''}` },
                    { key: 'approved', titleAr: 'مقبول وجاري الطبع', titleFr: 'Approuvé et en cours d\'impression', descAr: 'تم قبول طلبكم، والعمل جار على طبع الوثيقة الرسمية وتوقيعها.', descFr: 'Votre demande a été approuvée, le document officiel est en cours d\'impression.' },
                    { key: 'ready_for_pickup', titleAr: 'جاهز للاستلام', titleFr: 'Prêt pour retrait', descAr: 'الوثيقة جاهزة بمقر الجماعة. يرجى التوجه لمكتب الحالة المدنية مصحوباً ببطاقة التعريف الوطنية.', descFr: 'Le document officiel est prêt. Rendez-vous au bureau d\'état civil muni de votre CIN.' },
                    { key: 'delivered', titleAr: 'تم التسليم بنجاح', titleFr: 'Délivré avec succès', descAr: 'تم تسليم الوثيقة الموقعة والمختومة للمواطن بنجاح.', descFr: 'Le document signé et tamponné a été officiellement remis.' },
                  ].map((step, sIdx) => {
                    const isCompleted = [
                      'submitted', 'under_review', 'missing_documents', 'approved', 'ready_for_pickup', 'delivered'
                    ].indexOf(step.key) <= [
                      'submitted', 'under_review', 'missing_documents', 'approved', 'ready_for_pickup', 'delivered'
                    ].indexOf(selectedRequest.status);

                    const isCurrent = selectedRequest.status === step.key;

                    if (step.key === 'missing_documents' && selectedRequest.status !== 'missing_documents') {
                      return null; // only show missing documents step if active
                    }

                    return (
                      <div key={sIdx} className="relative">
                        {/* Dot */}
                        <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                          isCurrent 
                            ? 'bg-blue-600 border-blue-600 dark:bg-blue-400 dark:border-blue-400 animate-pulse'
                            : isCompleted 
                              ? 'bg-green-600 border-green-600 dark:bg-green-400 dark:border-green-400' 
                              : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'
                        }`}>
                          {isCompleted && !isCurrent && <Check className="h-2 w-2 text-white" />}
                        </span>
                        
                        <div>
                          <h5 className={`font-sans font-bold text-sm ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                            {lang === 'ar' ? step.titleAr : step.titleFr}
                          </h5>
                          {isCompleted && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {lang === 'ar' ? step.descAr : step.descFr}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* REJECTION BLOCK (If rejected) */}
              {selectedRequest.status === 'rejected' && (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 mb-8 flex gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm">{lang === 'ar' ? 'تم رفض الطلب' : 'Demande rejetée'}</h5>
                    <p className="text-xs mt-1 leading-relaxed">
                      {lang === 'ar' ? `سبب الرفض: ${selectedRequest.rejectionReason || 'معلومات غير مطابقة لسجلات الحالة المدنية الرسمية.'}` 
                                     : `Motif du rejet : ${selectedRequest.rejectionReason || 'Informations non conformes aux registres officiels.'}`}
                    </p>
                  </div>
                </div>
              )}

              {/* REQUEST RECEIPT (Hidden on standard display, compiled for the print frame) */}
              <div style={{ display: 'none' }}>
                <div ref={receiptRef} className="p-8" dir={isRTL ? 'rtl' : 'ltr'}>
                  <div className="header" style={{ borderBottom: '2px solid #005BAC', paddingBottom: '20px', marginBottom: '30px', textAlign: 'center' }}>
                    <h1 style={{ color: '#005BAC', margin: 0, fontSize: '24px' }}>
                      {lang === 'ar' ? 'المملكة المغربية' : 'Royaume du Maroc'}
                    </h1>
                    <h2 style={{ color: '#198754', margin: '5px 0 0', fontSize: '16px' }}>
                      {lang === 'ar' ? 'جماعة أولاد تايمة - مصلحة الحالة المدنية' : "Commune d'Ouled Teima - Bureau de l'État Civil"}
                    </h2>
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div className="badge">
                      {lang === 'ar' ? 'وصل إيداع طلب وثيقة إدارية' : 'RÉCÉPISSÉ DE DÉPÔT DE DEMANDE'}
                    </div>
                  </div>

                  <div className="grid">
                    <div className="item">
                      <label>{lang === 'ar' ? 'رقم الطلب الفريد' : 'N° DE DEMANDE UNIQUE'}</label>
                      <span className="value">{selectedRequest.requestNumber}</span>
                    </div>
                    <div className="item">
                      <label>{lang === 'ar' ? 'تاريخ التقديم' : 'DATE DE SOUMISSION'}</label>
                      <span className="value">
                        {new Date(selectedRequest.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}
                      </span>
                    </div>
                    <div className="item">
                      <label>{lang === 'ar' ? 'الاسم الكامل للمواطن' : 'NOM COMPLET DU CITOYEN'}</label>
                      <span className="value">{selectedRequest.fullName}</span>
                    </div>
                    <div className="item">
                      <label>{lang === 'ar' ? 'رقم البطاقة الوطنية (CIN)' : 'N° DE CARTE NATIONALE'}</label>
                      <span className="value">{selectedRequest.cin}</span>
                    </div>
                    <div className="item">
                      <label>{lang === 'ar' ? 'الوثيقة المطلوبة' : 'DOCUMENT REQUIS'}</label>
                      <span className="value">{selectedRequest.typeOfDocument}</span>
                    </div>
                    <div className="item">
                      <label>{lang === 'ar' ? 'رقم رسم الولادة' : 'N° ACTE DE NAISSANCE'}</label>
                      <span className="value">{selectedRequest.birthRegNum || 'N/A'}</span>
                    </div>
                    <div className="item">
                      <label>{lang === 'ar' ? 'عدد النسخ' : 'NOMBRE DE COPIES'}</label>
                      <span className="value">{selectedRequest.numberOfCopies}</span>
                    </div>
                    <div className="item">
                      <label>{lang === 'ar' ? 'طريقة الاستلام' : 'MODE DE LIVRAISON'}</label>
                      <span className="value">{selectedRequest.modeOfDelivery === 'pickup' ? t.formDeliveryPickup : t.formDeliveryPost}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', margin: '40px 0' }}>
                    <p style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
                      {lang === 'ar' ? 'مسح رمز الاستجابة لتتبع حالة الطلب:' : 'Scannez le QR Code pour le suivi :'}
                    </p>
                    <div style={{ display: 'inline-block', border: '1px solid #ddd', padding: '10px', background: '#fff', fontSize: '12px', fontFamily: 'monospace' }}>
                      [QR-CODE-ROT-{selectedRequest.requestNumber}]
                    </div>
                  </div>

                  <div className="footer">
                    <p>{lang === 'ar' ? 'ملاحظة: المرجو إحضار بطاقتكم الوطنية عند المجيء لتسلم الوثيقة بمقر الجماعة.' : "Note: Veuillez vous présenter muni de votre CIN pour retirer le document au bureau de l'état civil."}</p>
                    <p style={{ fontSize: '10px', color: '#aaa', marginTop: '10px' }}>Powered by Digital Commune Portal - Commune d'Ouled Teima</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Subtab: New Request Form */}
          {activeSubTab === 'new-request' && (
            <DemandeForm
              lang={lang}
              initialDocType={formFields.typeOfDocument}
              onCancel={() => setActiveSubTab('requests')}
              onGoToTrack={() => setActiveSubTab('requests')}
            />
          )}

          {false && activeSubTab === 'new-request' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-xl font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'تقديم طلب وثيقة الحالة المدنية' : 'Formulaire de demande de document'}
              </h2>

              {formSuccess ? (
                <div className="text-center py-10 border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900 rounded-xl p-6">
                  <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-sans font-bold text-slate-800 dark:text-white">
                    {lang === 'ar' ? 'تم تقديم الطلب بنجاح!' : 'Demande enregistrée avec succès !'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                    {lang === 'ar' ? `رقم التتبع الخاص بك هو : ` : `Votre numéro de suivi unique : `}
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formSuccess}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {lang === 'ar' ? 'تلقيت رسالة تأكيد وإشعاراً على لوحة التحكم الشخصية.' : 'Vous avez reçu une confirmation et une notification.'}</p>
                  
                  <div className="mt-8 flex justify-center gap-4">
                    <button
                      onClick={() => {
                        setFormSuccess('');
                        setActiveSubTab('requests');
                      }}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm"
                    >
                      {lang === 'ar' ? 'تتبع الطلب الآن' : 'Suivre ma demande'}
                    </button>
                    <button
                      onClick={() => setFormSuccess('')}
                      className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-white text-sm font-semibold"
                    >
                      {lang === 'ar' ? 'طلب وثيقة أخرى' : 'Demander un autre document'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="flex flex-col gap-6">
                  
                  {formError && (
                    <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formFullName}</label>
                      <input
                        type="text"
                        required
                        value={formFields.fullName}
                        onChange={(e) => setFormFields({ ...formFields, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* CIN */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formCin}</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: JC123456"
                        value={formFields.cin}
                        onChange={(e) => setFormFields({ ...formFields, cin: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formDob}</label>
                      <input
                        type="date"
                        required
                        value={formFields.dateOfBirth}
                        onChange={(e) => setFormFields({ ...formFields, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Place of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formPob}</label>
                      <input
                        type="text"
                        required
                        value={formFields.placeOfBirth}
                        onChange={(e) => setFormFields({ ...formFields, placeOfBirth: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Act number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formActNum}</label>
                      <input
                        type="text"
                        placeholder="Ex: 234/78"
                        value={formFields.birthRegNum}
                        onChange={(e) => setFormFields({ ...formFields, birthRegNum: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Act Year */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formActYear}</label>
                      <input
                        type="text"
                        placeholder="Ex: 1978"
                        value={formFields.birthRegYear}
                        onChange={(e) => setFormFields({ ...formFields, birthRegYear: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formPhone}</label>
                      <input
                        type="text"
                        required
                        value={formFields.phone}
                        onChange={(e) => setFormFields({ ...formFields, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formEmail}</label>
                      <input
                        type="email"
                        value={formFields.email}
                        onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formAddress}</label>
                    <textarea
                      required
                      rows={2}
                      value={formFields.address}
                      onChange={(e) => setFormFields({ ...formFields, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Document Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formDocType}</label>
                      <select
                        value={formFields.typeOfDocument}
                        onChange={(e) => setFormFields({ ...formFields, typeOfDocument: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="extrait_naissance">{t.srvExtrait}</option>
                        <option value="copie_integrale">{t.srvCopie}</option>
                        <option value="acte_deces">{t.srvDeces}</option>
                        <option value="declaration_naissance">{t.srvNaissance}</option>
                        <option value="rectification">{t.srvRectif}</option>
                      </select>
                    </div>

                    {/* Copies */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formCopies}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        required
                        value={formFields.numberOfCopies}
                        onChange={(e) => setFormFields({ ...formFields, numberOfCopies: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Mode of delivery */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">{t.formDelivery}</label>
                      <select
                        value={formFields.modeOfDelivery}
                        onChange={(e) => setFormFields({ ...formFields, modeOfDelivery: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pickup">{t.formDeliveryPickup}</option>
                        <option value="mail">{t.formDeliveryPost}</option>
                      </select>
                    </div>
                  </div>

                  {/* Drag-and-Drop Identity Verification (CIN Front & Back) */}
                  <div>
                    <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase">
                      {lang === 'ar' ? 'التحقق من الهوية (تحميل بطاقة التعريف الوطنية)' : 'Vérification d\'identité (Téléchargement de la CIN)'}
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* CIN Front */}
                      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 hover:border-blue-500 transition-all dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 relative">
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">{t.formCinFront}</span>
                        <span className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], setCinFrontBase64, setCinFrontName)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {cinFrontName && (
                          <div className="mt-4 p-2.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl flex items-center gap-2 text-xs w-full justify-between">
                            <span className="truncate">{cinFrontName}</span>
                            <CheckCircle className="h-4 w-4 shrink-0" />
                          </div>
                        )}
                      </div>

                      {/* CIN Back */}
                      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 hover:border-blue-500 transition-all dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 relative">
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">{t.formCinBack}</span>
                        <span className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], setCinBackBase64, setCinBackName)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {cinBackName && (
                          <div className="mt-4 p-2.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl flex items-center gap-2 text-xs w-full justify-between">
                            <span className="truncate">{cinBackName}</span>
                            <CheckCircle className="h-4 w-4 shrink-0" />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Submission Info Banner */}
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400 flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-start">
                      {lang === 'ar'
                        ? 'يتعهد المواطن بصحة المعلومات المصرح بها والمرفقة في هذا الطلب. أي تزوير أو إدلاء بمعلومات خاطئة يعرض صاحبه للمساءلة القانونية الجاري بها العمل بالمملكة المغربية.'
                        : "Le citoyen s'engage sur l'exactitude des renseignements fournis. Toute fausse déclaration expose son auteur aux sanctions prévues par la réglementation en vigueur."}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-md font-bold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>{lang === 'ar' ? 'جاري إرسال طلبكم...' : 'Envoi en cours...'}</span>
                      </>
                    ) : (
                      <span>{t.formSubmitBtn}</span>
                    )}
                  </button>

                </form>
              )}
            </div>
          )}

          {/* Subtab: Book Appointment */}
          {activeSubTab === 'appointments' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-xl font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'حجز موعد إلكتروني حضوري' : 'Prendre rendez-vous en ligne'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                
                {/* Appointment form */}
                <div className="md:col-span-3">
                  {apptSuccess ? (
                    <div className="p-6 rounded-xl border border-green-200 bg-green-50/30 dark:bg-green-950/20 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <h4 className="font-sans font-bold text-slate-800 dark:text-white">{lang === 'ar' ? 'تم تسجيل حجز الموعد!' : 'Rendez-vous enregistré !'}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        {lang === 'ar' ? `طلب حجز موعد ليوم ${apptSuccess} قيد المراجعة حالياً من الموظف المسؤول.` 
                                       : `Votre rendez-vous pour le ${apptSuccess} est en cours de validation par nos agents.`}
                      </p>
                      <button
                        onClick={() => setApptSuccess('')}
                        className="mt-6 px-5 py-2 text-xs font-bold text-blue-600 border rounded-xl hover:bg-slate-50"
                      >
                        {lang === 'ar' ? 'حجز موعد آخر' : 'Nouveau rendez-vous'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleBookAppointment} className="flex flex-col gap-4">
                      {apptError && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">{apptError}</div>}
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formFullName}</label>
                        <input
                          type="text"
                          required
                          value={apptFields.fullName}
                          onChange={(e) => setApptFields({ ...apptFields, fullName: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formCin}</label>
                          <input
                            type="text"
                            required
                            value={apptFields.cin}
                            onChange={(e) => setApptFields({ ...apptFields, cin: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formPhone}</label>
                          <input
                            type="text"
                            required
                            value={apptFields.phone}
                            onChange={(e) => setApptFields({ ...apptFields, phone: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{lang === 'ar' ? 'التاريخ المطلوب' : 'Date souhaitée'}</label>
                          <input
                            type="date"
                            required
                            value={apptFields.appointmentDate}
                            onChange={(e) => setApptFields({ ...apptFields, appointmentDate: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{lang === 'ar' ? 'التوقيت المفضل' : 'Horaire'}</label>
                          <select
                            value={apptFields.appointmentTime}
                            onChange={(e) => setApptFields({ ...apptFields, appointmentTime: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                          >
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="12:00">12:00</option>
                            <option value="14:00">14:00</option>
                            <option value="15:00">15:00</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{lang === 'ar' ? 'الغرض من الزيارة' : 'Motif'}</label>
                        <select
                          value={apptFields.serviceType}
                          onChange={(e) => setApptFields({ ...apptFields, serviceType: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                        >
                          <option value="extrait_naissance">{t.srvExtrait}</option>
                          <option value="copie_integrale">{t.srvCopie}</option>
                          <option value="acte_deces">{t.srvDeces}</option>
                          <option value="legalisation">{lang === 'ar' ? 'المصادقة على التوقيع (قوانين)' : 'Légalisation de signature'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{lang === 'ar' ? 'ملاحظات إضافية' : 'Remarques'}</label>
                        <textarea
                          rows={2}
                          value={apptFields.remarks}
                          onChange={(e) => setApptFields({ ...apptFields, remarks: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 text-sm font-bold shadow-sm"
                      >
                        {lang === 'ar' ? 'إرسال طلب حجز موعد' : 'Réserver mon créneau'}
                      </button>

                    </form>
                  )}
                </div>

                {/* Appointments queue list */}
                <div className="md:col-span-2 border-t md:border-t-0 md:border-l dark:border-slate-700 md:pl-6 pt-6 md:pt-0">
                  <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white mb-4 uppercase">
                    {lang === 'ar' ? 'مواعيدي السابقة' : 'Mes rendez-vous'}
                  </h3>

                  {appointmentsList.length === 0 ? (
                    <p className="text-xs text-slate-400">{lang === 'ar' ? 'لا توجد مواعيد مبرمجة.' : 'Aucun rendez-vous planifié.'}</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {appointmentsList.map((appt) => (
                        <div key={appt.id} className="p-3.5 border dark:border-slate-700 rounded-xl text-xs flex flex-col justify-between gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{appt.appointmentDate} - {appt.appointmentTime}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              appt.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                              appt.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {appt.status}
                            </span>
                          </div>
                          <span className="text-slate-400 mt-1 capitalize">{appt.serviceType.replace('_', ' ')}</span>
                          {appt.remarks && <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900 p-1.5 rounded mt-1">Note: {appt.remarks}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Subtab: Complaints List */}
          {activeSubTab === 'complaints' && !selectedComplaint && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-sans font-bold text-slate-800 dark:text-white">
                  {lang === 'ar' ? 'شكاواك وتظلماتك' : 'Historique de vos plaintes'}
                </h2>
                <button
                  onClick={() => setActiveSubTab('new-complaint')}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all"
                >
                  {lang === 'ar' ? 'تقديم شكوى جديدة' : 'Déposer une plainte'}
                </button>
              </div>

              {complaintsList.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl p-6 dark:border-slate-700">
                  <ShieldAlert className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">{lang === 'ar' ? 'لم تقم بتقديم أي شكوى حتى الآن.' : 'Aucune plainte déposée pour le moment.'}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {complaintsList.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => setSelectedComplaint(comp)}
                      className="border dark:border-slate-700 p-5 rounded-xl hover:border-blue-300 dark:hover:border-blue-900 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400">{comp.complaintNumber}</span>
                        <span className="font-sans font-bold text-slate-800 dark:text-white mt-1">
                          {comp.subject}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase">
                            {comp.category}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(comp.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          comp.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          comp.status === 'under_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          comp.status === 'waiting_citizen' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          comp.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                          comp.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {lang === 'ar' ? 
                            (comp.status === 'new' ? 'جديدة' :
                             comp.status === 'under_review' ? 'قيد الدراسة' :
                             comp.status === 'waiting_citizen' ? 'بانتظار ردكم' :
                             comp.status === 'resolved' ? 'تم الحل' :
                             comp.status === 'rejected' ? 'مرفوضة' : 'مغلقة') : comp.status.replace('_', ' ')}
                        </span>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subtab: Complaint Detail timeline */}
          {activeSubTab === 'complaints' && selectedComplaint && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 mb-6 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{lang === 'ar' ? 'الرجوع للقائمة' : 'Retour à la liste'}</span>
              </button>

              <div className="border-b dark:border-slate-700 pb-6 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{selectedComplaint.complaintNumber}</span>
                    <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-white mt-1">
                      {selectedComplaint.subject}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    selectedComplaint.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedComplaint.status === 'under_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    selectedComplaint.status === 'waiting_citizen' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    selectedComplaint.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                    selectedComplaint.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {lang === 'ar' ? 
                      (selectedComplaint.status === 'new' ? 'جديدة' :
                       selectedComplaint.status === 'under_review' ? 'قيد الدراسة' :
                       selectedComplaint.status === 'waiting_citizen' ? 'بانتظار ردكم' :
                       selectedComplaint.status === 'resolved' ? 'تم الحل' :
                       selectedComplaint.status === 'rejected' ? 'مرفوضة' : 'مغلقة') : selectedComplaint.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex flex-col gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {lang === 'ar' ? 'تفاصيل الشكوى' : 'Détails de la plainte'}
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {selectedComplaint.replyMessage && (
                    <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">
                        {lang === 'ar' ? 'رسالة من مصلحة الشكاوى (تحتاج استجابة)' : 'Message du service (Action requise)'}
                      </h4>
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        {selectedComplaint.replyMessage}
                      </p>
                    </div>
                  )}

                  {selectedComplaint.resolutionNotes && (
                    <div className="bg-green-50 dark:bg-green-950/10 border border-green-200 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-green-800 dark:text-green-400 uppercase tracking-wider mb-2">
                        {lang === 'ar' ? 'تفاصيل وقرار الحل النهائي' : 'Détails de résolution'}
                      </h4>
                      <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold">
                        {selectedComplaint.resolutionNotes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6">
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 text-xs text-slate-500 flex flex-col gap-3">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      {lang === 'ar' ? 'معلومات عامة' : 'Méta-informations'}
                    </h4>
                    <div>
                      <span className="block text-[10px] text-slate-400">{lang === 'ar' ? 'التصنيف:' : 'Catégorie :'}</span>
                      <span className="font-bold uppercase">{selectedComplaint.category}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">{lang === 'ar' ? 'الموظف المسؤول:' : 'Agent assigné :'}</span>
                      <span className="font-bold">{selectedComplaint.assignedEmployeeName || (lang === 'ar' ? 'غير معين بعد' : 'Non assigné')}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">{lang === 'ar' ? 'تاريخ التقديم:' : 'Date de dépôt :'}</span>
                      <span className="font-mono">
                        {new Date(selectedComplaint.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {selectedComplaint.supportingDocUrl && (
                      <div className="mt-2 border-t dark:border-slate-700 pt-3">
                        <span className="block text-[10px] text-slate-400 mb-1">{lang === 'ar' ? 'الوثيقة المرفقة:' : 'Pièce jointe :'}</span>
                        <a
                          href={selectedComplaint.supportingDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          {lang === 'ar' ? 'عرض المرفق' : 'Voir le fichier'}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Submit New Complaint Form */}
          {activeSubTab === 'new-complaint' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-xl font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'تقديم شكوى أو تظلم جديد' : 'Formulaire de réclamation'}
              </h2>

              <form onSubmit={handleSubmitComplaint} className="flex flex-col gap-6">
                {complaintError && (
                  <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{complaintError}</span>
                  </div>
                )}
                {complaintSuccess && (
                  <div className="p-4 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>{complaintSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                      {lang === 'ar' ? 'الاسم الكامل للمشتكي *' : 'Nom complet du plaignant *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={complaintFields.citizenName}
                      onChange={(e) => setComplaintFields({ ...complaintFields, citizenName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                      {lang === 'ar' ? 'رقم البطاقة الوطنية (CIN) *' : 'Numéro de CIN *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={complaintFields.cin}
                      onChange={(e) => setComplaintFields({ ...complaintFields, cin: e.target.value })}
                      placeholder="e.g. JB123456"
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                      {lang === 'ar' ? 'رقم الهاتف للاتصال *' : 'Téléphone de contact *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={complaintFields.phone}
                      onChange={(e) => setComplaintFields({ ...complaintFields, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                      {lang === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Adresse Email (optionnelle)'}
                    </label>
                    <input
                      type="email"
                      value={complaintFields.email}
                      onChange={(e) => setComplaintFields({ ...complaintFields, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                      {lang === 'ar' ? 'نوع وتصنيف الشكوى *' : 'Catégorie de réclamation *'}
                    </label>
                    <select
                      value={complaintFields.category}
                      onChange={(e) => setComplaintFields({ ...complaintFields, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    >
                      <option value="delay">{lang === 'ar' ? 'تأخر تسليم الوثيقة المطلوبة' : 'Retard de délivrance'}</option>
                      <option value="incorrect_info">{lang === 'ar' ? 'وجود خطأ مادي في معلومات الوثيقة' : 'Erreurs de transcription'}</option>
                      <option value="technical">{lang === 'ar' ? 'مشاكل تقنية أو أخطاء في تصفح البوابة' : 'Erreurs techniques sur le portail'}</option>
                      <option value="appointment">{lang === 'ar' ? 'مشكلة في حجز المواعيد أو الاستقبال' : 'Problème de rendez-vous'}</option>
                      <option value="missing_doc">{lang === 'ar' ? 'رفض غير مبرر للوثائق المرفوعة' : 'Refus de pièces jointes'}</option>
                      <option value="service_quality">{lang === 'ar' ? 'جودة الاستقبال أو المعاملة بالمقر' : 'Qualité de service au guichet'}</option>
                      <option value="other">{lang === 'ar' ? 'شكوى أخرى متنوعة' : 'Autre motif'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                      {lang === 'ar' ? 'موضوع الشكوى باختصار *' : 'Objet de la plainte *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={complaintFields.subject}
                      onChange={(e) => setComplaintFields({ ...complaintFields, subject: e.target.value })}
                      placeholder={lang === 'ar' ? 'مثال: تأخر استلام شهادة الوفاة' : 'Ex: Retard certificat de décès'}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                    {lang === 'ar' ? 'وصف تفصيلي للشكوى والتظلم *' : 'Description détaillée de votre situation *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={complaintFields.description}
                    onChange={(e) => setComplaintFields({ ...complaintFields, description: e.target.value })}
                    placeholder={lang === 'ar' ? 'يرجى تقديم تفاصيل وافية تساعد في التحقق وحل المشكلة...' : 'Détaillez au maximum pour faciliter l\'analyse...'}
                    className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                    {lang === 'ar' ? 'الوثيقة الداعمة (اختياري, صورة أو ملف)' : 'Pièce justificative (optionnelle, image/pdf)'}
                  </label>
                  <div className="mt-1 border-2 border-dashed rounded-xl p-4 text-center dark:border-slate-700">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processFile(file, 
                            (b64) => setComplaintFields(prev => ({ ...prev, supportingDoc: b64 })),
                            () => {}
                          );
                        }
                      }}
                      className="text-xs text-slate-500 mx-auto"
                    />
                    <p className="text-[10px] text-slate-400 mt-2">{lang === 'ar' ? 'الحجم الأقصى: 5 ميغابايت' : 'Taille max: 5 Mo'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t dark:border-slate-700 pt-6">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('complaints')}
                    className="px-5 py-2.5 rounded-xl border text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingComplaint}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingComplaint ? (lang === 'ar' ? 'جاري الإرسال...' : 'Envoi...') : (lang === 'ar' ? 'تقديم الشكوى الآن' : 'Soumettre la réclamation')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Subtab: Notifications */}
          {activeSubTab === 'notifications' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-xl font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'الإشعارات والمراسلات الإدارية' : 'Centre d\'alertes et notifications'}
              </h2>

              {notificationsList.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">{lang === 'ar' ? 'علبة الرسائل فارغة.' : 'Aucune notification.'}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {notificationsList.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className={`p-4 rounded-xl border transition-all text-sm flex gap-3.5 relative ${
                        n.isRead 
                          ? 'bg-white dark:bg-slate-800 dark:border-slate-700 border-slate-100 text-slate-600' 
                          : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 text-slate-800 dark:text-slate-200 font-semibold'
                      }`}
                    >
                      <Bell className={`h-5 w-5 mt-0.5 shrink-0 ${n.isRead ? 'text-slate-400' : 'text-blue-600'}`} />
                      <div>
                        <h4 className="font-bold">{lang === 'ar' ? n.titleAr : n.titleFr}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{lang === 'ar' ? n.messageAr : n.messageFr}</p>
                      </div>
                      {!n.isRead && (
                        <span className="absolute top-4 right-4 h-2, w-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subtab: Profile Editor */}
          {activeSubTab === 'profile' && profile && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-xl font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'إعدادات الملف الشخصي والتحقق' : 'Détails de mon profil'}
              </h2>

              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                
                {profileEditSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 text-xs rounded-lg font-semibold">{t.successSaved}</div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formFullName}</label>
                    <input
                      type="text"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formCin}</label>
                    <input
                      type="text"
                      disabled
                      value={profile.cin || ''}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formPhone}</label>
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formEmail}</label>
                    <input
                      type="email"
                      disabled
                      value={profile.email || ''}
                      className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">{t.formAddress}</label>
                  <textarea
                    rows={2}
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                  />
                </div>

                <div className="border-t dark:border-slate-700 pt-6">
                  <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white mb-4">
                    {lang === 'ar' ? 'التحقق من الهوية المرفوع' : 'Documents d\'identité déposés'}
                  </h3>
                  <div className="flex gap-4">
                    <span className="text-xs text-slate-500">
                      {lang === 'ar' ? 'حالة الحساب المعتمد: ' : 'Statut du compte : '}
                      <span className={`font-bold uppercase ${
                        profile.verifiedStatus === 'approved' ? 'text-green-600' : 'text-amber-500'
                      }`}>
                        {profile.verifiedStatus}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 text-sm font-bold shadow-sm self-start"
                >
                  {lang === 'ar' ? 'تحديث الملف الشخصي' : 'Sauvegarder le profil'}
                </button>

              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
