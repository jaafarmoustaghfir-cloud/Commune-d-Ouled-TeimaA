import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import Hero from './components/Hero.tsx';
import Services from './components/Services.tsx';
import Announcements from './components/Announcements.tsx';
import CitizenDashboard from './components/CitizenDashboard.tsx';
import EmployeeDashboard from './components/EmployeeDashboard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import AuthModal from './components/AuthModal.tsx';
import EmployeeLogin from './components/EmployeeLogin.tsx';
import DemandeForm from './components/DemandeForm.tsx';
import SuiviDemande from './components/SuiviDemande.tsx';
import { translations } from './types.ts';
import { ShieldCheck, HelpCircle, ChevronDown, ChevronUp, MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'fr'>('ar');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [sessionErrorMsg, setSessionErrorMsg] = useState<string>('');
  const [initialAuthTab, setInitialAuthTab] = useState<'citizen' | 'employee' | 'admin'>('citizen');

  // announcements state
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);

  // quick navigation to service form
  const [preselectedService, setPreselectedService] = useState<string>('');
  const [targetTrackingNumber, setTargetTrackingNumber] = useState<string>('');

  // FAQ Accordion state
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});

  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Toggle dark mode class on HTML document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Global fetch interceptor to catch expired/invalid sessions safely
  useEffect(() => {
    const originalFetch = window.fetch;
    let fetchOverridden = false;

    const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const inputStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
      
      if ((response.status === 401 || response.status === 403) && 
          (inputStr.includes('/api/employee') || inputStr.includes('/api/admin'))) {
        
        // Auto-logout
        setToken('');
        setUser(null);
        localStorage.removeItem('civil_token');
        localStorage.removeItem('civil_user');
        document.cookie = 'civil_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        
        setSessionErrorMsg(lang === 'ar' ? "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى." : "Votre session a expiré. Veuillez vous reconnecter.");
        setInitialAuthTab('employee');
        setIsAuthOpen(true);
        setActiveTab('home');
      }
      return response;
    };

    try {
      // Try direct assignment
      (window as any).fetch = interceptedFetch;
      fetchOverridden = true;
    } catch (e) {
      console.warn('Direct assignment to window.fetch failed, trying Object.defineProperty...', e);
      try {
        Object.defineProperty(window, 'fetch', {
          value: interceptedFetch,
          configurable: true,
          writable: true
        });
        fetchOverridden = true;
      } catch (defineError) {
        console.error('Failed to override window.fetch with Object.defineProperty:', defineError);
      }
    }

    return () => {
      if (fetchOverridden) {
        try {
          (window as any).fetch = originalFetch;
        } catch (e) {
          // Ignore if unable to restore
        }
      }
    };
  }, [lang]);

  // Direct URL routing checks & redirects to protect employee/admin pages from direct route bypasses
  useEffect(() => {
    const path = window.location.pathname;
    const protectedPaths = [
      '/employee', 
      '/dashboard', 
      '/requests', 
      '/complaints', 
      '/documents', 
      '/statistics', 
      '/settings', 
      '/users', 
      '/admin'
    ];
    
    if (protectedPaths.includes(path)) {
      const savedToken = localStorage.getItem('civil_token');
      const savedUserStr = localStorage.getItem('civil_user');
      
      if (!savedToken || !savedUserStr) {
        setActiveTab('employee');
        window.history.replaceState({}, '', '/');
      } else {
        try {
          const savedUser = JSON.parse(savedUserStr);
          const allowedRoles = ['employee', 'Agent', 'Supervisor', 'admin', 'Administrator', 'Super Administrator'];
          if (!allowedRoles.includes(savedUser.role)) {
            setActiveTab('employee');
            window.history.replaceState({}, '', '/');
          } else {
            // Authorized! Redirect to their tab
            if (['admin', 'Administrator', 'Super Administrator'].includes(savedUser.role)) {
              setActiveTab('admin');
            } else {
              setActiveTab('employee');
            }
          }
        } catch (e) {
          setActiveTab('employee');
          window.history.replaceState({}, '', '/');
        }
      }
    }
  }, []);

  // Load auth state and announcements on start
  useEffect(() => {
    const savedToken = localStorage.getItem('civil_token');
    const savedUser = localStorage.getItem('civil_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/citizen/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncementsList(data);
      }
    } catch (e) {
      console.error('Failed to load announcements', e);
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('civil_token', newToken);
    localStorage.setItem('civil_user', JSON.stringify(newUser));

    // Also set cookie for direct route server checks
    document.cookie = `civil_token=${newToken}; path=/; max-age=86400; SameSite=Strict`;

    // Clear any previous session errors
    setSessionErrorMsg('');

    // Redirect to matching portal based on role mapping
    if (['admin', 'Administrator', 'Super Administrator'].includes(newUser.role)) {
      setActiveTab('admin');
    } else if (['employee', 'Agent', 'Supervisor'].includes(newUser.role)) {
      setActiveTab('employee');
    } else {
      setActiveTab('citizen');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('civil_token');
    localStorage.removeItem('civil_user');
    // Clear cookie
    document.cookie = 'civil_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    setActiveTab('home');
  };

  const handleSelectService = (serviceId: string) => {
    if (serviceId === 'track') {
      setActiveTab('track');
      return;
    }
    if (serviceId === 'appointment') {
      if (!user) {
        setIsAuthOpen(true);
        setPreselectedService(serviceId);
        return;
      }
      setPreselectedService(serviceId);
      setActiveTab('citizen');
      return;
    }
    // Civil status document request directly available without login
    setPreselectedService(serviceId);
    setActiveTab('demande');
  };

  const toggleFaq = (index: number) => {
    setFaqOpen({ ...faqOpen, [index]: !faqOpen[index] });
  };

  const faqItems = [
    {
      qAr: 'ما هي الوثائق المطلوبة لفتح حساب تتبع وتأكيد الهوية؟',
      qFr: 'Quels sont les documents requis pour ouvrir un compte et vérifier l\'identité ?',
      aAr: 'تحتاج فقط إلى ملء الاسم الكامل، رقم البطاقة الوطنية (CIN)، رقم هاتف مفعل، وتحميل صورة واضحة للوجهين الأمامي والخلفي لبطاقتك الوطنية (الحد الأقصى 5 ميغابايت).',
      aFr: 'Vous devez uniquement saisir votre nom, n° CIN, téléphone et télécharger une copie nette recto/verso de votre Carte d\'Identité Nationale (CIN) inférieure à 5 Mo.'
    },
    {
      qAr: 'كم من الوقت تستغرق معالجة طلب وثيقة الحالة المدنية إلكترونياً؟',
      qFr: 'Combien de temps faut-il pour obtenir un document d\'état civil en ligne ?',
      aAr: 'يتم مراجعة الطلبات ومطابقتها مع السجلات الأصلية في غضون 24 ساعة كحد أقصى. ستتلقى إشعاراً فور جاهزية وثيقتك للاستلام بمقر الجماعة.',
      aFr: 'Le délai d\'examen et de signature est généralement inférieur à 24 heures. Vous recevrez une alerte en temps réel dès que l\'acte est prêt pour retrait.'
    },
    {
      qAr: 'هل الوثائق المستخرجة من هذه البوابة قانونية ومعترف بها؟',
      qFr: 'Les documents délivrés via ce portail sont-ils officiels ?',
      aAr: 'نعم، تماماً. جميع الوثائق المسلمة تحمل توقيعاً رقمياً معتمداً لضابط الحالة المدنية ورمز استجابة سريعة (QR Code) فريداً يتيح للمؤسسات التحقق الفوري من صلاحية الوثيقة.',
      aFr: 'Oui, tous les documents intègrent une signature numérique homologuée et un code QR unique certifiant leur authenticité légale auprès des administrations.'
    },
    {
      qAr: 'هل يمكنني تفويض شخص آخر لتسلم وثيقتي من مقر الجماعة؟',
      qFr: 'Puis-je mandater quelqu\'un d\'autre pour retirer mon document ?',
      aAr: 'نعم، شريطة أن يستظهر الشخص المفوض بوصل إيداع الطلب المطبوع (أو الرقم الفريد) مصحوباً بتوكيل موقع أو نسخة من بطاقتكم الوطنية للتحقق.',
      aFr: 'Oui, à condition que le mandataire présente le récépissé de dépôt imprimé (avec QR) et une copie de votre CIN.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header component */}
      <Header
        lang={lang}
        setLang={setLang}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setSessionErrorMsg('');
          setInitialAuthTab('citizen');
          setIsAuthOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* VIEW: HOME VIEW */}
        {activeTab === 'home' && (
          <div>
            <Hero
              lang={lang}
              onRequestBtn={() => handleSelectService('extrait_naissance')}
              onTrackBtn={() => handleSelectService('track')}
            />
            
            <Services
              lang={lang}
              onSelectService={handleSelectService}
            />

            <Announcements
              lang={lang}
              list={announcementsList}
            />

            {/* Google Maps / Contact info Section */}
            <section id="contact-section" className="py-16 bg-white dark:bg-slate-900 border-t dark:border-slate-800 transition-colors">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  
                  {/* Info Column */}
                  <div>
                    <span className="text-xs font-bold text-[#005BAC] dark:text-blue-400 uppercase tracking-wide">
                      {lang === 'ar' ? 'الموقع الجغرافي والاتصال' : 'Localisation & Contact'}
                    </span>
                    <h2 className="text-2xl font-sans font-bold text-slate-900 dark:text-white tracking-tight mt-2 mb-6">
                      {lang === 'ar' ? 'تفضلوا بزيارة مقر الجماعة' : 'Rendez-vous au Bureau d\'État Civil'}
                    </h2>

                    <div className="flex flex-col gap-5 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-[#005BAC] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 dark:text-white">{lang === 'ar' ? 'العنوان الرئيسي:' : 'Adresse postale :'}</strong>
                          <p className="mt-1 text-slate-500 dark:text-slate-400">{t.addressVal}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-[#198754] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 dark:text-white">{lang === 'ar' ? 'مواعيد الاستقبال:' : 'Heures d\'accueil :'}</strong>
                          <p className="mt-1 text-slate-500 dark:text-slate-400">{t.workingHoursVal}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 dark:text-white">{lang === 'ar' ? 'الهاتف المباشر:' : 'Ligne directe :'}</strong>
                          <p className="mt-1 text-slate-500 dark:text-slate-400" dir="ltr">{t.phoneVal}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Maps placeholder (elegant schematic layout) */}
                  <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-center p-6">
                    <div className="absolute inset-0 bg-[radial-gradient(#ccc_1px,transparent_1px)] [background-size:16px_16px] opacity-40 dark:opacity-10" />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="p-3 bg-blue-50 dark:bg-slate-800 text-[#005BAC] dark:text-blue-400 rounded-2xl mb-4 border border-blue-100 dark:border-slate-700">
                        <MapPin className="h-8 w-8" />
                      </div>
                      <h4 className="font-sans font-bold text-slate-800 dark:text-white text-md">
                        {lang === 'ar' ? 'خريطة جماعة أولاد تايمة' : 'Plan de la Commune d\'Ouled Teima'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                        {lang === 'ar' ? 'شارع محمد الخامس، أولاد تايمة، المغرب' : 'Avenue Mohammed V, Ouled Teima, Maroc'}
                      </p>
                      <span className="mt-4 px-3 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold">
                        {lang === 'ar' ? 'الإحداثيات الجغرافية: 30.3957° شمالاً، 9.2144° غرباً' : 'Coordonnées : 30.3957° N, 9.2144° O'}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* FAQ Accordion Section */}
            <section className="py-12 bg-slate-50 dark:bg-slate-950 transition-colors">
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-sans font-bold text-slate-900 dark:text-white tracking-tight text-center mb-8">
                  {t.faqTitle}
                </h2>

                <div className="flex flex-col gap-4">
                  {faqItems.map((item, index) => {
                    const isOpen = !!faqOpen[index];
                    return (
                      <div
                        key={index}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs transition-all"
                      >
                        <button
                          onClick={() => toggleFaq(index)}
                          className="w-full p-5 text-start font-sans font-bold text-slate-800 dark:text-white flex justify-between items-center gap-4 text-sm sm:text-base"
                        >
                          <span>{lang === 'ar' ? item.qAr : item.qFr}</span>
                          {isOpen ? <ChevronUp className="h-5 w-5 shrink-0 text-blue-600" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
                        </button>
                        {isOpen && (
                          <div className="p-5 border-t dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                            {lang === 'ar' ? item.aAr : item.aFr}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

          </div>
        )}

        {/* VIEW: ELECTRONIC SERVICES VIEW */}
        {activeTab === 'services' && (
          <Services
            lang={lang}
            onSelectService={handleSelectService}
          />
        )}

        {/* VIEW: CITIZEN REQUEST FORM (SANS COMPTE / FIRESTORE & STORAGE) */}
        {activeTab === 'demande' && (
          <DemandeForm
            lang={lang}
            initialDocType={preselectedService || 'extrait_naissance'}
            onGoToTrack={(numero) => {
              setTargetTrackingNumber(numero);
              setActiveTab('track');
            }}
            onCancel={() => setActiveTab('home')}
          />
        )}

        {/* VIEW: CITIZEN TRACKING (SANS COMPTE / FIRESTORE GETDOC) */}
        {activeTab === 'track' && (
          <SuiviDemande
            lang={lang}
            initialTrackingNumber={targetTrackingNumber}
            onNewRequest={() => {
              setPreselectedService('extrait_naissance');
              setActiveTab('demande');
            }}
          />
        )}

        {/* VIEW: NEWS & EVENTS DIRECT ROUTE */}
        {activeTab === 'news' && (
          <Announcements
            lang={lang}
            list={announcementsList}
          />
        )}

        {/* VIEW: FAQ DIRECT ROUTE */}
        {activeTab === 'faq' && (
          <section className="py-16 bg-slate-50 dark:bg-slate-950 transition-colors">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-sans font-bold text-slate-900 dark:text-white tracking-tight text-center mb-8">
                {t.faqTitle}
              </h2>

              <div className="flex flex-col gap-4">
                {faqItems.map((item, index) => {
                  const isOpen = !!faqOpen[index];
                  return (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs transition-all"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full p-5 text-start font-sans font-bold text-slate-800 dark:text-white flex justify-between items-center gap-4 text-sm sm:text-base"
                      >
                        <span>{lang === 'ar' ? item.qAr : item.qFr}</span>
                        {isOpen ? <ChevronUp className="h-5 w-5 shrink-0 text-blue-600" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
                      </button>
                      {isOpen && (
                        <div className="p-5 border-t dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {lang === 'ar' ? item.aAr : item.aFr}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* WORKSPACE PORTALS */}
        {activeTab === 'citizen' && token && (
          <CitizenDashboard
            lang={lang}
            token={token}
            user={user}
            preselectedService={preselectedService}
          />
        )}

        {activeTab === 'employee' && (
          token && user && ['employee', 'Agent', 'Supervisor', 'admin', 'Administrator', 'Super Administrator'].includes(user.role) ? (
            <EmployeeDashboard
              lang={lang}
              token={token}
              user={user}
            />
          ) : (
            <EmployeeLogin
              lang={lang}
              onLoginSuccess={handleLoginSuccess}
            />
          )
        )}

        {activeTab === 'admin' && token && (
          <AdminDashboard
            lang={lang}
            token={token}
            user={user}
          />
        )}

      </main>

      {/* Shared Footer component */}
      <Footer lang={lang} />

      {/* Global Auth Modal */}
      <AuthModal
        lang={lang}
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setSessionErrorMsg('');
        }}
        onLoginSuccess={handleLoginSuccess}
        sessionErrorMsg={sessionErrorMsg}
        initialTab={initialAuthTab}
      />

    </div>
  );
}
