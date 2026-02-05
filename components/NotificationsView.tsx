
import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Clock, ArrowRight } from 'lucide-react';

const NotificationItem: React.FC<{ 
  title: string; 
  description: string; 
  time: string; 
  type: 'success' | 'warning' | 'info';
}> = ({ title, description, time, type }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-indigo-500" />
  };

  const backgrounds = {
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    info: 'bg-indigo-50'
  };

  return (
    <div className="flex gap-4 p-6 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-sm transition-all group">
      <div className={`p-3 rounded-xl h-fit ${backgrounds[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</h4>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {time}
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">{description}</p>
        <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
          Voir le dossier <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const NotificationsView: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Bell className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Activité de la semaine</h2>
        </div>
        <p className="text-sm text-slate-500">RecouvreLib a automatisé 12 relances et clôturé 2 dossiers ces derniers jours.</p>
      </div>

      <div className="space-y-4">
        <NotificationItem 
          title="Relance 2 envoyée" 
          description="Un e-mail de relance automatique de niveau 2 a été envoyé à Alice Martin concernant la facture INV-2024-02."
          time="Il y a 2 heures"
          type="info"
        />
        <NotificationItem 
          title="Dossier clôturé avec succès" 
          description="Le paiement de 120.50 € a été confirmé pour Jean Dupont. Le dossier est maintenant archivé."
          time="Il y a 5 heures"
          type="success"
        />
        <NotificationItem 
          title="Mise en demeure nécessaire" 
          description="Le dossier de Marc Leroy est sans réponse après 3 relances. Il est conseillé de passer à l'étape de mise en demeure."
          time="Hier à 14:30"
          type="warning"
        />
        <NotificationItem 
          title="Nouveau dossier importé" 
          description="Le dossier de Sophie Morel a été créé suite à un impayé de 340 € constaté sur votre logiciel métier."
          time="2 jours"
          type="info"
        />
      </div>

      <div className="text-center py-10">
        <button className="text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
          Charger les notifications plus anciennes
        </button>
      </div>
    </div>
  );
};

export default NotificationsView;
