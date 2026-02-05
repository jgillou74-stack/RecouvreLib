
import React, { useState, useRef, useEffect } from 'react';
import { Case, RecoveryStep } from '../types';
import { STEP_COLORS } from '../constants';
import { MoreHorizontal, Calendar, Hash, BadgeInfo, Gavel, Trash2, CheckCircle, Archive, ChevronDown } from 'lucide-react';

interface CaseListProps {
  cases: Case[];
  onSelectCase: (c: Case) => void;
  onDeleteCase: (id: string) => void;
  onArchiveCase: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onExport: () => void;
  onFilterChange: (filter: 'all' | '30days' | '90days') => void;
  activeFilter: string;
}

const CaseList: React.FC<CaseListProps> = ({ 
  cases, 
  onSelectCase, 
  onDeleteCase, 
  onArchiveCase, 
  onMarkAsPaid, 
  onExport, 
  onFilterChange, 
  activeFilter 
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) {
        setShowPeriodDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getReminderCount = (history: Case['history']) => {
    return history.filter(h => h.action.toLowerCase().includes('relance')).length;
  };

  const generateMailtoLink = (c: Case) => {
    const subject = `Transfert de dossier de recouvrement - ${c.debtor.name}`;
    const reminders = c.history
      .filter(h => h.action.toLowerCase().includes('relance'))
      .map(h => `- ${h.date} : ${h.action}`)
      .join('\n');

    const body = `Bonjour,\n\nJe vous transmets par la présente un dossier de non-paiement pour traitement juridique.\n\nRÉCAPITULATIF DU DOSSIER\n-----------------------\nNom du client : ${c.debtor.name}\nProfession : ${c.debtor.profession}\nMontant total dû : ${c.invoice.amount.toLocaleString('fr-FR')} €\nFacture N° : ${c.invoice.id}\nDate de la facture : ${c.invoice.date}\n\nÉTAPES DE RELANCE EFFECTUÉES\n---------------------------\n${reminders || 'Aucune relance automatique enregistrée'}\n\n---\nCe dossier est transmis via l'outil RecouvreLib.`;

    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setOpenMenuId(null);
  };

  const filterLabels = {
    all: 'Toutes périodes',
    '30days': '30 derniers jours',
    '90days': '90 derniers jours'
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-2xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Suivi des impayés</h2>
          <p className="text-sm text-slate-500">Liste exhaustive des procédures en cours ({cases.length})</p>
        </div>
        <div className="flex gap-2 relative">
           <div className="relative" ref={periodRef}>
              <button 
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="text-sm px-4 py-2 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-200 shadow-sm"
              >
                <Calendar className="w-4 h-4 text-indigo-500" />
                {filterLabels[activeFilter as keyof typeof filterLabels]}
                <ChevronDown className={`w-3 h-3 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showPeriodDropdown && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in duration-100">
                  {(['all', '30days', '90days'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { onFilterChange(f); setShowPeriodDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${activeFilter === f ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              )}
           </div>

           <button 
            onClick={onExport}
            className="text-sm px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all border border-indigo-600 shadow-md shadow-indigo-100 active:scale-95"
           >
             Exporter Données
           </button>
        </div>
      </div>
      <div className="overflow-x-visible">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Client / Débiteur</th>
              <th className="px-6 py-4">Montant dû</th>
              <th className="px-6 py-4">Dernière relance</th>
              <th className="px-6 py-4">Nb relances</th>
              <th className="px-6 py-4">Statut actuel</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.map((c) => {
              const reminderCount = getReminderCount(c.history);
              const isMenuOpen = openMenuId === c.id;

              return (
                <tr 
                  key={c.id} 
                  className="hover:bg-slate-50/80 transition-all cursor-pointer group relative"
                  onClick={() => onSelectCase(c)}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 group-hover:bg-white transition-colors">
                        {c.debtor.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.debtor.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{c.debtor.profession}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-800">
                      {c.invoice.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(c.lastActionAt).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs">
                      <Hash className="w-3 h-3 text-slate-400" />
                      {reminderCount}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${STEP_COLORS[c.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right relative">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <a 
                        href={generateMailtoLink(c)}
                        title="Transférer au service juridique"
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-md shadow-violet-200 active:scale-95"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Transfert Juridique</span>
                      </a>
                      
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : c.id); }}
                          className={`p-2 rounded-xl transition-all ${isMenuOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>

                        {isMenuOpen && (
                          <div 
                            ref={menuRef}
                            className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in duration-100 origin-top-right"
                          >
                            <div className="px-4 py-2 mb-1">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions Dossier</p>
                            </div>
                            <button 
                              onClick={(e) => handleAction(e, () => onMarkAsPaid(c.id))}
                              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Marquer comme payé
                            </button>
                            <button 
                              onClick={(e) => handleAction(e, () => onArchiveCase(c.id))}
                              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-3 transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                              Archiver le dossier
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                              onClick={(e) => {
                                if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le dossier de ${c.debtor.name} ?`)) {
                                  handleAction(e, () => onDeleteCase(c.id));
                                }
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer le client
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {cases.length === 0 && (
        <div className="p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <BadgeInfo className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-bold mb-1">Aucun dossier trouvé</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">Essayez d'ajuster votre période ou recherchez un autre client.</p>
        </div>
      )}
    </div>
  );
};

export default CaseList;
