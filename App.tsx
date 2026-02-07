
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  SignedIn, SignedOut, SignIn, UserButton, useUser 
} from './components/MockAuth';
import { 
  Camera, Calendar, CreditCard, Archive, 
  Smartphone, MessageCircle, Gavel, Sparkles, 
  CheckCircle2, AlertTriangle, Plus, Search,
  ChevronLeft, ChevronRight, X, Send, UserCheck, 
  LayoutDashboard, BellRing, FileText, Download, TrendingUp,
  UserPlus, Users, Trash2, Edit2, Save, Info, StickyNote, Activity,
  History
} from 'lucide-react';
import { Patient, Appointment, Debt, RecoveryLevel, ScanResult } from './types';
import { 
  extractAppointmentsFromImage, 
  generateRecoveryScript, 
  generateDailyReminders,
  generateAccountingReport
} from './services/geminiService';

const App: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'scan' | 'planning' | 'recovery' | 'archives' | 'patients'>('planning');
  
  // Database local state
  const [patients, setPatients] = useState<Patient[]>([
    { id: '1', userId: 'mock', name: 'Jean Dupont', phone: '0612345678', email: 'jean@dupont.fr', isArchived: false, totalSessions: 12, notes: "Besoin de séances douces.", firstAppointmentDate: '2023-10-12' },
    { id: '2', userId: 'mock', name: 'Marie Curie', phone: '0687654321', email: 'marie@curie.fr', isArchived: false, totalSessions: 5, notes: "Suivi post-opératoire.", firstAppointmentDate: '2024-01-05' }
  ]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  
  // UI State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [recoveryScript, setRecoveryScript] = useState<{id: string, text: string} | null>(null);
  const [bulkReminders, setBulkReminders] = useState<any[]>([]);
  const [accountingReport, setAccountingReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Patient Management State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchPatient, setSearchPatient] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Logic: Unpaid balance
  const unpaidBalance = useMemo(() => 
    debts.filter(d => !d.isClosed).reduce((acc, d) => acc + d.amount, 0), 
  [debts]);

  // Logic: Monthly Turnover
  const monthlyTurnover = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); 
    return appointments
      .filter(a => a.status === 'paid' && a.day.startsWith(currentMonth))
      .reduce((acc, a) => acc + (a.amount || 0), 0);
  }, [appointments]);

  const handleDateChange = (offset: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + offset);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  // --- Session Counter Logic ---
  const incrementPatientSessions = (patientName: string) => {
    setPatients(prev => prev.map(p => 
      p.name.toLowerCase() === patientName.toLowerCase() 
        ? { ...p, totalSessions: p.totalSessions + 1 } 
        : p
    ));
  };

  // --- Patient CRUD ---
  const handleSavePatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const patientData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      notes: formData.get('notes') as string,
      firstAppointmentDate: formData.get('firstAppointmentDate') as string,
      totalSessions: parseInt(formData.get('totalSessions') as string) || 0
    };

    if (editingPatient) {
      setPatients(prev => prev.map(p => p.id === editingPatient.id ? { ...p, ...patientData } : p));
    } else {
      const newPatient: Patient = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user!.id,
        ...patientData,
        isArchived: false
      };
      setPatients(prev => [...prev, newPatient]);
    }
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  const deletePatient = (id: string) => {
    if (window.confirm("Supprimer définitivement ce patient ?")) {
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  };

  // --- Reminders ---
  const loadDailyReminders = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const tomApps = appointments.filter(a => a.day === tomorrowStr);
    
    if (tomApps.length === 0) return alert("Aucun RDV demain.");
    
    const reminders = await generateDailyReminders(tomApps);
    const enrichedReminders = reminders.map(r => {
      const p = patients.find(p => p.name.toLowerCase() === r.patientName.toLowerCase());
      return { ...r, phone: p?.phone || r.phone };
    });
    setBulkReminders(enrichedReminders);
  };

  const updateBulkReminderMessage = (index: number, newMessage: string) => {
    const updated = [...bulkReminders];
    updated[index].message = newMessage;
    setBulkReminders(updated);
  };

  const applyTemplateToAll = (template: string) => {
    const updated = bulkReminders.map(r => ({
      ...r,
      message: template.replace('{nom}', r.patientName)
    }));
    setBulkReminders(updated);
  };

  // --- Payment & Debt ---
  const handleSetPayment = (appId: string, status: 'paid' | 'unpaid') => {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status } : a));

    if (status === 'unpaid') {
      const patient = patients.find(p => p.id === app.patientId) || { id: 'new', name: app.patientName, phone: '0600000000' };
      const newDebt: Debt = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user!.id,
        appointmentId: appId,
        patientId: patient.id,
        patientName: app.patientName,
        amount: app.amount || 50,
        level: RecoveryLevel.LEVEL_1,
        createdAt: new Date().toISOString(),
        isClosed: false
      };
      setDebts(prev => [newDebt, ...prev]);
    } else {
      setDebts(prev => prev.map(d => d.appointmentId === appId ? { ...d, isClosed: true } : d));
    }
    setSelectedApp(null);
  };

  // Camera Logic
  const startScan = async () => {
    setIsScanning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const capture = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg');
    
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(t => t.stop());
    setIsScanning(false);
    
    const results = await extractAppointmentsFromImage(base64);
    setScanResults(results);
  };

  const NavItem = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center gap-1 px-4 py-2 transition-all border-b-2 ${activeTab === id ? 'text-[#0053b3] border-[#0053b3]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchPatient.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-900">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#0053b3] rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
                <LayoutDashboard className="text-white w-10 h-10" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">RecouvreLib</h1>
              <SignIn />
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0053b3] rounded-xl flex items-center justify-center shadow-md">
                <Calendar className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cabinet Dr. {user?.firstName}</h1>
                <p className="text-slate-500 text-sm font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-500" /> Praticien certifié</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="bg-white px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Honoraires Mensuels</div>
                    <div className="text-xl font-black text-emerald-600 leading-none">{monthlyTurnover.toFixed(2)}€</div>
                  </div>
               </div>
               <div className="bg-white px-5 py-3 rounded-2xl border border-red-100 shadow-sm flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Impayés</div>
                    <div className="text-xl font-black text-red-600 leading-none">{unpaidBalance.toFixed(2)}€</div>
                  </div>
               </div>
               <UserButton />
            </div>
          </header>

          <main>
            {/* TAB: PLANNING */}
            {activeTab === 'planning' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft /></button>
                    <span className="font-bold text-slate-800 min-w-[150px] text-center">{new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight /></button>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={loadDailyReminders} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-100 border border-indigo-100">
                        <BellRing className="w-4 h-4" /> Rappels du lendemain
                     </button>
                     <button onClick={() => setActiveTab('scan')} className="flex items-center gap-2 bg-[#0053b3] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#00428e] shadow-md">
                        <Camera className="w-4 h-4" /> Scanner Journée
                     </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {appointments.filter(a => a.day === selectedDate).length === 0 ? (
                    <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center text-slate-400">
                       <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                       <p className="font-medium">Aucun rendez-vous. Ajoutez-en un ou scannez votre agenda.</p>
                       <button onClick={() => {
                         const p = patients[0];
                         const pName = p?.name || 'Nouveau Patient';
                         incrementPatientSessions(pName);
                         setAppointments([...appointments, {
                           id: Math.random().toString(36).substr(2, 9), userId: user!.id, patientId: p?.id, patientName: pName, day: selectedDate, time: '10:00', status: 'pending', amount: 60
                         }])
                       }} className="mt-4 text-[#0053b3] font-bold text-sm">Ajouter un RDV Patient connu (+1 séance)</button>
                    </div>
                  ) : (
                    appointments.filter(a => a.day === selectedDate).map(app => {
                      const patient = patients.find(p => p.name === app.patientName);
                      return (
                        <div key={app.id} onClick={() => setSelectedApp(app)} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="text-slate-400 font-black text-sm w-12">{app.time}</div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {app.patientName}
                                {patient && (
                                  <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Séance n°{patient.totalSessions}</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-semibold uppercase">{app.amount}€</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             {app.status === 'paid' ? <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100">RÉGLÉ</span> :
                              app.status === 'unpaid' ? <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black">IMPAYÉ</span> :
                              <span className="text-slate-300 font-bold text-xs">EN ATTENTE</span>}
                             <ChevronRight className="text-slate-300 w-5 h-5" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB: PATIENTS */}
            {activeTab === 'patients' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-black text-slate-900">Base Patients</h2>
                   <button onClick={() => { setEditingPatient(null); setIsPatientModalOpen(true); }} className="bg-[#0053b3] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100">
                      <UserPlus className="w-5 h-5" /> Nouveau Patient
                   </button>
                </div>

                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                   <input 
                     type="text" 
                     placeholder="Rechercher par nom..." 
                     className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm outline-none focus:ring-2 ring-blue-500/10"
                     value={searchPatient}
                     onChange={(e) => setSearchPatient(e.target.value)}
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPatients.map(p => (
                    <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col group overflow-hidden">
                       <div className="p-6 flex items-start justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-[#0053b3]/5 rounded-2xl flex items-center justify-center font-black text-[#0053b3] border border-[#0053b3]/10 uppercase text-xl">{p.name.charAt(0)}</div>
                             <div>
                                <h3 className="font-black text-slate-900 text-lg leading-tight">{p.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1">
                                     <Activity className="w-3 h-3" /> {p.totalSessions} séances
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Depuis le {p.firstAppointmentDate ? new Date(p.firstAppointmentDate).toLocaleDateString() : 'N/C'}</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex gap-1">
                             <button onClick={() => { setEditingPatient(p); setIsPatientModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => deletePatient(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       </div>
                       
                       <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                             <Smartphone className="w-3.5 h-3.5" /> {p.phone}
                          </div>
                          {p.notes && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 flex gap-2 items-start">
                               <StickyNote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                               <p className="text-[11px] text-slate-600 leading-normal italic line-clamp-2">{p.notes}</p>
                            </div>
                          )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SCAN */}
            {activeTab === 'scan' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-slate-900">Importer Planning</h2>
                    <p className="text-slate-500 font-medium">Capturez votre agenda papier pour alimenter le planning</p>
                 </div>

                 {!isScanning && scanResults.length === 0 && (
                   <div onClick={startScan} className="bg-white p-12 rounded-[3rem] border-4 border-dashed border-slate-200 text-center cursor-pointer hover:border-blue-400 transition-all group">
                      <Camera className="w-20 h-20 mx-auto text-slate-200 mb-6 group-hover:scale-110 transition-transform" />
                      <p className="text-lg font-bold text-slate-400">Cliquez pour scanner une page</p>
                   </div>
                 )}

                 {isScanning && (
                   <div className="relative aspect-[3/4] bg-black rounded-[3rem] overflow-hidden shadow-2xl max-w-sm mx-auto">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-4 border-white/20 pointer-events-none rounded-[3rem]">
                         <div className="absolute top-1/2 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_blue] animate-bounce"></div>
                      </div>
                      <button onClick={capture} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-900/50 shadow-2xl active:scale-95 transition-all"></button>
                   </div>
                 )}

                 {scanResults.length > 0 && (
                   <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 max-w-2xl mx-auto">
                      <h3 className="text-xl font-black text-slate-900">Analyse du planning</h3>
                      <div className="space-y-2">
                         {scanResults.map((res, idx) => (
                           <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                              <div>
                                 <div className="font-bold text-slate-900">{res.patientName}</div>
                                 <div className="text-xs text-slate-500">{res.day} à {res.time}</div>
                              </div>
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Nouveau RDV</span>
                           </div>
                         ))}
                      </div>
                      <div className="flex gap-4">
                         <button onClick={() => setScanResults([])} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Annuler</button>
                         <button onClick={() => {
                            scanResults.forEach(r => incrementPatientSessions(r.patientName));
                            const newApps = scanResults.map(r => ({
                              id: Math.random().toString(36).substr(2, 9),
                              userId: user!.id,
                              patientName: r.patientName,
                              day: r.day,
                              time: r.time,
                              status: 'pending' as const,
                              amount: r.amount || 55
                            }));
                            setAppointments(prev => [...prev, ...newApps]);
                            setScanResults([]);
                            setActiveTab('planning');
                         }} className="flex-1 py-4 bg-[#0053b3] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all">Tout importer (+ séances)</button>
                      </div>
                   </div>
                 )}
              </div>
            )}

            {/* TAB: RECOVERY */}
            {activeTab === 'recovery' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-2xl font-black text-slate-900">Recouvrement IA</h2>
                <div className="grid gap-4">
                  {debts.filter(d => !d.isClosed).map(debt => (
                    <div key={debt.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black">{debt.patientName.charAt(0)}</div>
                          <div>
                             <h3 className="font-bold">{debt.patientName}</h3>
                             <p className="text-xs text-slate-400">Impayé de {debt.amount}€ depuis le {new Date(debt.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => setDebts(prev => prev.map(d => d.id === debt.id ? {...d, isClosed: true} : d))} className="text-xs font-bold text-emerald-600 hover:underline">Marquer Réglé</button>
                      </div>
                      <div className="px-6 pb-6 pt-2 grid grid-cols-4 gap-2">
                         {Object.values(RecoveryLevel).map(lvl => (
                           <button key={lvl} onClick={() => {
                             generateRecoveryScript(debt.patientName, debt.amount, lvl).then(t => setRecoveryScript({id: debt.id, text: t}));
                             setDebts(prev => prev.map(d => d.id === debt.id ? {...d, level: lvl} : d));
                           }} className={`px-2 py-2 rounded-xl text-[9px] font-bold uppercase border transition-all ${debt.level === lvl ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>
                              {lvl}
                           </button>
                         ))}
                      </div>
                      {recoveryScript?.id === debt.id && (
                        <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                           <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-sm italic mb-4">"{recoveryScript.text}"</div>
                           <div className="flex gap-2">
                              <a href={`sms:${patients.find(p=>p.name===debt.patientName)?.phone || ''}?body=${encodeURIComponent(recoveryScript.text)}`} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs flex justify-center gap-2 items-center"><Smartphone className="w-4 h-4" /> Envoyer SMS</a>
                              <button onClick={() => setRecoveryScript(null)} className="p-3 bg-slate-100 rounded-2xl"><X className="w-4 h-4" /></button>
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'archives' && <div className="text-center py-20 text-slate-400">Section Archives: Liste des dossiers clôturés.</div>}

          </main>

          {/* Footer Tabs Navigation */}
          <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl border border-white/50 flex items-center gap-2 z-50">
            <NavItem id="planning" icon={Calendar} label="Planning" />
            <NavItem id="patients" icon={Users} label="Patients" />
            <NavItem id="recovery" icon={CreditCard} label="Impayés" />
            <NavItem id="scan" icon={Camera} label="Scan" />
          </nav>

          {/* MODAL: Edit/Add Patient */}
          {isPatientModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[90vh]">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black">{editingPatient ? 'Fiche Patient' : 'Nouveau Patient'}</h3>
                    <button onClick={() => { setIsPatientModalOpen(false); setEditingPatient(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
                 </div>
                 <form onSubmit={handleSavePatient} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nom Complet</label>
                        <input name="name" defaultValue={editingPatient?.name} required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 ring-blue-500/20" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Téléphone</label>
                        <input name="phone" defaultValue={editingPatient?.phone} required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 ring-blue-500/20" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date 1er Rendez-vous</label>
                        <input name="firstAppointmentDate" type="date" defaultValue={editingPatient?.firstAppointmentDate} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 ring-blue-500/20" />
                      </div>
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          Nombre total de séances <History className="w-3 h-3 text-indigo-500" />
                        </label>
                        <input name="totalSessions" type="number" defaultValue={editingPatient?.totalSessions || 0} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-inner outline-none focus:ring-2 ring-indigo-500/20 font-bold text-indigo-600" />
                        <p className="text-[9px] text-slate-400 mt-1">S'incrémente automatiquement à chaque nouvel ajout au planning.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">E-mail</label>
                      <input name="email" type="email" defaultValue={editingPatient?.email} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 ring-blue-500/20" />
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes & Historique</label>
                       <textarea 
                        name="notes" 
                        defaultValue={editingPatient?.notes} 
                        rows={4}
                        placeholder="Particularités, antécédents, préférences..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 ring-blue-500/20 resize-none"
                       ></textarea>
                    </div>

                    <button type="submit" className="w-full bg-[#0053b3] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 mt-4">
                       <Save className="w-5 h-5" /> Enregistrer la fiche patient
                    </button>
                 </form>
              </div>
            </div>
          )}

          {/* MODAL: Bulk Reminders */}
          {bulkReminders.length > 0 && (
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-black flex items-center gap-2"><BellRing className="w-6 h-6 text-indigo-500" /> Rappels du lendemain</h3>
                      <button onClick={() => setBulkReminders([])}><X /></button>
                   </div>
                   
                   <div className="mb-6">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Appliquer un modèle à tous :</label>
                      <div className="flex flex-wrap gap-2">
                         <button onClick={() => applyTemplateToAll("Bonjour {nom}, n'oubliez pas votre RDV de demain. À demain !")} className="text-[10px] px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold border border-indigo-100">Simple</button>
                         <button onClick={() => applyTemplateToAll("Bonjour {nom}, rappel de RDV demain. Merci de venir 5 min avant. Dr. " + user?.firstName)} className="text-[10px] px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold border border-indigo-100">Ponctualité</button>
                      </div>
                   </div>

                   <div className="overflow-y-auto space-y-4 flex-1 mb-6 pr-2">
                      {bulkReminders.map((rem, i) => (
                        <div key={i} className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                           <div className="flex justify-between items-center mb-3">
                              <div className="font-bold text-slate-900">{rem.patientName}</div>
                              <div className="text-[10px] text-slate-400 font-bold">{rem.phone || 'Sans numéro'}</div>
                           </div>
                           <textarea 
                              className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 outline-none focus:ring-2 ring-indigo-500/20 resize-none h-24"
                              value={rem.message}
                              onChange={(e) => updateBulkReminderMessage(i, e.target.value)}
                           />
                           <div className="flex justify-end mt-2">
                              <a href={`sms:${rem.phone}?body=${encodeURIComponent(rem.message)}`} className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline">
                                 <Send className="w-3 h-3" /> Envoyer ce SMS
                              </a>
                           </div>
                        </div>
                      ))}
                   </div>
                   
                   <button onClick={() => setBulkReminders([])} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">Clôturer la session de rappels</button>
                </div>
             </div>
          )}

          {/* MODAL: Appointment Detail / Action */}
          {selectedApp && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-4">
               <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-8 shadow-2xl animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-2xl font-black text-slate-900">{selectedApp.patientName}</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase">{selectedApp.day} à {selectedApp.time}</p>
                     </div>
                     <button onClick={() => setSelectedApp(null)} className="p-2 bg-slate-50 rounded-full"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid gap-3">
                     <button onClick={() => handleSetPayment(selectedApp.id, 'paid')} className="w-full bg-[#0053b3] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3"><UserCheck className="w-5 h-5" /> Honoraires RÉGLÉS</button>
                     <button onClick={() => handleSetPayment(selectedApp.id, 'unpaid')} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold border border-red-100 flex items-center justify-center gap-3"><AlertTriangle className="w-5 h-5" /> Noter IMPAYÉ</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </SignedIn>
    </div>
  );
};

export default App;
