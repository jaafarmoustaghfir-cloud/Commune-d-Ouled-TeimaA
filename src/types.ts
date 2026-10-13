export interface TranslationDict {
  siteTitle: string;
  siteSubtitle: string;
  navHome: string;
  navServices: string;
  navTrack: string;
  navNews: string;
  navFaq: string;
  navComplaints: string;
  navContact: string;
  navLogin: string;
  navLogout: string;
  heroTitle: string;
  heroSubtitle: string;
  heroRequestBtn: string;
  heroTrackBtn: string;
  workingHours: string;
  workingHoursVal: string;
  contactUs: string;
  addressVal: string;
  phoneVal: string;
  emailVal: string;
  faqTitle: string;
  servicesTitle: string;
  servicesSubtitle: string;
  citizenPortal: string;
  employeePortal: string;
  adminPortal: string;
  
  // Services
  srvExtrait: string;
  srvCopie: string;
  srvDeces: string;
  srvNaissance: string;
  srvRectif: string;
  srvRdv: string;
  srvSuivi: string;

  // Requests status
  statusSubmitted: string;
  statusReview: string;
  statusMissing: string;
  statusApproved: string;
  statusReady: string;
  statusDelivered: string;
  statusRejected: string;

  // Form fields
  formFullName: string;
  formCin: string;
  formDob: string;
  formPob: string;
  formActNum: string;
  formActYear: string;
  formActOffice: string;
  formPhone: string;
  formEmail: string;
  formAddress: string;
  formDocType: string;
  formCopies: string;
  formDelivery: string;
  formDeliveryPickup: string;
  formDeliveryPost: string;
  formUploads: string;
  formCinFront: string;
  formCinBack: string;
  formSubmitBtn: string;

  // Alerts & General
  loading: string;
  noData: string;
  errorOccurred: string;
  successSubmitted: string;
  successSaved: string;
}

export const translations: Record<'ar' | 'fr', TranslationDict> = {
  ar: {
    siteTitle: "جماعة أولاد تايمة",
    siteSubtitle: "مصلحة الحالة المدنية",
    navHome: "الرئيسية",
    navServices: "الخدمات الإلكترونية",
    navTrack: "تتبع الطلب",
    navNews: "الأخبار",
    navFaq: "الأسئلة الشائعة",
    navComplaints: "الشكايات",
    navContact: "اتصل بنا",
    navLogin: "تسجيل الدخول",
    navLogout: "تسجيل الخروج",
    heroTitle: "مرحباً بكم في البوابة الإلكترونية للحالة المدنية لجماعة أولاد تايمة",
    heroSubtitle: "بوابة آمنة ومريحة لطلب وثائق الحالة المدنية وتتبعها وتسيير المواعيد دون عناء التنقل.",
    heroRequestBtn: "طلب وثيقة جديدة",
    heroTrackBtn: "تتبع حالة طلبك",
    workingHours: "أوقات العمل",
    workingHoursVal: "الإثنين - الجمعة: 08:30 صباحاً - 03:30 بعد الزوال",
    contactUs: "اتصل بنا",
    addressVal: "شارع محمد الخامس، بلدية أولاد تايمة، المغرب",
    phoneVal: "05 28 52 60 00",
    emailVal: "contact@ouledteima.ma",
    faqTitle: "الأسئلة الأكثر شيوعاً",
    servicesTitle: "الخدمات الإلكترونية المتاحة",
    servicesSubtitle: "يمكنكم تقديم طلباتكم للحصول على وثائق الحالة المدنية الرسمية عن بعد",
    citizenPortal: "بوابة المواطن",
    employeePortal: "بوابة الموظف",
    adminPortal: "الإدارة الفوقية",
    
    srvExtrait: "نسخة موجزة من رسم الولادة",
    srvCopie: "نسخة كاملة من رسم الولادة",
    srvDeces: "شهادة الوفاة",
    srvNaissance: "التصريح بولادة جديدة",
    srvRectif: "تصحيح الحالة المدنية",
    srvRdv: "حجز موعد حضوري",
    srvSuivi: "تتبع الطلبات",

    statusSubmitted: "تم الإرسال",
    statusReview: "قيد المراجعة",
    statusMissing: "وثائق ناقصة",
    statusApproved: "مقبول",
    statusReady: "جاهز للاستلام",
    statusDelivered: "تم التسليم",
    statusRejected: "مرفوض",

    formFullName: "الاسم الكامل",
    formCin: "رقم البطاقة الوطنية (CIN)",
    formDob: "تاريخ الازدياد",
    formPob: "مكان الازدياد",
    formActNum: "رقم رسم الولادة (مثال: 78/234)",
    formActYear: "سنة التسجيل",
    formActOffice: "مكتب الحالة المدنية / الجماعة",
    formPhone: "رقم الهاتف",
    formEmail: "البريد الإلكتروني",
    formAddress: "العنوان الحالي",
    formDocType: "نوع الوثيقة المطلوبة",
    formCopies: "عدد النسخ",
    formDelivery: "طريقة الاستلام",
    formDeliveryPickup: "الاستلام المباشر بمقر الجماعة",
    formDeliveryPost: "الإرسال عبر البريد المضمون",
    formUploads: "الوثائق الداعمة المرفوعة",
    formCinFront: "صورة الوجه الأمامي للبطاقة الوطنية",
    formCinBack: "صورة الوجه الخلفي للبطاقة الوطنية",
    formSubmitBtn: "إرسال الطلب",

    loading: "جاري التحميل...",
    noData: "لا توجد بيانات متاحة حالياً.",
    errorOccurred: "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.",
    successSubmitted: "تم إرسال طلبكم بنجاح! رقم تتبع طلبكم هو: ",
    successSaved: "تم حفظ التعديلات بنجاح.",
  },
  fr: {
    siteTitle: "Commune d'Ouled Teima",
    siteSubtitle: "Bureau de l'État Civil",
    navHome: "Accueil",
    navServices: "Services électroniques",
    navTrack: "Suivi de demande",
    navNews: "Actualités",
    navFaq: "FAQ",
    navComplaints: "Réclamations",
    navContact: "Contact",
    navLogin: "Connexion",
    navLogout: "Déconnexion",
    heroTitle: "Bienvenue sur le portail électronique de l'état civil de la Commune d'Ouled Teima",
    heroSubtitle: "Un portail sécurisé pour demander vos actes administratifs, prendre rendez-vous et suivre vos dossiers à distance.",
    heroRequestBtn: "Demander un document",
    heroTrackBtn: "Suivre ma demande",
    workingHours: "Heures d'ouverture",
    workingHoursVal: "Lundi - Vendredi : 08h30 - 15h30",
    contactUs: "Contactez-nous",
    addressVal: "Avenue Mohammed V, Hôtel de Ville, Ouled Teima, Maroc",
    phoneVal: "+212 5 28 52 60 00",
    emailVal: "contact@ouledteima.ma",
    faqTitle: "Foire Aux Questions",
    servicesTitle: "Services électroniques",
    servicesSubtitle: "Effectuez vos démarches administratives de l'état civil en toute sécurité",
    citizenPortal: "Portail Citoyen",
    employeePortal: "Espace Fonctionnaire",
    adminPortal: "Super Administration",

    srvExtrait: "Extrait d'acte de naissance",
    srvCopie: "Copie intégrale de naissance",
    srvDeces: "Acte de décès",
    srvNaissance: "Déclaration de naissance",
    srvRectif: "Rectification d'état civil",
    srvRdv: "Prendre rendez-vous",
    srvSuivi: "Suivi de demande",

    statusSubmitted: "Transmis",
    statusReview: "En cours d'examen",
    statusMissing: "Documents manquants",
    statusApproved: "Approuvé",
    statusReady: "Prêt pour retrait",
    statusDelivered: "Délivré",
    statusRejected: "Rejeté",

    formFullName: "Nom complet",
    formCin: "N° Carte Nationale (CIN)",
    formDob: "Date de naissance",
    formPob: "Lieu de naissance",
    formActNum: "Numéro d'acte (Ex: 234/78)",
    formActYear: "Année de l'acte",
    formActOffice: "Bureau d'état civil / Commune",
    formPhone: "Téléphone",
    formEmail: "Adresse Email",
    formAddress: "Adresse de résidence",
    formDocType: "Type de document requis",
    formCopies: "Nombre de copies",
    formDelivery: "Mode de livraison",
    formDeliveryPickup: "Retrait au Bureau de l'État Civil",
    formDeliveryPost: "Envoi par Courrier Recommandé",
    formUploads: "Documents justificatifs",
    formCinFront: "Recto de la Carte d'Identité (CIN)",
    formCinBack: "Verso de la Carte d'Identité (CIN)",
    formSubmitBtn: "Envoyer la demande",

    loading: "Chargement en cours...",
    noData: "Aucune donnée disponible pour le moment.",
    errorOccurred: "Une erreur est survenue, veuillez réessayer.",
    successSubmitted: "Votre demande a été soumise avec succès ! Numéro de suivi : ",
    successSaved: "Modifications enregistrées avec succès.",
  }
};
