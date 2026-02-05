
import React, { useState } from 'react';
import { X, Sparkles, Camera } from 'lucide-react';
import { PROFESSION_OPTIONS } from '../constants';
import OCRScanner from './OCRScanner';

interface AddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}

const AddCaseModal: React.FC<AddCaseModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    amount: '',
    profession: PROFESSION_OPTIONS[0],
    description: '',
    invoiceId: ''
  });

  const handleScanComplete = (data: any) => {
    setFormData({
      name: data.name || '',
      email: data.email || '',
      amount: data.amount ? data.amount.toString() : '',
      profession: data.profession || PROFESSION_OPTIONS[0],
      description: data.description || '',
      invoiceId: data.invoiceId || ''
    });
    setShowScanner(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-lg font-bold">Nouveau dossier</h2>
              <p className="text-xs text-slate-500 font-medium">Saisissez les données ou scannez une facture.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-6 space-y-6">
            {/* OCR Call to Action */}
            <button 
              onClick={() => setShowScanner(true)}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5 group"
            >
              <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">Scanner un document</div>
                <div className="text-[10px] text-white/70 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> L'IA remplira le formulaire instantanément
                </div>
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-300"><span className="bg-white px-2">Ou saisie manuelle</span></div>
            </div>

            <form className="space-y-4" id="add-case-form" onSubmit={(e) => {
              e.preventDefault();
              onAdd(formData);
              onClose();
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nom du Débiteur</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">E-mail</label>
                  <input 
                    type="email"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Secteur</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/10 focus:border-indigo-500 bg-white text-sm font-medium"
                    value={formData.profession}
                    onChange={(e) => setFormData({...formData, profession: e.target.value})}
                  >
                    {PROFESSION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Montant (€)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-indigo-600"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Facture N°</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium"
                    value={formData.invoiceId}
                    onChange={(e) => setFormData({...formData, invoiceId: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Détails</label>
                  <textarea 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/10 focus:border-indigo-500 h-20 text-sm font-medium resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50">
             <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
             >
               Annuler
             </button>
             <button 
              form="add-case-form"
              type="submit"
              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm"
             >
               Créer le dossier
             </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <OCRScanner 
          onScanComplete={handleScanComplete} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </>
  );
};

export default AddCaseModal;
