// src/lib/bitsafira/api.ts
import {
  BitSafiraConfig,
  BitSafiraApiResponse,
  AuthPayload,
  AuthResponse,
  AuthResponseData,
  InstanceData,
  ListInstancesResponse,
  GetInstanceInfoResponse,
  CreateInstancePayload,
  CreateInstanceResponse,
  DeleteInstancePayload,
  DeleteInstanceResponse,
  DisconnectInstancePayload,
  DisconnectInstanceResponse,
  ConnectInstancePayload,
  ConnectQRResponse,
  ConnectQRResponseData,
  SendMessagePayload,
  SendMessageResponse,
  SendMessageResponseData,
  VerifyNumberPayload,
  VerifyNumberResponse,
  VerifyNumberResponseData,
} from './types';

export class BitSafiraApiClient {
  private token: string;
  private baseUrl: string;

  constructor(config: BitSafiraConfig) {
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.bitsafira.com.br';
  }

  private async request<T>(
    method: string,
    endpoint: string,
    payload?: object
  ): Promise<BitSafiraApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Token': this.token,
    };

    const config: RequestInit = {
      method,
      headers,
      redirect: 'follow',
    };

    if (payload) {
      config.body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      // A API BitSafira pode retornar 'mensagem' em vez de 'message' para erros/sucessos
      // E 'dados' para o payload real.
      return {
        status: response.status,
        message: data.message || data.mensagem,
        mensagem: data.mensagem, // Manter ambos para flexibilidade
        error: data.error,
        dados: data.dados || data, // Se 'dados' não existir, o payload completo é o dado
      };
    } catch (error: any) {
      console.error(`BitSafira API Error [${method} ${endpoint}]:`, error);
      return {
        status: 500,
        message: 'Erro de comunicação com a API BitSafira.',
        error: error.message,
      };
    }
  }

  // --- Métodos da API ---

  // Autenticação (se a API tiver um endpoint específico para obter o token)
  async authenticate(payload: AuthPayload): Promise<AuthResponse> {
    return this.request<AuthResponseData>('POST', '/auth', payload);
  }

  // Listar instâncias    test
  async listInstances(): Promise<ListInstancesResponse> {
    return this.request<InstanceData[]>('GET', '/instancias');
  }

  // Obter informações de uma instância específica
  async getInstanceInfo(instanceId: string): Promise<GetInstanceInfoResponse> {
    return this.request<InstanceData>('GET', `/instancia/info?id=${encodeURIComponent(instanceId)}`);
  }

  // Criar uma nova instância
  async createInstance(payload: CreateInstancePayload): Promise<CreateInstanceResponse> {
    return this.request<InstanceData>('POST', '/instancia/salvar', payload);
  }

  // Deletar uma instância
  async deleteInstance(payload: DeleteInstancePayload): Promise<DeleteInstanceResponse> {
    // Documentado: DELETE /instancia/excluir com body { id }
    const main = await this.request<any>('DELETE', '/instancia/excluir', payload);
    if ([200, 201, 204, 404].includes(main.status || 0)) return main;

    // Fallbacks que já vimos em ambientes anteriores
    const tryDelete = await this.request<any>('DELETE', '/instancia/deletar', payload);
    if ([200, 201, 204, 404].includes(tryDelete.status || 0)) return tryDelete;

    const tryPost = await this.request<any>('POST', '/instancia/deletar', payload);
    if ([200, 201, 204, 404].includes(tryPost.status || 0)) return tryPost;

    const tryExcluir = await this.request<any>('POST', '/instancia/excluir', payload);
    return tryExcluir;
  }

  // Conectar/Obter QR Code para uma instância
  async connectInstance(payload: ConnectInstancePayload): Promise<ConnectQRResponse> {
    return this.request<ConnectQRResponseData>('POST', '/instancia/conectar', payload);
  }

  async disconnectInstance(payload: DisconnectInstancePayload): Promise<DisconnectInstanceResponse> {
    return this.request<any>('POST', '/instancia/desconectar', payload);
  }

  // Enviar mensagem
  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    // Endpoint oficial atual
    const primary = await this.request<SendMessageResponseData>('POST', '/disparo/enviar', payload);
    if (primary.status !== 404) return primary;

    // Fallbacks (documentação/versões anteriores)
    const secondary = await this.request<SendMessageResponseData>('POST', '/mensagem/disparar', payload);
    if (secondary.status !== 404) return secondary;

    return this.request<SendMessageResponseData>('POST', '/mensagem/enviar', payload);
  }

  // Verificar número
  async verifyNumber(payload: VerifyNumberPayload): Promise<VerifyNumberResponse> {
    return this.request<VerifyNumberResponseData>('POST', '/numero/verificar', payload);
  }
}

// Função auxiliar para obter o cliente da API BitSafira
export function getBitSafiraApiClient(token?: string): BitSafiraApiClient {
  const finalToken = token || process.env.BITSAFIRA_TOKEN;
  const baseUrl = process.env.BITSAFIRA_BASE_URL;

  if (!finalToken) {
    throw new Error('BITSAFIRA_TOKEN is not defined in environment variables or provided.');
  }
  return new BitSafiraApiClient({ token: finalToken, baseUrl });
}
