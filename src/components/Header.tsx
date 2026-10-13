import React, { useState } from 'react';
import { translations } from '../types.ts';
import { Globe, Moon, Sun, User, LogOut, Shield, Menu, X, Landmark, PhoneCall } from 'lucide-react';

interface HeaderProps {
  lang: 'ar' | 'fr';
  setLang: (lang: 'ar' | 'fr') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export default function Header({
  lang,
  setLang,
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenAuth,
}: HeaderProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: t.navHome },
    { id: 'services', label: t.navServices },
    { id: 'demande', label: lang === 'ar' ? 'طلب وثيقة' : 'Demander un acte' },
    { id: 'track', label: t.navTrack },
    { id: 'complaints', label: t.navComplaints },
    { id: 'news', label: t.navNews },
    { id: 'faq', label: t.navFaq },
    { id: 'contact', label: t.navContact },
  ];

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    if (id === 'contact') {
      setActiveTab('home');
      setTimeout(() => {
        const section = document.getElementById('contact-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } else if (id === 'complaints') {
      if (!user) {
        onOpenAuth();
      } else {
        // Set tab to citizen dashboard and trigger complaints view
        setActiveTab('citizen');
        // Let App component or dashboard handle it via storage or state
        localStorage.setItem('civil_preselected_subtab', 'complaints');
        // Force state update if dashboard is already mounted
        window.dispatchEvent(new Event('storage_subtab_change'));
      }
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="w-full flex flex-col" id="site-header">
      {/* 1. Official Moroccan Government Top Ribbon */}
      <div className="bg-[#005BAC] text-white border-b border-white/10 text-[11px] sm:text-xs py-2 px-4 sm:px-6 lg:px-12 xl:px-16 flex items-center justify-between font-sans font-medium select-none shadow-inner">
        <div className="flex items-center gap-2">
          <Landmark className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>
            {lang === 'ar' ? 'المملكة المغربية | وزارة الداخلية | عمالة تارودانت' : 'Royaume du Maroc | Ministère de l\'Intérieur | Province de Taroudant'}
          </span>
        </div>
        <div className="flex items-center gap-4 hidden sm:flex">
          <div className="flex items-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
            <span dir="ltr">{t.phoneVal}</span>
          </div>
          <span>•</span>
          <span>{lang === 'ar' ? 'البوابة الرسمية لجماعة أولاد تايمة' : 'Portail Officiel de la Commune d\'Ouled Teima'}</span>
        </div>
      </div>

      {/* 2. Centered Logo and Bilingual Heading Section (Larger, Sharp, Highly Professional) */}
      <div className="bg-white dark:bg-slate-950 py-8 border-b border-slate-100 dark:border-slate-800 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center text-center">
          
          {/* Main Logo Container */}
          <div className="relative mb-4 group select-none">
            {/* Elegant double gold/green border rings resembling Moroccan design */}
            <div className="absolute -inset-2.5 rounded-full border-2 border-emerald-500/30 dark:border-emerald-400/20 group-hover:scale-105 transition-transform duration-300 pointer-events-none" />
            <div className="absolute -inset-1 rounded-full border border-[#005BAC]/30 dark:border-[#005BAC]/20 pointer-events-none" />
            <img 
              src="https://i.imgur.com/y0NHtSU.png" 
              alt="Commune d'Ouled Teima" 
              className="relative h-24 w-24 object-contain rounded-full bg-white p-1 shadow-md hover:rotate-3 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bilingual Institutional Texts */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-6 md:gap-12 mt-2 w-full max-w-4xl">
            {/* Arabic Title */}
            <div className="flex flex-col items-center md:items-end md:text-right flex-1 select-none">
              <h1 className="font-sans font-bold text-2xl text-slate-900 dark:text-white leading-tight tracking-wide">
                جماعة أولاد تايمة
              </h1>
              <p className="font-sans text-sm text-[#198754] dark:text-emerald-400 font-bold mt-1">
                البوابة الإلكترونية للحالة المدنية
              </p>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-[1px] h-12 bg-slate-200 dark:bg-slate-800 self-center" />

            {/* French Title */}
            <div className="flex flex-col items-center md:items-start md:text-left flex-1 select-none">
              <h1 className="font-sans font-bold text-2xl text-slate-900 dark:text-white leading-tight tracking-wide">
                Commune d'Ouled Teima
              </h1>
              <p className="font-sans text-sm text-[#005BAC] dark:text-blue-400 font-bold mt-1">
                Portail électronique de l'État Civil
              </p>
            </div>
          </div>
          
        </div>
      </div>

      {/* 3. Sleek, Premium Sticky Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16 h-14 flex items-center justify-between">
          
          {/* Main Menu for Desktop */}
          <div className="hidden md:flex items-center gap-1.5 xl:gap-2">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`font-sans text-[13px] xl:text-sm font-semibold transition-all duration-150 py-1.5 px-3 rounded-lg border flex items-center gap-1.5 ${
                    isActive 
                      ? 'text-white bg-[#005BAC] border-[#005BAC] shadow-xs' 
                      : 'text-slate-700 dark:text-slate-300 hover:text-[#005BAC] dark:hover:text-white bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Auth Portal Button if Logged In */}
            {user && (
              <button
                onClick={() => {
                  if (['admin', 'Administrator', 'Super Administrator'].includes(user.role)) setActiveTab('admin');
                  else if (['employee', 'Agent', 'Supervisor'].includes(user.role)) setActiveTab('employee');
                  else setActiveTab('citizen');
                }}
                className={`font-sans text-[13px] xl:text-sm font-bold transition-all duration-150 py-1.5 px-3 rounded-lg border flex items-center gap-1.5 ${
                  ['citizen', 'employee', 'admin'].includes(activeTab)
                    ? 'text-white bg-[#198754] border-[#198754] shadow-xs'
                    : 'text-[#198754] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40'
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span>
                  {['admin', 'Administrator', 'Super Administrator'].includes(user.role) 
                    ? t.adminPortal 
                    : ['employee', 'Agent', 'Supervisor'].includes(user.role) 
                      ? t.employeePortal 
                      : t.citizenPortal}
                </span>
              </button>
            )}
          </div>

          {/* Controls & Mini Auth Segment */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Switcher */}
            <button
              onClick={() => {
                setLang(lang === 'ar' ? 'fr' : 'ar');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[#005BAC] hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
              title="Changer de langue / تغيير اللغة"
            >
              <Globe className="h-3.5 w-3.5 text-[#005BAC] dark:text-blue-400 shrink-0" />
              <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors bg-slate-50 dark:bg-slate-900"
              title="Theme Toggle"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-blue-800" />}
            </button>

            {/* Authentication Buttons (Desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (['admin', 'Administrator', 'Super Administrator'].includes(user.role)) setActiveTab('admin');
                      else if (['employee', 'Agent', 'Supervisor'].includes(user.role)) setActiveTab('employee');
                      else setActiveTab('citizen');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <User className="h-3.5 w-3.5 text-[#005BAC]" />
                    <span className="max-w-[100px] truncate">{user.name}</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 bg-transparent transition-colors"
                    title={t.navLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('employee')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#005BAC] dark:text-blue-400 border border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-all"
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>{lang === 'ar' ? 'فضاء الموظفين' : 'Espace Employés'}</span>
                  </button>
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-[#005BAC] hover:bg-[#004b91] rounded-lg shadow-sm transition-all"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span>{t.navLogin}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Menu (Mobile Only) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex flex-col gap-2 shadow-lg animate-fade-in">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full font-sans text-sm font-bold py-2.5 px-4 rounded-xl text-start transition-all flex items-center justify-between ${
                    isActive 
                      ? 'text-white bg-[#005BAC]' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Portal Option or Login in Mobile Menu */}
            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (['admin', 'Administrator', 'Super Administrator'].includes(user.role)) setActiveTab('admin');
                    else if (['employee', 'Agent', 'Supervisor'].includes(user.role)) setActiveTab('employee');
                    else setActiveTab('citizen');
                  }}
                  className={`w-full font-sans text-sm font-bold py-2.5 px-4 rounded-xl text-start transition-all flex items-center gap-2 ${
                    ['citizen', 'employee', 'admin'].includes(activeTab)
                      ? 'text-white bg-[#198754]'
                      : 'text-[#198754] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                  }`}
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>
                    {['admin', 'Administrator', 'Super Administrator'].includes(user.role) 
                      ? t.adminPortal 
                      : ['employee', 'Agent', 'Supervisor'].includes(user.role) 
                        ? t.employeePortal 
                        : t.citizenPortal}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full font-sans text-sm font-bold py-2.5 px-4 rounded-xl text-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>{t.navLogout}</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveTab('employee');
                  }}
                  className="w-full font-sans text-sm font-bold py-2.5 px-4 rounded-xl text-start transition-all flex items-center gap-2 text-[#005BAC] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20"
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>{lang === 'ar' ? 'فضاء الموظفين' : 'Espace Employés'}</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full font-sans text-sm font-bold py-2.5 px-4 rounded-xl text-start text-white bg-[#005BAC] flex items-center gap-2 justify-center"
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span>{t.navLogin}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
