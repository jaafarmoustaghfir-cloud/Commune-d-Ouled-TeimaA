import React, { useState, useEffect } from 'react';
import { translations } from '../types.ts';
import { Shield, Mail, Lock, User, AlertCircle, X, Globe, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  lang: 'ar' | 'fr';
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
  sessionErrorMsg?: string;
  initialTab?: 'citizen' | 'employee' | 'admin';
}

export default function AuthModal({ lang, isOpen, onClose, onLoginSuccess, sessionErrorMsg, initialTab }: AuthModalProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'citizen' | 'employee' | 'admin'>(initialTab || 'citizen');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [fields, setFields] = useState({
    username: '', // employee / admin
    password: '',
    email: '',    // citizen
    name: '',     // citizen register
    cin: '',      // citizen register
    phone: '',    // citizen register
    address: '',  // citizen register
    birthRegNum: '',
    birthRegYear: '',
    birthRegOffice: 'Ouled Teima',
    dateOfBirth: '',
    placeOfBirth: '',
  });

  // Force Password Change Form State
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Citizen Registration
      if (activeTab === 'citizen' && isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: fields.email,
            password: fields.password,
            name: fields.name,
            cin: fields.cin,
            phone: fields.phone,
            address: fields.address,
            birthRegNum: fields.birthRegNum,
            birthRegYear: fields.birthRegYear,
            birthRegOffice: fields.birthRegOffice,
            dateOfBirth: fields.dateOfBirth,
            placeOfBirth: fields.placeOfBirth,
          })
        });

        const data = await res.json();
        if (res.ok) {
          setSuccessMsg(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول الآن.' : 'Compte créé avec succès ! Veuillez vous connecter.');
          setIsRegister(false);
        } else {
          setErrorMsg(data.error || 'Registration failed');
        }
        return;
      }

      // 2. Logins
      let url = '/api/auth/login/citizen';
      let payload: any = { email: fields.email, password: fields.password };

      if (activeTab === 'employee') {
        url = '/api/auth/login/employee';
        payload = { username: fields.username, password: fields.password };
      } else if (activeTab === 'admin') {
        url = '/api/auth/login/admin';
        payload = { username: fields.username, password: fields.password };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        // If it's an employee and needs to change password on first login
        if (data.user.forcePasswordChange) {
          setMustChangePassword(true);
          setTempUser(data.user);
          setTempToken(data.token);
          return;
        }

        onLoginSuccess(data.token, data.user);
        onClose();
      } else {
        setErrorMsg(data.error || 'Authentication failed');
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg(lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 4 أحرف على الأقل.' : 'Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password-force', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        // Login success with refreshed user data
        onLoginSuccess(tempToken, { ...tempUser, forcePasswordChange: false });
        setMustChangePassword(false);
        setTempUser(null);
        setTempToken('');
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to update password');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header decoration */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-8 text-white relative">
          <div className="flex flex-col items-center justify-center text-center gap-3.5 w-full">
            <img 
              src="https://i.imgur.com/y0NHtSU.png" 
              alt="Commune Logo" 
              className="h-14 w-14 object-contain rounded-full bg-white p-0.5 shadow-md mx-auto"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-lg font-bold font-sans tracking-tight">
                {lang === 'ar' ? 'البوابة الرقمية الموحدة لتسجيل الدخول' : 'Portail d\'Authentification Unique'}
              </h3>
              <p className="text-xs text-blue-100 mt-1">Commune d'Ouled Teima - Bureau de l'État Civil</p>
            </div>
          </div>
        </div>

        {/* MUST CHANGE PASSWORD SCREEN */}
        {mustChangePassword ? (
          <div className="p-6 overflow-y-auto">
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50 mb-6 flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-sm">
                  {lang === 'ar' ? 'تغيير كلمة المرور إلزامي عند أول تسجيل دخول' : 'Changement de mot passe obligatoire'}
                </h5>
                <p className="text-xs mt-1 leading-relaxed">
                  {lang === 'ar' 
                    ? 'لحماية أمن الإدارة والمواطنين، يتعين عليك اختيار كلمة مرور سرية جديدة ومختلفة للوصول للنظام.' 
                    : 'Pour garantir la sécurité du système, vous devez modifier votre mot de passe de premier accès.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleForcePasswordChange} className="flex flex-col gap-4 text-xs">
              {errorMsg && <div className="p-3 bg-red-50 text-red-700 font-semibold rounded-lg">{errorMsg}</div>}
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                  {lang === 'ar' ? 'كلمة المرور الجديدة' : 'Nouveau Mot de Passe'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {lang === 'ar' ? 'حفظ كلمة المرور والدخول' : 'Mettre à jour et accéder'}
              </button>
            </form>
          </div>
        ) : (
          /* STANDARD FORM */
          <div className="p-6 overflow-y-auto flex-1">
            
            {/* Tab Swappers */}
            <div className="flex border-b dark:border-slate-700 mb-6 text-xs">
              {[
                { id: 'citizen', label: lang === 'ar' ? 'بوابة المواطن' : 'Portail Citoyen' },
                { id: 'employee', label: lang === 'ar' ? 'فضاء الموظفين' : 'Fonctionnaires' },
                { id: 'admin', label: lang === 'ar' ? 'الإدارة العامة' : 'Administration' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setErrorMsg('');
                    setSuccessMsg('');
                    setIsRegister(false);
                  }}
                  className={`flex-1 pb-3 text-center font-bold tracking-wider ${
                    activeTab === tab.id
                      ? 'text-blue-700 border-b-2 border-blue-600 dark:text-blue-400 font-extrabold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {(errorMsg || sessionErrorMsg) && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs mb-4 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg || sessionErrorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-xs mb-4">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
              
              {/* Register Switcher (Citizen Only) */}
              {activeTab === 'citizen' && (
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isRegister 
                      ? (lang === 'ar' ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Déjà inscrit ? Connectez-vous')
                      : (lang === 'ar' ? 'ليس لديك حساب؟ سجل الآن مجاناً' : 'Pas de compte ? Inscrivez-vous gratuitement')}
                  </button>
                </div>
              )}

              {/* CITIZEN REGISTER FIELDSET */}
              {activeTab === 'citizen' && isRegister ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Nom complet</label>
                      <input
                        type="text"
                        required
                        value={fields.name}
                        onChange={(e) => setFields({ ...fields, name: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">N° CIN</label>
                      <input
                        type="text"
                        required
                        placeholder="JC123456"
                        value={fields.cin}
                        onChange={(e) => setFields({ ...fields, cin: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Date de naissance</label>
                      <input
                        type="date"
                        required
                        value={fields.dateOfBirth}
                        onChange={(e) => setFields({ ...fields, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Lieu de naissance</label>
                      <input
                        type="text"
                        required
                        value={fields.placeOfBirth}
                        onChange={(e) => setFields({ ...fields, placeOfBirth: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">N° Acte Naissance</label>
                      <input
                        type="text"
                        required
                        placeholder="234/78"
                        value={fields.birthRegNum}
                        onChange={(e) => setFields({ ...fields, birthRegNum: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Année d'enregistrement</label>
                      <input
                        type="text"
                        required
                        placeholder="1978"
                        value={fields.birthRegYear}
                        onChange={(e) => setFields({ ...fields, birthRegYear: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Commune d'enregistrement</label>
                      <input
                        type="text"
                        required
                        value={fields.birthRegOffice}
                        onChange={(e) => setFields({ ...fields, birthRegOffice: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Adresse email</label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={fields.email}
                        onChange={(e) => setFields({ ...fields, email: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">N° Téléphone</label>
                      <input
                        type="text"
                        required
                        value={fields.phone}
                        onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                        className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Adresse de résidence actuelle</label>
                    <input
                      type="text"
                      required
                      value={fields.address}
                      onChange={(e) => setFields({ ...fields, address: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Choisir Mot de Passe</label>
                    <input
                      type="password"
                      required
                      value={fields.password}
                      onChange={(e) => setFields({ ...fields, password: e.target.value })}
                      className="w-full px-4 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl"
                    />
                  </div>
                </div>
              ) : (
                /* LOGIN CHANNELS */
                <div className="flex flex-col gap-4">
                  {/* Username / Email */}
                  {activeTab === 'citizen' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Adresse Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={fields.email}
                          onChange={(e) => setFields({ ...fields, email: e.target.value })}
                          className={`w-full ${isRTL ? 'pr-4 pl-10' : 'pl-10 pr-4'} py-2.5 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Nom d'utilisateur (Username)</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={fields.username}
                          onChange={(e) => setFields({ ...fields, username: e.target.value })}
                          className={`w-full ${isRTL ? 'pr-4 pl-10' : 'pl-10 pr-4'} py-2.5 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Mot de Passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={fields.password}
                        onChange={(e) => setFields({ ...fields, password: e.target.value })}
                        className={`w-full ${isRTL ? 'pr-4 pl-10' : 'pl-10 pr-4'} py-2.5 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl`}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all"
              >
                {isRegister 
                  ? (lang === 'ar' ? 'تأكيد إنشاء الحساب' : 'Confirmer l\'inscription')
                  : (lang === 'ar' ? 'تسجيل الدخول الآمن' : 'Connexion sécurisée')}
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
