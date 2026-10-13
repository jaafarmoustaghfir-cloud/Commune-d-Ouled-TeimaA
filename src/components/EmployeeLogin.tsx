import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.ts';

interface EmployeeLoginProps {
  lang: 'ar' | 'fr';
  onLoginSuccess: (token: string, user: any) => void;
}

export default function EmployeeLogin({ lang, onLoginSuccess }: EmployeeLoginProps) {
  const isRTL = lang === 'ar';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const emailToUse = username.includes('@') ? username.trim() : `${username.toLowerCase().trim()}@ouledteima.ma`;

    try {
      // Authentification exclusive via Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const token = await userCredential.user.getIdToken();
      const firebaseUser = {
        id: userCredential.user.uid,
        name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || username,
        email: userCredential.user.email,
        role: 'employee',
      };
      onLoginSuccess(token, firebaseUser);
    } catch (err: any) {
      console.error('Erreur Firebase Auth:', err?.code || err?.message);
      // Strict translation mandate:
      // Arabic: "اسم المستخدم أو كلمة المرور غير صحيحة."
      // French: "Nom d'utilisateur ou mot de passe incorrect."
      setErrorMsg(
        lang === 'ar' 
          ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' 
          : "Nom d'utilisateur ou mot de passe incorrect."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 px-4 flex justify-center items-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {/* Decorative Top Ribbon */}
        <div className="h-2 bg-gradient-to-r from-[#005BAC] via-emerald-500 to-[#198754]" />

        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center select-none">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl mb-4 text-[#005BAC] dark:text-blue-400">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
              {lang === 'ar' ? 'فضاء الموظفين المؤمن' : 'Espace Fonctionnaires Sécurisé'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              {lang === 'ar' 
                ? 'خاص بضباط وموظفي مصلحة الحالة المدنية لجماعة أولاد تايمة' 
                : 'Réservé aux agents de l\'état civil de la Commune d\'Ouled Teima'}
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs mb-6 flex gap-2.5 animate-pulse">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600 dark:text-red-400" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Username / Email */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                {lang === 'ar' ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email ou Nom d\'utilisateur'}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={lang === 'ar' ? 'manal أو fati' : 'Ex : manal ou fati'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-[#005BAC] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white rounded-xl outline-none transition-all font-semibold`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                {lang === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-[#005BAC] dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white rounded-xl outline-none transition-all font-mono`}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#005BAC] hover:bg-[#004b91] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 select-none text-sm"
            >
              <span>
                {loading 
                  ? (lang === 'ar' ? 'جاري التحقق...' : 'Vérification en cours...') 
                  : (lang === 'ar' ? 'تسجيل الدخول' : 'Se connecter')}
              </span>
              {!loading && (isRTL ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
            </button>
          </form>

          {/* Secure Badge */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 select-none">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>{lang === 'ar' ? 'اتصال مشفر وآمن عبر Firebase Auth' : 'Authentification Firebase chiffrée'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
