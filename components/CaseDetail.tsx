
import React, { useState, useEffect, useRef } from 'react';
import { Case, RecoveryStep, CaseDocument } from '../types';
import { generateRecoveryLetter, getLegalAdvice } from '../services/geminiService';
import { 
  ArrowLeft, Send, Sparkles, FileText, ShieldAlert, Undo2, 
  FileDown, Download, Plus, X, Upload, FileCode, FileImage, File
} from 'lucide-react';

interface CaseDetailProps {
  recoveryCase: Case;
  onBack: () => void;
  onUpdateStatus: (id: string, newStatus: RecoveryStep, isRegression?: boolean) => void;
  onAddDocument: (caseId: string, doc: Omit<CaseDocument, 'id' | 'size'>) => void;
}

const CaseDetail: React.FC<CaseDetailProps> = ({ recoveryCase, onBack, onUpdateStatus, onAddDocument }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'letter' | 'ai' | 'docs'>('info');
  const [letter, setLetter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [advices, setAdvices] = useState<{ title: string; advice: string }[]>([]);
  
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocData, setNewDocData] = useState({
    name: '',
    type: 'Facture',
    date: new Date().toISOString().split('T')[0],
    fileType: '',
    content: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateLetter = async () => {
    setLoading(true);
    const text = await generateRecoveryLetter(recoveryCase);
    setLetter(text || '');
    setLoading(false);
    setActiveTab('letter');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-fill name if empty
      if (!newDocData.name) {
        setNewDocData(prev => ({ ...prev, name: file.name }));
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setNewDocData(prev => ({ 
          ...prev, 
          content: base64,
          fileType: file.type
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocData.content) {
      alert("Veuillez sélectionner un fichier à uploader.");
      return;
    }
    onAddDocument(recoveryCase.id, newDocData);
    setIsAddingDoc(false);
    setSelectedFile(null);
    setNewDocData({
      name: '',
      type: 'Facture',
      date: new Date().toISOString().split('T')[0],
      fileType: '',
      content: ''
    });
  };

  const downloadFile = (doc: CaseDocument) => {
    if (!doc.content) return;
    const link = document.createElement('a');
    link.href = doc.content;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes('csv') || mimeType.includes('sheet')) return <FileCode className="w-5 h-5 text-emerald-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  useEffect(() => {
    if (activeTab === 'ai' && advices.length === 0) {
      setLoading(true);
      getLegalAdvice(recoveryCase).then(data => {
        setAdvices(data.advices);
        setLoading(false);
      });
    }
  }, [activeTab]);

  const steps = Object.values(RecoveryStep);
  const currentIdx = steps.indexOf(recoveryCase.status);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">{recoveryCase.debtor.name}</h2>
            <p className="text-slate-400 text-sm">Dossier {recoveryCase.id} • {recoveryCase.invoice.amount} €</p>
          </div>
        </div>
        <div className="flex gap-3">
          {currentIdx > 0 && (
            <button 
              onClick={() => onUpdateStatus(recoveryCase.id, steps[currentIdx - 1], true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-700"
            >
              <Undo2 className="w-4 h-4" />
              Étape précédente
            </button>
          )}

          {currentIdx < steps.length - 1 && (
            <button 
              onClick={() => onUpdateStatus(recoveryCase.id, steps[currentIdx + 1])}
              className="bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              Étape suivante <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-6">
        <button 
          onClick={() => setActiveTab('info')}
          className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Informations
        </button>
        <button 
          onClick={() => setActiveTab('letter')}
          className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'letter' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Relance Auto
        </button>
        <button 
          onClick={() => setActiveTab('docs')}
          className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Documents ({recoveryCase.documents.length})
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Conseils IA
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Détails de la dette</h3>
              <div className="space-y-4">
                <div className="flex justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Statut actuel</span>
                  <span className="font-bold text-indigo-600">{recoveryCase.status}</span>
                </div>
                <div className="flex justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Facture N°</span>
                  <span className="font-medium">{recoveryCase.invoice.id}</span>
                </div>
                <div className="flex justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Échéance</span>
                  <span className="font-medium text-red-600">{recoveryCase.invoice.dueDate}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 block mb-2">Prestation</span>
                  <span className="text-sm italic">"{recoveryCase.invoice.description}"</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Historique des actions</h3>
              <div className="relative border-l-2 border-slate-100 pl-6 space-y-8">
                {[...recoveryCase.history].reverse().map((h, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-8 top-0 bg-white border-2 ${h.action.includes('Retour') ? 'border-amber-500' : 'border-indigo-500'} w-4 h-4 rounded-full`}></div>
                    <div className="text-sm font-bold text-slate-900">{h.action}</div>
                    <div className="text-xs text-slate-400 mb-1">{h.date}</div>
                    <div className="text-sm text-slate-600">{h.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="font-bold text-slate-900">Documents du dossier</h4>
                <p className="text-xs text-slate-500 font-medium">Factures, contrats et preuves de relance (Stockage local).</p>
              </div>
              {!isAddingDoc && (
                <button 
                  onClick={() => setIsAddingDoc(true)}
                  className="text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <Plus className="w-4 h-4" />
                  Postez un document
                </button>
              )}
            </div>

            {isAddingDoc && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300 mb-8 shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    Importer un fichier
                  </h5>
                  <button onClick={() => setIsAddingDoc(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleAddDocSubmit} className="space-y-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${selectedFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}
                  >
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center">
                      <div className={`p-4 rounded-full mb-3 ${selectedFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700">
                        {selectedFile ? selectedFile.name : "Cliquez pour sélectionner un fichier"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG ou CSV (Max 2MB)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nom personnalisé (optionnel)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="ex: Facture_JANV_2024"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/20 text-sm font-medium"
                        value={newDocData.name}
                        onChange={e => setNewDocData({...newDocData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Type de document</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-500/20 text-sm font-medium"
                        value={newDocData.type}
                        onChange={e => setNewDocData({...newDocData, type: e.target.value})}
                      >
                        <option>Facture</option>
                        <option>Contrat</option>
                        <option>Preuve de réception</option>
                        <option>Courrier de relance</option>
                        <option>Autre</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!selectedFile}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enregistrer dans le dossier
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {recoveryCase.documents.length === 0 ? (
                <div className="text-center py-24 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <FileDown className="w-8 h-8 text-slate-200" />
                   </div>
                   <h5 className="font-bold text-slate-900 mb-1">Base de documents vide</h5>
                   <p className="text-slate-400 text-sm max-w-xs mx-auto">Veuillez poster vos factures et contrats pour constituer la base documentaire de ce client.</p>
                </div>
              ) : (
                recoveryCase.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{doc.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{doc.type}</span>
                          • {new Date(doc.date).toLocaleDateString('fr-FR')} 
                          • {doc.size}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => downloadFile(doc)}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-slate-400 shadow-sm"
                      title="Télécharger / Ouvrir"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'letter' && (
          <div className="space-y-6">
            {!letter && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">Générer un courrier officiel</h4>
                <p className="text-slate-500 max-w-md mx-auto mb-6">L'IA de RecouvreLib rédige pour vous un courrier adapté à l'étape actuelle du recouvrement.</p>
                <button 
                  onClick={generateLetter}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> {loading ? 'Rédaction...' : 'Générer la relance'}
                </button>
              </div>
            )}
            {letter && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                   <h4 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Brouillon IA</h4>
                   <button 
                    onClick={() => navigator.clipboard.writeText(letter)}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                   >
                     Copier le texte
                   </button>
                </div>
                <textarea 
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  className="w-full h-96 p-6 border border-slate-200 rounded-xl font-serif text-slate-800 shadow-inner bg-slate-50 resize-none outline-none focus:ring-2 ring-indigo-500/20"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
             <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm h-fit">
                   <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                   <h4 className="font-bold text-indigo-900 mb-1">Analyse Stratégique</h4>
                   <p className="text-sm text-indigo-700">Nos algorithmes analysent le comportement du débiteur et vous conseillent sur la meilleure approche.</p>
                </div>
             </div>

             {loading && (
               <div className="flex items-center justify-center py-20">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
               </div>
             )}

             {!loading && advices.length > 0 && (
               <div className="grid grid-cols-1 gap-4">
                  {advices.map((a, i) => (
                    <div key={i} className="p-5 border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors bg-white shadow-sm">
                       <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                         <ShieldAlert className="w-4 h-4 text-amber-500" />
                         {a.title}
                       </h5>
                       <p className="text-sm text-slate-600">{a.advice}</p>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseDetail;
