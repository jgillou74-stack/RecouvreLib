
import React from 'react';
import { Case, RecoveryStep } from './types';

export const MOCK_CASES: Case[] = [
  {
    id: 'C-001',
    // Added userId to satisfy Case interface requirement
    userId: 'mock-user-123',
    debtor: {
      id: 'D-1',
      name: 'Jean Dupont',
      email: 'jean.dupont@email.com',
      phone: '06 12 34 56 78',
      profession: 'Patient - Kinésithérapie'
    },
    invoice: {
      id: 'INV-2024-01',
      amount: 120.50,
      date: '2024-01-15',
      dueDate: '2024-01-30',
      description: 'Séances de rééducation x4'
    },
    status: RecoveryStep.PLATFORM_REMINDER_1,
    createdAt: '2024-02-05',
    lastActionAt: '2024-02-12',
    documents: [],
    history: [
      { date: '2024-02-05', action: 'Dossier transmis', note: 'Prise en charge RecouvreLib' },
      { date: '2024-02-12', action: 'Relance 1', note: 'Email et SMS envoyés automatiquement' }
    ]
  },
  {
    id: 'C-002',
    // Added userId to satisfy Case interface requirement
    userId: 'mock-user-123',
    debtor: {
      id: 'D-2',
      name: 'Alice Martin',
      email: 'alice.m@email.com',
      phone: '07 89 01 23 45',
      profession: 'Client - Conseil Juridique'
    },
    invoice: {
      id: 'INV-2024-02',
      amount: 450.00,
      date: '2023-12-10',
      dueDate: '2023-12-25',
      description: 'Audit contractuel'
    },
    status: RecoveryStep.LEGAL_ACTION,
    createdAt: '2024-01-10',
    lastActionAt: '2024-02-20',
    documents: [],
    history: [
      { date: '2024-01-10', action: 'Dossier transmis', note: 'Retard de 15 jours' },
      { date: '2024-01-20', action: 'Relance 1', note: 'Relance automatique envoyée' },
      { date: '2024-02-01', action: 'Relance 2', note: 'Deuxième avis envoyé' },
      { date: '2024-02-10', action: 'Relance 3', note: 'Dernier avis amiable' },
      { date: '2024-02-15', action: 'Mise en demeure', note: 'Recommandé AR envoyé' },
      { date: '2024-02-20', action: 'Procédure de recouvrement', note: 'Dossier transmis à l\'huissier' }
    ]
  }
];

export const STEP_COLORS = {
  [RecoveryStep.PLATFORM_REMINDER_1]: 'bg-blue-50 text-blue-700 border-blue-200',
  [RecoveryStep.PLATFORM_REMINDER_2]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  [RecoveryStep.PLATFORM_REMINDER_3]: 'bg-orange-50 text-orange-700 border-orange-200',
  [RecoveryStep.DEMAND_LETTER]: 'bg-red-50 text-red-700 border-red-200',
  [RecoveryStep.LEGAL_ACTION]: 'bg-slate-900 text-white border-slate-900',
};

export const PROFESSION_OPTIONS = [
  'Médecin',
  'Avocat',
  'Kinésithérapeute',
  'Psychologue',
  'Consultant',
  'Architecte',
  'Dentiste',
  'Expert-comptable'
];
