export type PlanName = "Básico" | "Premium";
export type WhatsAppStatus =
  | "DISCONNECTED"
  | "LOADING_QR"
  | "AWAITING_SCAN"
  | "SCAN_QR_CODE"
  | "CONNECTED"
  | "TIMEOUT"
  | "ERROR";

export type UserRole = "SUPERADMIN" | "ADMIN" | "BARBER" | "CLIENT";

export type OperatingHour = {
  day: string;
  open: string;
  close: string;
};

export type Address = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
};

export type MessageTemplateType =
  | "Lembrete de Agendamento"
  | "Confirmação de Agendamento"
  | "Pesquisa de Satisfação"
  | "Confirmação Manual";

export type MessageTemplate = {
  id: string;
  name: string;
  type: MessageTemplateType;
  content: string;
  enabled: boolean;
  reminderHoursBefore?: number | null;
};

export type Barbershop = {
  id: string;
  name: string;
  legalName?: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  address?: Address;
  ownerId?: string;
  plan: PlanName;
  status?: "Ativa" | "Inativa";
  expiryDate?: string;
  createdAt?: string;
  operatingHours?: OperatingHour[];
  whatsappStatus?: WhatsAppStatus;
  whatsAppInstanceId?: string;
  qrCodeBase64?: string | null;
  bitsafiraInstanceData?: Record<string, any> | null;
  messageTemplates?: MessageTemplate[];
  logoUrl?: string;
  description?: string;
  bitSafiraToken?: string;
  bitsafiraInstanceId?: string;
};

export type BarberService = {
  serviceId: string;
  duration?: number;
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
  email?: string;
  userId?: string;
};

export type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  barbershopId: string;
  description?: string;
  active?: boolean;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  favoriteBarbershops?: string[];
  userId?: string;
  notes?: string;
};

export type AppointmentStatus = "confirmed" | "cancelled" | "completed" | "pending";

export type Appointment = {
  id: string;
  barbershopId?: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  barberId: string;
  serviceIds: string[];
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  totalDuration?: number;
  createdAt?: Date;
  updatedAt?: Date;
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
};

export type SystemMessage = {
  id: string;
  content: string;
  createdAt: Date;
};

export type SystemSettings = {
  evolutionApiUrl?: string;
  evolutionApiMasterKey?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
};
