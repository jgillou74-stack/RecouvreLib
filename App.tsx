import React, { useState, useMemo, useRef } from 'react';
import { 
  SignedIn, SignedOut, SignIn, UserButton, useUser 
} from './components/MockAuth';
import { 
  Camera, Calendar, CreditCard, Smartphone, UserCheck, 
  LayoutDashboard, BellRing, TrendingUp, UserPlus, Users, 
  Trash2, Edit2, X, Activity, History, ChevronLeft, 
  ChevronRight, Search, StickyNote, CheckCircle2
} from 'lucide-react';
import { Patient, Appointment, Debt, RecoveryLevel, ScanResult } from './types';
import { 
  extractAppointmentsFromImage, 
  generateRecoveryScript, 
  generateDailyReminders 
} from './services/geminiService';

const App: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'scan' | 'planning' | 'recovery' | 'patients'>('planning');
  
  // --- État des Données ---
  const [patients, setPatients] = useState<Patient[]>([
    { id: '1', userId: 'mock', name: 'Jean Dupont', phone: '0612345678', email: 'jean@dupont.fr', isArchived: false, totalSessions: 12, notes: "Besoin de séances douces.", firstAppointmentDate: '2023-10-12' },
  ]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  
  // --- État UI ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [recoveryScript, setRecoveryScript] = useState<{id: string, text: string} | null>(null);
  const [bulkReminders, setBulkReminders] = useState<any[]>([]);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchPatient, setSearchPatient] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Logique Métier ---
  const unpaidBalance = useMemo(() => 
    debts.filter(d => !d.isClosed).reduce((acc, d) => acc + d.amount, 0), [debts]);

  const monthlyTurnover = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); 
    return appointments
      .filter(a => a.status === 'paid' && a.day.startsWith(currentMonth))
      .reduce((acc, a) => acc + (a.amount || 0), 0);
  }, [appointments]);

  // --- Gestion des Patients ---
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
        userId: user?.id || 'mock',
        ...patientData,
        isArchived: false
      };
      setPatients(prev => [...prev, newPatient]);
    }
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  // --- Fonctions IA ---
  const startScan = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Erreur caméra : Vérifiez les autorisations.");
      setIsScanning(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;
    setIsLoading(true);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg');
    
    // Arrêt caméra
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(t => t.stop());
    setIsScanning(false);

    try {
      const results = await extractAppointmentsFromImage(base64);
      setScanResults(results);
    } catch (err) {
      alert("L'IA n'a pas pu analyser l'image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReminders = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const tomApps = appointments.filter(a => a.day === tomorrowStr);
    
    if (tomApps.length === 0) return alert("Aucun RDV prévu pour demain.");

    setIsLoading(true);
    try {
      const reminders = await generateDailyReminders(tomApps);
      setBulkReminders(reminders);
    } catch (err) {
      alert("Erreur lors de la génération des rappels.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Navigation Item ---
  const NavItem = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center gap-1 px-4 py-2 transition-all border-b-2 ${activeTab === id ? 'text-[#0053b3] border-[#0053b3]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-24">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center">
            <LayoutDashboard className="w-12 h-12 text-[#0053b3] mx-auto mb-4" />
            <h1 className="text-2xl font-black mb-6">RecouvreLib</h1>
            <SignIn />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <header className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0053b3] rounded-xl flex items-center justify-center"><Calendar className="text-white" /></div>
            <div>
              <h1 className="text-xl font-black">Cabinet Dr. {user?.firstName}</h1>
              <p className="text-sm text-slate-500 flex items-center gap-1"><UserCheck className="w-4 h-4 text-emerald-500" /> Praticien Certifié</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-emerald-100 shadow-sm">
              <span className="text-[9px] block font-bold text-slate-400">HONORAIRES</span>
              <span className="text-emerald-600 font-black">{monthlyTurnover}€</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-red-100 shadow-sm">
              <span className="text-[9px] block font-bold text-slate-400">IMPAYÉS</span>
              <span className="text-red-600 font-black">{unpaidBalance}€</span>
            </div>
            <UserButton />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4">
          {/* PLANNING */}
          {activeTab === 'planning' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]);
                  }}><ChevronLeft /></button>
                  <span className="font-bold">{new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                  <button onClick={() => {
                    const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]);
                  }}><ChevronRight /></button>
                </div>
                <button onClick={handleGenerateReminders} className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                  <BellRing className="w-4 h-4" /> Rappels IA
                </button>
              </div>
              
              <div className="grid gap-3">
                {appointments.filter(a => a.day === selectedDate).map(app => (
                  <div key={app.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                    <div>
                      <span className="text-xs font-bold text-slate-400 mr-3">{app.time}</span>
                      <span className="font-bold">{app.patientName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black px-2 py-1 rounded ${app.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {app.status === 'paid' ? 'RÉGLÉ' : 'ATTENTE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCANNER */}
          {activeTab === 'scan' && (
            <div className="flex flex-col items-center py-10">
              {!isScanning && scanResults.length === 0 && (
                <button onClick={startScan} className="w-full max-w-md aspect-video bg-white border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-[#0053b3] transition-all">
                  <Camera className="w-12 h-12 text-slate-300" />
                  <span className="font-bold text-slate-400">Scanner mon agenda papier</span>
                </button>
              )}

              {isScanning && (
                <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-[2rem] overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button onClick={captureAndAnalyze} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-300" />
                </div>
              )}

              {isLoading && <div className="mt-4 flex items-center gap-2 font-bold text-indigo-600 animate-pulse"><Activity /> IA en cours d'analyse...</div>}

              {scanResults.length > 0 && (
                <div className="w-full max-w-md bg-white p-6 rounded-[2rem] shadow-xl mt-6">
                  <h3 className="font-black mb-4">Résultats du Scan</h3>
                  <div className="space-y-2 mb-6">
                    {scanResults.map((r, i) => (
                      <div key={i} className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg">
                        <span className="font-bold">{r.patientName}</span>
                        <span>{r.time}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    const newApps = scanResults.map(r => ({ ...r, id: Math.random().toString(36).substr(2, 9), userId: 'mock', status: 'pending' as const }));
                    setAppointments([...appointments, ...newApps]);
                    setScanResults([]);
                    setActiveTab('planning');
                  }} className="w-full bg-[#0053b3] text-white py-3 rounded-xl font-bold">Importer au planning</button>
                </div>
              )}
            </div>
          )}

          {/* PATIENTS */}
          {activeTab === 'patients' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-xl">Patients</h2>
                <button onClick={() => setIsPatientModalOpen(true)} className="bg-[#0053b3] text-white p-2 rounded-lg"><UserPlus /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patients.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between mb-2">
                      <span className="font-black">{p.name}</span>
                      <div className="flex gap-2 text-slate-400">
                        <Edit2 className="w-4 h-4 cursor-pointer" onClick={() => { setEditingPatient(p); setIsPatientModalOpen(true); }} />
                        <Trash2 className="w-4 h-4 cursor-pointer" onClick={() => setPatients(prev => prev.filter(x => x.id !== p.id))} />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{p.phone}</div>
                    <div className="mt-3 flex items-center gap-2">
                       <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded flex items-center gap-1"><History className="w-3 h-3"/> {p.totalSessions} séances</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* NAVIGATION BASSE */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl border border-slate-200 flex gap-4 z-50">
          <NavItem id="planning" icon={Calendar} label="Planning" />
          <NavItem id="patients" icon={Users} label="Patients" />
          <NavItem id="scan" icon={Camera} label="Scan" />
          <NavItem id="recovery" icon={CreditCard} label="Impayés" />
        </nav>

        {/* MODAL PATIENT */}
        {isPatientModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] p-8">
              <div className="flex justify-between mb-6">
                <h3 className="font-black text-xl">{editingPatient ? 'Modifier Patient' : 'Nouveau Patient'}</h3>
                <X className="cursor-pointer" onClick={() => { setIsPatientModalOpen(false); setEditingPatient(null); }} />
              </div>
              <form onSubmit={handleSavePatient} className="space-y-4">
                <input name="name" placeholder="Nom complet" defaultValue={editingPatient?.name} className="w-full p-3 rounded-xl border" required />
                <input name="phone" placeholder="Téléphone" defaultValue={editingPatient?.phone} className="w-full p-3 rounded-xl border" required />
                <textarea name="notes" placeholder="Notes" defaultValue={editingPatient?.notes} className="w-full p-3 rounded-xl border h-24" />
                <button type="submit" className="w-full bg-[#0053b3] text-white py-3 rounded-xl font-bold">Enregistrer</button>
              </form>
            </div>
          </div>
        )}
      </SignedIn>
    </div>
  );
};

export default App;
