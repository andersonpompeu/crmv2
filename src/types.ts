export interface Lead {
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  status: "Novo" | "Encaminhado" | "Em Atendimento" | "Concluído" | "Recusado" | "Arquivado";
  notes: string;
  metadata: {
    browser: string;
    referrer: string;
    ip?: string;
  };
  notified: boolean;
  assignedProfessionalId?: string;
  forwardToken?: string;
  forwardExpiresAt?: string;
  forwardedAt?: string;
  acceptedAt?: string;
  location?: string;
  operatorNotifiedOfAcceptance?: boolean;
  address?: string;
  city?: string;
  description?: string;
  estimatedValue?: number;
  reviewToken?: string;          // UUID generated or token when status is "Concluído"
  reviewTokenExpiresAt?: string; // ISO date
  reviewedAt?: string;           // completed rating date
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

export interface Template {
  id: string;
  name: string;
  siteUrl: string;
  bgColor: string;
  textColor: string;
  active: boolean;
  fields: FormField[];
  leadsCount: number;
  createdAt: string;
}

export interface AlertConfig {
  emailEnabled: boolean;
  emailAddress: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  soundEnabled: boolean;
  osNotificationEnabled: boolean;
}

export interface ProfitRecord {
  id: string;
  date: string;
  description: string;
  value: number; // in BRL R$
}

export interface Review {
  id: string;
  leadId: string;
  professionalId: string;
  rating: number; // 1 to 5
  comment?: string;
  clientName?: string;
  createdAt: string;
  tokenUsed: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  photoUrl: string;
  templateId: string; // Linked template
  profitRecords: ProfitRecord[];
  createdAt: string;
  username?: string;
  password?: string;
  reviewStats?: {
    average: number;
    total: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  payload: string; // Serialized JSON payload
  status: number;  // HTTP response status code
  errorMessage?: string; // Any processing error message
  userAgent?: string;
  ipAddress?: string;
  templateName?: string;
}

