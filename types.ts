
export enum RecoveryStep {
  PLATFORM_REMINDER_1 = 'Relance 1',
  PLATFORM_REMINDER_2 = 'Relance 2',
  PLATFORM_REMINDER_3 = 'Relance 3',
  DEMAND_LETTER = 'Mise en demeure',
  LEGAL_ACTION = 'Procédure de recouvrement'
}

export interface CaseDocument {
  id: string;
  name: string;
  type: string;
  fileType: string;
  date: string;
  size: string;
  content?: string;
}

export interface Debtor {
  id: string;
  name: string;
  email: string;
  phone: string;
  profession: string;
}

export interface Invoice {
  id: string;
  amount: number;
  date: string;
  dueDate: string;
  description: string;
}

export interface Case {
  id: string;
  userId: string; // Identifiant Clerk du praticien
  debtor: Debtor;
  invoice: Invoice;
  status: RecoveryStep;
  createdAt: string;
  lastActionAt: string;
  documents: CaseDocument[];
  isArchived?: boolean;
  history: {
    date: string;
    action: string;
    note: string;
  }[];
}

export interface DashboardStats {
  totalPending: number;
  activeCases: number;
  successRate: number;
  averageCollectionTime: number;
}
