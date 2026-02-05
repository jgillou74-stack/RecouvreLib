
import React from 'react';
import { DashboardStats } from '../types';
import { TrendingUp, Users, Clock, CreditCard } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-slate-400">Ce mois</span>
    </div>
    <h3 className="text-sm font-medium text-slate-500">{title}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const Dashboard: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard 
        title="Encours total" 
        value={`${stats.totalPending.toLocaleString()} €`} 
        icon={<CreditCard className="w-5 h-5 text-indigo-600" />}
        color="bg-indigo-50"
      />
      <StatCard 
        title="Dossiers actifs" 
        value={stats.activeCases.toString()} 
        icon={<Users className="w-5 h-5 text-blue-600" />}
        color="bg-blue-50"
      />
      <StatCard 
        title="Taux de succès" 
        value={`${stats.successRate}%`} 
        icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        color="bg-emerald-50"
      />
      <StatCard 
        title="Temps de recouvrement" 
        value={`${stats.averageCollectionTime} j`} 
        icon={<Clock className="w-5 h-5 text-amber-600" />}
        color="bg-amber-50"
      />
    </div>
  );
};

export default Dashboard;
