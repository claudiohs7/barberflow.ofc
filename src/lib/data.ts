
import type { Barbershop, Barber, Service, Appointment, Client, Expense, MessageTemplate } from '@/lib/definitions';

export const mockBarbershop: Barbershop = {
  id: 'barbershop_1',
  name: 'Barbearia Premium',
  address: {
    street: 'Rua das Tesouras, 123',
    number: '123',
    complement: '',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01001-000',
  },
  phone: '11987654321',
  operatingHours: [
    { day: 'Segunda-feira', open: '09:00', close: '19:00' },
    { day: 'Terça-feira', open: '09:00', close: '19:00' },
    { day: 'Quarta-feira', open: '09:00', close: '19:00' },
    { day: 'Quinta-feira', open: '09:00', close: '20:00' },
    { day: 'Sexta-feira', open: '09:00', close: '20:00' },
    { day: 'Sábado', open: '08:00', close: '16:00' },
    { day: 'Domingo', open: 'closed', close: 'closed' },
  ],
  plan: 'Premium',
  status: 'Ativa',
  logoUrl: `https://picsum.photos/seed/barbershop_1/128/128`
};

export const mockBarbers: Barber[] = [
  { id: 'barber_1', name: 'Roberto Carlos', phone: '11911111111', avatarUrl: `https://picsum.photos/seed/barber_1/80/80`, schedule: [{ day: 'Segunda-feira', start: '09:00', end: '19:00' }], services: [{ serviceId: 'service_1' }, { serviceId: 'service_2' }] },
  { id: 'barber_2', name: 'João da Silva', phone: '11922222222', avatarUrl: `https://picsum.photos/seed/barber_2/80/80`, schedule: [{ day: 'Terça-feira', start: '10:00', end: '18:00' }], services: [{ serviceId: 'service_1' }] },
];

export const mockServices: Service[] = [
  { id: 'service_1', name: 'Corte de Cabelo', duration: 30, price: 50, barbershopId: 'barbershop_1' },
  { id: 'service_2', name: 'Barba', duration: 30, price: 40, barbershopId: 'barbershop_1' },
  { id: 'service_3', name: 'Corte + Barba', duration: 60, price: 85, barbershopId: 'barbershop_1' },
];

export const mockClients: Client[] = [
    { id: 'client_1', name: 'Fernando Lima', phone: '11933333333', email: 'fernando@exemplo.com' },
    { id: 'client_2', name: 'Ana Souza', phone: '11944444444', email: 'ana@exemplo.com' },
];

export const mockAppointments: Appointment[] = [
    { id: 'appt_1', clientId: 'client_1', clientName: 'Fernando Lima', clientPhone: '11933333333', barberId: 'barber_1', serviceIds: ['service_1'], startTime: new Date(), endTime: new Date(new Date().getTime() + 30 * 60000), status: 'confirmed' },
];

export const mockExpenses: Expense[] = [
    { id: 'exp_1', barbershopId: 'barbershop_1', description: 'Aluguel', category: 'Aluguel', type: 'Fixa', amount: 2500, date: new Date() }
];

export const mockSystemMessages = [
    { id: 'msg1', content: 'Manutenção programada para este domingo às 23h. O sistema pode ficar indisponível por até 15 minutos.' },
    { id: 'msg2', content: 'Nova funcionalidade! Agora você pode exportar seus relatórios financeiros para CSV.' },
];

export const messageTemplates: MessageTemplate[] = [
    { id: 'tmpl1', name: 'Lembrete Padrão', type: 'Lembrete de Agendamento', content: 'Olá, {cliente}!\nPassando para lembrar do seu horário amanhã às {horario} com {barbeiro}.\nAté lá!\nEquipe {barbearia}.', enabled: true, reminderHoursBefore: 24 },
    { id: 'tmpl2', name: 'Confirmação Padrão', type: 'Confirmação de Agendamento', content: 'Olá, {cliente}!\nSeu agendamento para {servico} no dia {data} às {horario} foi confirmado.\nEquipe {barbearia}.', enabled: true },
    { id: 'tmpl4', name: 'Confirmação Manual', type: "Confirmação Manual", content: "Olá, {cliente}!\nPassando para confirmar seu agendamento para {servico} no dia {data} às {horario} com {barbeiro}.\nPor favor, responda 'SIM' para confirmar.\nEquipe {barbearia}.", enabled: true },
    { id: 'tmpl3', name: 'Pesquisa Padrão', type: 'Pesquisa de Satisfação', content: 'Olá, {cliente}!\nAgradecemos a sua visita.\nO que você achou do nosso serviço?\nResponda de 0 a 10.\nEquipe {barbearia}.', enabled: false }
];
