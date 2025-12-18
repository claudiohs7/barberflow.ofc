
// src/mocks/appointments.ts

// Mocks para agendamentos (appointments)
export const MOCKED_APPOINTMENTS = [
  {
    id: "appt_001",
    barberId: "barber_a",
    clientId: "Tz8n8MtUuURMb6DwVlkZHIBHTE3", // Use sua UID para simular que está logado
    serviceName: "Corte e Barba",
    time: "2025-11-10T10:00:00.000Z", // Timestamp em formato string
    status: "confirmed",
  },
  {
    id: "appt_002",
    barberId: "barber_b",
    clientId: "outro_cliente_uid",
    serviceName: "Corte Simples",
    time: "2025-11-10T11:30:00.000Z",
    status: "confirmed",
  },
  // Adicione mais objetos para testar diferentes cenários
];

// Mocks para slots de horário disponíveis
export const MOCKED_AVAILABLE_SLOTS = [
  "10:00",
  "10:30",
  "11:00",
  "14:00",
  "14:30",
];
