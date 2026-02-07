
export enum RecoveryLevel {
  LEVEL_1 = 'Rappel amical',
  LEVEL_2 = 'Relance ferme',
  LEVEL_3 = 'Mise en demeure',
  LEVEL_4 = 'Dossier Juridique'
}

export enum RecoveryStep {
  PLATFORM_REMINDER_1 = 'Relance Amiable 1',
  PLATFORM_REMINDER_2 = 'Relance Amiable 2',
  PLATFORM_REMINDER_3 = 'Dernier Avis Amiable',
  DEMAND_LETTER = 'Mise en Demeure',
  LEGAL_ACTION = 'Procédure Judiciaire'
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  isArchived: boolean;
  firstAppointmentDate?: string;
  notes?: string;
  totalSessions: number;
}

export interface Appointment {
  id: string;
  userId: string;
  patientId?: string;
  patientName: string;
  day: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'pending' | 'paid' | 'unpaid';
  amount: number;
}

export interface Debt {
  id: string;
  userId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  amount: number;
  level: RecoveryLevel;
  createdAt: string;
  isClosed: boolean;
}

export interface CaseDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  fileType: string;
  size: string;
  content: string;
}

export interface Case {
  id: string;
  userId: string;
  debtor: {
    id: string;
    name: string;
    email: string;
    phone: string;
    profession: string;
  };
  invoice: {
    id: string;
    amount: number;
    date: string;
    dueDate: string;
    description: string;
  };
  status: RecoveryStep;
  createdAt: string;
  lastActionAt: string;
  documents: CaseDocument[];
  history: {
    date: string;
    action: string;
    note: string;
  }[];
}

export interface ScanResult {
  patientName: string;
  day: string;
  time: string;
  amount?: number;
}

export interface DashboardStats {
  totalPending: number;
  activeCases: number;
  successRate: number;
  averageCollectionTime: number;
}
