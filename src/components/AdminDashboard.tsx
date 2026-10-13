import React, { useState, useEffect } from 'react';
import { translations } from '../types.ts';
import { 
  Users, Shield, ShieldCheck, Database, Sliders, AlertCircle, RefreshCw, Key,
  FileText, CheckCircle, PlusCircle, Trash, Edit2, Play, Power, HelpCircle
} from 'lucide-react';

interface EmployeeModel {
  id: number;
  name: string;
  username: string;
  role: string;
  forcePasswordChange: boolean;
  createdAt: string;
}

interface AuditLogModel {
  id: number;
  userId?: number;
  userType: string;
  action: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

interface AdminDashboardProps {
  lang: 'ar' | 'fr';
  token: string;
  user: any;
}

export default function AdminDashboard({ lang, token, user }: AdminDashboardProps) {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'audit' | 'backup' | 'settings'>('employees');
  const [employeesList, setEmployeesList] = useState<EmployeeModel[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLogModel[]>([]);
  const [backupsList, setBackupsList] = useState<any[]>([]);

  // Employee creation/edit modal
  const [employeeForm, setEmployeeForm] = useState({
    id: null as number | null,
    name: '',
    username: '',
    password: '',
    role: 'employee',
  });
  const [empSuccess, setEmpSuccess] = useState('');
  const [empError, setEmpError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Settings
  const [settings, setSettings] = useState({
    systemNameAr: 'بوابة الحالة المدنية لأولاد تايمة',
    systemNameFr: "Portail d'État Civil d'Ouled Teima",
    allowCitizenRegistration: true,
    maxUploadSizeMb: 5,
    emailNotificationsEnabled: true,
  });
  const [setSuccess, setSetSuccess] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadAuditLogs();
    loadBackups();
    loadSettings();
  }, [token, activeSubTab]);

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeesList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/admin/backups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackupsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // prefill
          const match = data[0];
          setSettings({
            systemNameAr: match.systemNameAr || 'بوابة الحالة المدنية لأولاد تايمة',
            systemNameFr: match.systemNameFr || "Portail d'État Civil d'Ouled Teima",
            allowCitizenRegistration: match.allowCitizenRegistration ?? true,
            maxUploadSizeMb: match.maxUploadSizeMb || 5,
            emailNotificationsEnabled: match.emailNotificationsEnabled ?? true,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError('');
    setEmpSuccess('');

    try {
      let url = '/api/admin/employees';
      let method = 'POST';

      if (isEditing && employeeForm.id) {
        url = `/api/admin/employees/${employeeForm.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(employeeForm)
      });

      const data = await res.json();
      if (res.ok) {
        setEmpSuccess(isEditing ? 'Employee updated successfully' : 'Employee created successfully');
        setEmployeeForm({ id: null, name: '', username: '', password: '', role: 'employee' });
        setIsEditing(false);
        loadEmployees();
        loadAuditLogs();
      } else {
        setEmpError(data.error || 'Operation failed');
      }
    } catch (err: any) {
      setEmpError(err.message);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      const res = await fetch(`/api/admin/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadEmployees();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const res = await fetch('/api/admin/backups/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadBackups();
        loadAuditLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestoreBackup = async (backupId: number) => {
    if (!confirm('Restoring will rollback database state to this backup. Proceed?')) return;
    try {
      const res = await fetch(`/api/admin/backups/${backupId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Database restored successfully!');
        loadAuditLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSetSuccess(true);
        setTimeout(() => setSetSuccess(false), 3000);
        loadSettings();
        loadAuditLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16 py-10">
      
      {/* Title */}
      <div className="flex items-center gap-3 mb-8 pb-5 border-b dark:border-slate-800">
        <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
        <div>
          <h1 className="text-xl font-sans font-bold text-slate-800 dark:text-white">
            {lang === 'ar' ? 'لوحة تحكم الإدارة العليا (Super Admin)' : 'Super Administration System'}
          </h1>
          <p className="text-xs text-slate-400">{lang === 'ar' ? 'مراقبة النظام، إدارة الموظفين، النسخ الاحتياطي والإعدادات الأمنية.' : 'Contrôle système, création de comptes, journal d\'audit et sauvegardes.'}</p>
        </div>
      </div>

      <div className="md:grid md:grid-cols-12 md:gap-8">
        
        {/* Navigation */}
        <div className="md:col-span-3 mb-8 md:mb-0">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 flex flex-col gap-2">
            {[
              { id: 'employees', label: lang === 'ar' ? 'إدارة حسابات الموظفين' : 'Fonctionnaires', icon: Users },
              { id: 'audit', label: lang === 'ar' ? 'سجلات مراقبة النظام (Audit)' : 'Journal d\'Audit', icon: FileText },
              { id: 'backup', label: lang === 'ar' ? 'النسخ الاحتياطي والاسترجاع' : 'Sauvegardes DB', icon: Database },
              { id: 'settings', label: lang === 'ar' ? 'إعدادات البوابة العامة' : 'Configuration', icon: Sliders },
            ].map((sub) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTab(sub.id as any)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeSubTab === sub.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <SubIcon className="h-4 w-4" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Display */}
        <div className="md:col-span-9">
          
          {/* Subtab: Employees accounts manager */}
          {activeSubTab === 'employees' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-lg font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'تدبير وتفويض حسابات الموظفين' : 'Comptes Agents de l\'État Civil'}
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* Employee Form (Create / Edit) */}
                <div className="lg:col-span-2 border dark:border-slate-700 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                  <h3 className="font-sans font-bold text-xs text-slate-800 dark:text-white mb-4 uppercase">
                    {isEditing ? (lang === 'ar' ? 'تعديل بيانات الحساب' : 'Modifier le compte') : (lang === 'ar' ? 'إضافة حساب موظف جديد' : 'Créer un nouveau compte')}
                  </h3>

                  <form onSubmit={handleSaveEmployee} className="flex flex-col gap-4 text-xs">
                    {empSuccess && <div className="p-2.5 bg-green-50 text-green-700 rounded-lg font-semibold">{empSuccess}</div>}
                    {empError && <div className="p-2.5 bg-red-50 text-red-700 rounded-lg font-semibold">{empError}</div>}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                        {lang === 'ar' ? 'الاسم الكامل للموظف' : 'Nom Complet'}
                      </label>
                      <input
                        type="text"
                        required
                        value={employeeForm.name}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                        {lang === 'ar' ? 'اسم المستخدم الفريد (Username)' : 'Identifiant unique (Username)'}
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isEditing}
                        value={employeeForm.username}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value.toLowerCase() })}
                        className="w-full px-3 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                        {lang === 'ar' ? `كلمة المرور ${isEditing ? '(اختياري لإعادة التعيين)' : ''}` : `Mot de Passe ${isEditing ? '(Optionnel pour Reset)' : ''}`}
                      </label>
                      <input
                        type="password"
                        required={!isEditing}
                        value={employeeForm.password}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                        {lang === 'ar' ? 'الدور والصفة' : 'Rôle / Permissions'}
                      </label>
                      <select
                        value={employeeForm.role}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg"
                      >
                        <option value="employee">{lang === 'ar' ? 'ضابط الحالة المدنية' : 'Agent de l\'État Civil'}</option>
                        <option value="admin">{lang === 'ar' ? 'مدير النظام الفيدرالي' : 'Super Administrateur'}</option>
                      </select>
                    </div>

                    <div className="flex gap-2.5 mt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold"
                      >
                        {lang === 'ar' ? 'حفظ البيانات' : 'Sauvegarder'}
                      </button>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setEmployeeForm({ id: null, name: '', username: '', password: '', role: 'employee' });
                          }}
                          className="px-3 py-2 border rounded-lg"
                        >
                          {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Employees List */}
                <div className="lg:col-span-3 text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold">
                        <th className="p-3 text-start">{lang === 'ar' ? 'الاسم' : 'Nom'}</th>
                        <th className="p-3 text-start">{lang === 'ar' ? 'اسم المستخدم' : 'Identifiant'}</th>
                        <th className="p-3 text-start">{lang === 'ar' ? 'الصفة / الدور' : 'Rôle'}</th>
                        <th className="p-3 text-start">{lang === 'ar' ? 'حالة الحساب' : 'Statut'}</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeesList.map((emp) => (
                        <tr key={emp.id} className="border-b dark:border-slate-700 hover:bg-slate-50/20">
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{emp.name}</td>
                          <td className="p-3 font-mono text-blue-700 dark:text-blue-400">{emp.username}</td>
                          <td className="p-3 capitalize text-slate-500">
                            {emp.role === 'admin' ? (lang === 'ar' ? 'مدير نظام' : 'Super Admin') : (lang === 'ar' ? 'موظف جماعي' : 'Agent')}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              emp.forcePasswordChange ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {emp.forcePasswordChange 
                                ? (lang === 'ar' ? 'تغيير كلمة المرور مطلوب' : 'Changement MDP Requis') 
                                : (lang === 'ar' ? 'مفعل ونشط' : 'Actif / Confirmé')}
                            </span>
                          </td>
                          <td className="p-3 flex gap-1.5 justify-end">
                            <button
                              onClick={() => {
                                setIsEditing(true);
                                setEmployeeForm({
                                  id: emp.id,
                                  name: emp.name,
                                  username: emp.username,
                                  password: '',
                                  role: emp.role,
                                });
                              }}
                              className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                              title={lang === 'ar' ? 'تعديل' : 'Modifier'}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                              disabled={emp.username === 'admin'}
                              title={lang === 'ar' ? 'حذف' : 'Supprimer'}
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* Subtab: Audit Logs */}
          {activeSubTab === 'audit' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-lg font-sans font-bold text-slate-800 dark:text-white mb-4">
                {lang === 'ar' ? 'سجل تتبع ومراقبة العمليات (Audit Logs)' : 'Journal d\'Audit et Traçabilité'}
              </h2>
              <p className="text-xs text-slate-400 mb-6">{lang === 'ar' ? 'سجل آمن غير قابل للتعديل يتتبع جميع الولوجيات وتحديثات الحالة والتحميلات.' : 'Journal d\'audit inaltérable traçant les connexions, modifications de dossiers et actions système.'}</p>

              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold">
                      <th className="p-3 text-start">Timestamp</th>
                      <th className="p-3 text-start">User Type</th>
                      <th className="p-3 text-start">Action</th>
                      <th className="p-3 text-start">Details</th>
                      <th className="p-3 text-start">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogsList.map((log) => (
                      <tr key={log.id} className="border-b dark:border-slate-700 hover:bg-slate-50/20">
                        <td className="p-3 text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 capitalize font-bold text-slate-700 dark:text-slate-300">{log.userType}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">{log.action}</span></td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{log.details}</td>
                        <td className="p-3 font-mono text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab: Backup / Restore DB */}
          {activeSubTab === 'backup' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-lg font-sans font-bold text-slate-800 dark:text-white mb-4">
                {lang === 'ar' ? 'النسخ الاحتياطي لقاعدة البيانات والاسترجاع' : 'Sauvegardes et Restauration SQL'}
              </h2>
              <p className="text-xs text-slate-400 mb-6">{lang === 'ar' ? 'قم بإنشاء لقطة لجميع سجلات الحالة المدنية والطلبات لاسترجاعها في أي وقت.' : 'Générez des instantanés complets de la base de données SQL pour sécuriser les données de la commune.'}</p>

              <button
                onClick={handleTriggerBackup}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs mb-8"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{lang === 'ar' ? 'إنشاء نسخة احتياطية الآن (Backup)' : 'Générer une sauvegarde SQL'}</span>
              </button>

              <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white mb-4 uppercase">
                {lang === 'ar' ? 'النسخ الاحتياطية المتوفرة' : 'Historique des sauvegardes'}
              </h3>

              {backupsList.length === 0 ? (
                <p className="text-xs text-slate-400">{lang === 'ar' ? 'لا تتوفر أي نسخ احتياطية حالياً.' : 'Aucun point de restauration disponible.'}</p>
              ) : (
                <div className="flex flex-col gap-3.5 text-xs">
                  {backupsList.map((bk) => (
                    <div key={bk.id} className="p-4 border dark:border-slate-700 rounded-xl flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <strong className="block text-slate-800 dark:text-white font-mono">{bk.filename}</strong>
                        <span className="text-[10px] text-slate-400 block mt-1">Date: {new Date(bk.createdAt).toLocaleString()} | Size: {bk.size || '320 KB'}</span>
                      </div>
                      <button
                        onClick={() => handleRestoreBackup(bk.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-bold uppercase"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Restore</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subtab: Portal parameters settings */}
          {activeSubTab === 'settings' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700">
              <h2 className="text-lg font-sans font-bold text-slate-800 dark:text-white mb-6">
                {lang === 'ar' ? 'إعدادات المنصة والمكاتب الإدارية' : 'Configuration globale du Portail'}
              </h2>

              <form onSubmit={handleSaveSettings} className="flex flex-col gap-6 text-xs">
                {setSuccess && <div className="p-2.5 bg-green-50 text-green-700 rounded-lg font-semibold">{t.successSaved}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">اسم البوابة (بالعربية)</label>
                    <input
                      type="text"
                      required
                      value={settings.systemNameAr}
                      onChange={(e) => setSettings({ ...settings, systemNameAr: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Nom du Portail (Français)</label>
                    <input
                      type="text"
                      required
                      value={settings.systemNameFr}
                      onChange={(e) => setSettings({ ...settings, systemNameFr: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2">Inscription des citoyens</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allowReg"
                        checked={settings.allowCitizenRegistration}
                        onChange={(e) => setSettings({ ...settings, allowCitizenRegistration: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="allowReg" className="font-semibold text-slate-700 dark:text-slate-300">Allow Registration</label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Taille Max Uploads (MB)</label>
                    <input
                      type="number"
                      required
                      value={settings.maxUploadSizeMb}
                      onChange={(e) => setSettings({ ...settings, maxUploadSizeMb: Number(e.target.value) })}
                      className="w-full px-3 py-2 border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2">Emails administratifs</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="emails"
                        checked={settings.emailNotificationsEnabled}
                        onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="emails" className="font-semibold text-slate-700 dark:text-slate-300">Notifications via Email</label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs self-start"
                >
                  {lang === 'ar' ? 'حفظ التغييرات' : 'Mettre à jour'}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
