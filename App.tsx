
import React, { useState, useMemo } from 'react';
import { 
  SignedIn, 
  SignedOut, 
  SignIn, 
  SignUp, 
  UserButton, 
  useUser 
} from './components/MockAuth';
import Dashboard from './components/Dashboard';
import CaseList from './components/CaseList';
import CaseDetail from './components/CaseDetail';
import AddCaseModal from './components/AddCaseModal';
import NotificationsView from './components/NotificationsView';
import { MOCK_CASES } from './constants';
import { Case, DashboardStats, RecoveryStep, CaseDocument } from './types';
import { Plus, LayoutDashboard, Briefcase, Search, Settings, Bell, ShieldCheck, Briefcase as BriefcaseIcon } from 'lucide-react';

type View = 'dashboard' | 'archive' | 'notifications';
type TimeFilter = 'all' | '30days' | '90days';

const App: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [cases, setCases] = useState<Case[]>(MOCK_CASES);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const userCases = useMemo(() => {
    if (!user) return [];
    return cases.filter(c => !c.userId || c.userId === user.id || c.userId === 'mock-user-123');
  }, [cases, user]);

  const stats = useMemo<DashboardStats>(() => {
    const activeCasesList = userCases.filter(c => !c.isArchived);
    const archivedCasesList = userCases.filter(c => c.isArchived);
    
    const totalPending = activeCasesList.reduce((acc, c) => acc + c.invoice.amount, 0);
    const totalCount = userCases.length;
    
    const successRate = totalCount > 0 ? Math.round((archivedCasesList.length / totalCount) * 100) : 0;
    
    let avgTime = 0;
    if (archivedCasesList.length > 0) {
      const totalDays = archivedCasesList.reduce((acc, c) => {
        const start = new Date(c.createdAt).getTime();
        const end = new Date(c.lastActionAt).getTime();
        return acc + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      }, 0);
      avgTime = Math.round(totalDays / archivedCasesList.length);
    }

    return {
      totalPending,
      activeCases: activeCasesList.length,
      successRate: successRate || 84,
      averageCollectionTime: avgTime || 14
    };
  }, [userCases]);

  const filteredCases = useMemo(() => {
    let result = userCases.filter(c => currentView === 'archive' ? c.isArchived : !c.isArchived);

    result = result.filter(c => 
      c.debtor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.debtor.profession.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (timeFilter !== 'all') {
      const now = new Date();
      const days = timeFilter === '30days' ? 30 : 90;
      const limit = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter(c => new Date(c.createdAt) >= limit);
    }

    return result;
  }, [userCases, searchTerm, timeFilter, currentView]);

  const handleExport = () => {
    const headers = ['ID', 'Client', 'Profession', 'Montant', 'Statut', 'Créé le'];
    const rows = filteredCases.map(c => [
      c.id, c.debtor.name, c.debtor.profession, c.invoice.amount, c.status, c.createdAt
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `recouvre_export_${currentView}.csv`;
    link.click();
    showToast("Exportation réussie");
  };

  const handleAddCase = (data: any) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const displayDate = new Date().toLocaleDateString('fr-FR');
    const newCase: Case = {
      id: `C-${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      debtor: {
        id: `D-${Math.random()}`,
        name: data.name, email: data.email, phone: '',
        profession: data.profession.includes('Patient') ? data.profession : `Client - ${data.profession}`
      },
      invoice: {
        id: data.invoiceId, amount: parseFloat(data.amount), date: today, dueDate: today, description: data.description
      },
      status: RecoveryStep.PLATFORM_REMINDER_1,
      createdAt: today, lastActionAt: today, documents: [], isArchived: false,
      history: [
        { date: displayDate, action: 'Dossier créé', note: 'Prise en charge par RecouvreLib.' },
        { date: displayDate, action: 'Relance 1', note: 'Premier contact envoyé.' }
      ]
    };
    setCases(prev => [newCase, ...prev]);
    setCurrentView('dashboard');
    showToast("Nouveau client ajouté");
  };

  const handleAddDocument = (caseId: string, docData: any) => {
    const newDoc: CaseDocument = {
      id: `DOC-${Math.random().toString(36).substr(2, 9)}`,
      name: docData.name, type: docData.type, fileType: docData.fileType,
      date: docData.date, content: docData.content,
      size: `${(Math.random() * 1.5 + 0.1).toFixed(1)} MB`
    };
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, documents: [...c.documents, newDoc] } : c));
    if (selectedCase?.id === caseId) {
      setSelectedCase(prev => prev ? ({ ...prev, documents: [...prev.documents, newDoc] }) : null);
    }
    showToast("Document ajouté");
  };

  const handleUpdateStatus = (id: string, newStatus: RecoveryStep, isRegression: boolean = false) => {
    const displayDate = new Date().toLocaleDateString('fr-FR');
    setCases(prev => prev.map(c => {
      if (c.id === id) {
        const updated = {
          ...c, status: newStatus, lastActionAt: new Date().toISOString().split('T')[0],
          history: [...c.history, { 
            date: displayDate, 
            action: isRegression ? `Retour à : ${newStatus}` : newStatus,
            note: isRegression ? "Rétrogradation manuelle." : "Escalade automatique."
          }]
        };
        if (selectedCase?.id === id) setSelectedCase(updated);
        return updated;
      }
      return c;
    }));
    showToast(`Statut : ${newStatus}`);
  };

  const handleDeleteCase = (id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    if (selectedCase?.id === id) setSelectedCase(null);
    showToast("Client supprimé définitivement");
  };

  const handleArchiveCase = (id: string) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, isArchived: true, lastActionAt: new Date().toISOString().split('T')[0] } : c));
    if (selectedCase?.id === id) setSelectedCase(null);
    showToast("Dossier classé (Suivi)");
  };

  const handleMarkAsPaid = (id: string) => {
    const displayDate = new Date().toLocaleDateString('fr-FR');
    setCases(prev => prev.map(c => c.id === id ? { 
      ...c, isArchived: true, 
      lastActionAt: new Date().toISOString().split('T')[0],
      history: [...c.history, { date: displayDate, action: 'Payé', note: 'Encaissement confirmé.' }]
    } : c));
    if (selectedCase?.id === id) setSelectedCase(null);
    showToast("Facture réglée avec succès", "success");
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white">
          <div className="mb-12 text-center max-w-md animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200 mx-auto mb-6">
              <BriefcaseIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">RecouvreLib</h1>
            <p className="text-slate-600 font-medium italic">L'IA au service du recouvrement libéral.</p>
          </div>
          
          <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 animate-in zoom-in duration-500 w-full max-w-sm">
            {authMode === 'signIn' ? (
              <div className="flex flex-col items-center">
                <SignIn />
                <button 
                  onClick={() => setAuthMode('signUp')}
                  className="mt-6 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Pas encore de compte ? Créer un profil
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <SignUp />
                <button 
                  onClick={() => setAuthMode('signIn')}
                  className="mt-6 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Déjà un compte ? Se connecter
                </button>
              </div>
            )}
          </div>

          <div className="mt-12 flex items-center gap-6 text-slate-400 font-bold text-xs uppercase tracking-widest animate-in fade-in duration-1000">
             <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Mode Démonstration local</span>
             <span>•</span>
             <span>IA Propulsée par Gemini</span>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex min-h-screen bg-slate-50">
          {toast && (
            <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-right-4">
              <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 font-bold text-sm ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-white border-slate-800'}`}>
                {toast.message}
              </div>
            </div>
          )}

          <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 left-0 z-40 hidden lg:flex border-r border-slate-800">
            <div className="p-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/10">
                <BriefcaseIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">RecouvreLib</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
              <button 
                onClick={() => { setCurrentView('dashboard'); setSelectedCase(null); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-semibold text-sm ${currentView === 'dashboard' ? 'bg-slate-800 text-white' : 'hover:text-white hover:bg-slate-800'}`}
              >
                <LayoutDashboard className={`w-5 h-5 ${currentView === 'dashboard' ? 'text-indigo-400' : ''}`} />
                <span>Tableau de bord</span>
              </button>
              
              <button 
                onClick={() => { setCurrentView('archive'); setSelectedCase(null); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-semibold text-sm ${currentView === 'archive' ? 'bg-slate-800 text-white' : 'hover:text-white hover:bg-slate-800'}`}
              >
                <Briefcase className={`w-5 h-5 ${currentView === 'archive' ? 'text-indigo-400' : ''}`} />
                <span>Suivi (Archives)</span>
              </button>

              <button 
                onClick={() => { setCurrentView('notifications'); setSelectedCase(null); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-semibold text-sm ${currentView === 'notifications' ? 'bg-slate-800 text-white' : 'hover:text-white hover:bg-slate-800'}`}
              >
                <Bell className={`w-5 h-5 ${currentView === 'notifications' ? 'text-indigo-400' : ''}`} />
                <span>Notifications</span>
              </button>
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-4">
              <div className="px-4 py-2 flex items-center justify-between bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Praticien</span>
                  <span className="text-sm font-bold text-white truncate max-w-[120px]">{user?.fullName || user?.username}</span>
                </div>
                <UserButton />
              </div>
              <div className="space-y-1">
                <button className="flex items-center gap-3 w-full px-4 py-3 hover:text-white hover:bg-slate-800 rounded-xl transition-all text-sm font-medium">
                  <Settings className="w-5 h-5" />
                  <span>Réglages</span>
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 lg:ml-64 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {currentView === 'dashboard' ? 'Espace Praticien' : currentView === 'archive' ? 'Dossiers Classés' : 'Notifications'}
                </h1>
                <p className="text-slate-500 font-medium">
                  {currentView === 'dashboard' ? 'Recouvrement actif en cours.' : currentView === 'archive' ? 'Historique des dossiers terminés.' : 'Alertes récentes.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 md:flex-none">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="Rechercher..."
                    className="pl-12 pr-6 py-3 border border-slate-200 rounded-2xl bg-white outline-none w-full md:w-80 font-medium text-sm shadow-sm"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nouveau Dossier</span>
                </button>
              </div>
            </header>

            {selectedCase ? (
              <CaseDetail 
                recoveryCase={selectedCase} onBack={() => setSelectedCase(null)} 
                onUpdateStatus={handleUpdateStatus} onAddDocument={handleAddDocument}
              />
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {currentView === 'notifications' ? (
                  <NotificationsView />
                ) : (
                  <div className="space-y-10">
                    {currentView === 'dashboard' && <Dashboard stats={stats} />}
                    <CaseList 
                      cases={filteredCases} 
                      onSelectCase={setSelectedCase} 
                      onDeleteCase={handleDeleteCase}
                      onArchiveCase={handleArchiveCase}
                      onMarkAsPaid={handleMarkAsPaid}
                      onExport={handleExport}
                      onFilterChange={setTimeFilter}
                      activeFilter={timeFilter}
                    />
                  </div>
                )}
              </div>
            )}
          </main>

          <AddCaseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddCase} />
        </div>
      </SignedIn>
    </>
  );
};

export default App;
