// src/lib/bitsafira/types.ts

// --- Configuração do Cliente ---
export interface BitSafiraConfig {
  token: string;
  baseUrl?: string;
}

// --- Resposta Genérica da API BitSafira ---
// T é o tipo dos dados esperados no campo 'dados' da resposta
export interface BitSafiraApiResponse<T = any> {
  status: number; // Status HTTP da resposta
  message?: string; // Mensagem geral (pode ser de erro ou sucesso)
  mensagem?: string; // Mensagem específica da API BitSafira (muitas vezes mais detalhada)
  error?: string; // Descrição de erro
  dados?: T; // O payload de dados específico da resposta, pode ser undefined em caso de erro
}

// --- Tipos para Autenticação ---
export interface AuthPayload {
  email: string; // Ou apiKey, dependendo da sua autenticação BitSafira
  password: string; // Se for autenticação por email/senha
}
export interface AuthResponseData {
  token: string;
  expiresIn: number; // Exemplo: tempo de expiração do token
  user?: {
    id: string;
    email: string;
    name: string;
  };
}
export type AuthResponse = BitSafiraApiResponse<AuthResponseData>;

// --- Tipos para Instâncias ---
export interface InstanceData {
  id: string;
  descricao: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'AWAITING_SCAN' | 'SCAN_QR_CODE' | 'TIMEOUT' | 'ERROR'; // Estados que a API BitSafira retorna
  qrCode?: string;
  webhookUrl?: string;
  token?: string;
  situacao?: number;
}
export type ListInstancesResponse = BitSafiraApiResponse<InstanceData[]>;
export type GetInstanceInfoResponse = BitSafiraApiResponse<InstanceData>; // Retorna uma única InstanceData

export interface CreateInstancePayload {
  descricao: string; // Nome/descrição da instância
  urlWebhook: string;
  id?: string; // Opcional, a API pode gerar
  token?: string; // Opcional, a API pode gerar
}
export type CreateInstanceResponse = BitSafiraApiResponse<InstanceData>;

export interface DeleteInstancePayload {
  id: string;
}
export type DeleteInstanceResponse = BitSafiraApiResponse<any>; // Resposta simples de sucesso/erro

export interface DisconnectInstancePayload {
  id: string;
}
export type DisconnectInstanceResponse = BitSafiraApiResponse<any>;

// --- Tipos para Conexão e QR Code ---
export interface ConnectInstancePayload {
  id: string;
}
export interface ConnectQRResponseData { // Dados retornados especificamente para a conexão/QR
  qrCode: string; // QR Code em base64
  status: 'CONNECTED' | 'DISCONNECTED' | 'AWAITING_SCAN' | 'SCAN_QR_CODE' | 'TIMEOUT' | 'ERROR';
  id: string; // ID da instância
  // Adicione outras propriedades que a API de conexão retorna
}
export type ConnectQRResponse = BitSafiraApiResponse<ConnectQRResponseData>;

// --- Tipos para Envio de Mensagens ---
export interface SendMessagePayload {
  idInstancia: string;
  whatsapp: string; // Número do destinatário com DDI
  texto: string; // Conteúdo da mensagem
  envioImediato?: number; // 1 para imediato, 0 para fila
  arquivo?: {
    tipo: number; // Ex: 4 (PDF), 1 (imagem) etc.
    descricao?: string;
    formato?: string; // Ex: 'pdf', 'png'
    base64?: string; // Conteúdo base64 do arquivo, se houver
  };
  idArquivo?: string; // Opcional, se precisar enviar mídia
}
export interface SendMessageResponseData { // Dados retornados especificamente para o envio de mensagem
  id?: string;
  idArquivo?: string;
  idInstancia?: string;
  masterContador?: number;
  situacao?: number;
  texto?: string;
  whatsapp?: string;
  mensagem?: string; // Mensagem de retorno da API
  status?: string; // Status do envio (ex: 'ENVIADO', 'FALHA')
}
export type SendMessageResponse = BitSafiraApiResponse<SendMessageResponseData>;

// --- Tipos para Verificação de Número ---
export interface VerifyNumberPayload {
  numero: string; // O número de telefone a ser verificado
  idInstancia: string; // O ID da instância BitSafira
}
export interface VerifyNumberResponseData { // Dados retornados especificamente para a verificação de número
  numero: string;
  status: 'VALID' | 'INVALID' | 'UNKNOWN'; // Status da validação
  mensagem: string; // Mensagem de retorno da API
  // Adicione outras propriedades que a API de verificação retorna
}
export type VerifyNumberResponse = BitSafiraApiResponse<VerifyNumberResponseData>;

// --- Tipos para a entidade Barbershop no Firestore ---
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
  type: 'Confirmação Manual' | 'Confirmação de Agendamento' | 'Lembrete de Agendamento' | 'Pesquisa de Satisfação';
}

export interface Barbershop {
  id: string;
  name: string;
  plan: 'Básico' | 'Premium';
  bitSafiraToken?: string;
  bitsafiraInstanceId?: string;
  // CORREÇÃO AQUI: Incluir TODOS os estados possíveis, incluindo 'LOADING_QR'
  whatsappStatus?: 'CONNECTED' | 'DISCONNECTED' | 'AWAITING_SCAN' | 'SCAN_QR_CODE' | 'TIMEOUT' | 'ERROR' | 'LOADING_QR';
  qrCodeBase64?: string | null;
  messageTemplates?: MessageTemplate[];
  // Adicione outros campos da sua barbearia aqui
}
