// src/lib/bitsafira/autentica_bit_safira.ts
import { getBitSafiraApiClient } from './api';
import { ListInstancesResponse } from './types';
import dotenv from 'dotenv';
import path from 'path';

async function run() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // Carregar .env no início

  try {
    const token = process.env.BITSAFIRA_TOKEN; // Obter token diretamente do .env

    if (!token) {
      console.error('ERRO: BITSAFIRA_TOKEN não encontrado no .env. Por favor, defina-o.');
      process.exit(1);
    }

    const bitSafira = getBitSafiraApiClient(token);

    console.log('Autenticando e listando instâncias...');
    const response: ListInstancesResponse = await bitSafira.listInstances();

    if (response.status === 200 && response.dados) {
      console.log('Instâncias disponíveis:', response.dados);
    } else {
      console.error('Falha ao listar instâncias:', response.mensagem || response.message);
    }
  } catch (error: any) {
    console.error('Erro na autenticação:', error.message || error);
  }
}

run();
