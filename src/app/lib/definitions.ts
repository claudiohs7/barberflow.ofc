

export type Barbershop = {
  name: string;
  legalName?: string;
  cpfCnpj?: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  };
  ownerId: string;
  plan: 'Básico' | 'Premium';
  status: 'Ativa' | 'Inativa';
  expiryDate?: string; // ISO date string
  operatingHours?: Array<{
    day: string;
    open: string;
    close: string;
  }>;
  whatsappStatus?: 'DISCONNECTED' | 'LOADING_QR' | 'AWAITING_SCAN' | 'CONNECTED';
  whatsAppInstanceId?: string; // NOVO CAMPO: ID da instância da BitSafira
  qrCodeBase64?: string | null; // NOVO CAMPO: QR Code em Base64
  messageTemplates?: MessageTemplate[]; // Adicionado com base no seu `WhatsAppPage.tsx`
};

export type BarberService = {
  serviceId: string;
  duration?: number; // Optional duration override in minutes
};

export type BarberSchedule = {
  day: string;
  start: string;
  end: string;
  lunchTime?: {
    start: string;
    end: string;
  };
};

export type Barber = {
  id: string;
  name: string;
  phone: string;
  schedule: BarberSchedule[];
  avatarUrl: string;
  services?: BarberService[];
};

export type Service = {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  barbershopId: string;
};

export type Client = {
  id:string;
  name: string;
  phone: string; // WhatsApp
  email?: string;
  favoriteBarbershops?: string[];
};

export type Appointment = {
  id: string;
  clientId: string | null; // Can be null for guests
  clientName: string; // Denormalized client name
  clientPhone: string; // Denormalized client phone
  barberId: string;
  serviceIds: string[];
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'cancelled' | 'completed';
  totalDuration?: number;
  createdBy?: "client" | "barbershop";
};

export type Expense = {
  id: string;
  barbershopId: string;
  description: string;
  category: "Aluguel" | "Contas" | "Marketing" | "Produtos" | "Salários" | "Outros";
  type: "Fixa" | "Variável";
  amount: number;
  date: Date;
};

export type MessageTemplate = {
  id: string;
  name: string;
  type: "Lembrete de Agendamento" | "Confirmação de Agendamento" | "Pesquisa de Satisfação" | "Confirmação Manual";
  content: string;
  enabled: boolean;
};

export type WebhookEvent = 
  | "agendamento.criado" 
  | "agendamento.atualizado" 
  | "agendamento.cancelado" 
  | "cliente.criado"
  | "cliente.atualizado"
  | "barbeiro.criado"
  | "barbeiro.atualizado"
  | "servico.criado"
  | "servico.atualizado";

export type Webhook = {
  id: string;
  url: string;
  name: string;
  events: WebhookEvent[];
  lastStatus: "success" | "failed" | "pending";
  lastUsed: Date | null;
};

export type SupportTicket = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "technical" | "billing" | "feature" | "other";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  barbershopId?: string;
  clientEmail: string;
  clientName: string;
};

export type SupportTicketResponse = {
    id: string;
    message: string;
    createdBy: string;
    createdAt: Date;
    isAdmin: boolean;
}


export type SystemMessage = {
  id: string;
  content: string;
  createdAt: Date;
};

export type SystemSettings = {
    evolutionApiUrl?: string;
    evolutionApiMasterKey?: string;
}
    

    
