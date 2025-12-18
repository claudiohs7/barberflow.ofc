// src/lib/bitsafira/consulta_instanciabitsafira.ts
import { getBitSafiraApiClient } from './api';
import { GetInstanceInfoResponse, InstanceData } from './types';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

// Função auxiliar para salvar no .env
function saveEnvVariable(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    let envContents = '';
    if (fs.existsSync(envPath)) {
      envContents = fs.readFileSync(envPath, 'utf8');
      if (new RegExp(`^${key}=`, 'm').test(envContents)) {
        envContents = envContents.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
      } else {
        if (envContents.length && !envContents.endsWith('\n')) envContents += '\n';
        envContents += `${key}=${value}\n`;
      }
    } else {
      envContents = `${key}=${value}\n`;
    }
    fs.writeFileSync(envPath, envContents, { encoding: 'utf8' });
    console.log(`${key} salvo em ${envPath}`);
  } catch (writeErr: any) {
    console.warn(`Não foi possível salvar .env para ${key}:`, writeErr.message);
  }
}

async function run() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const token = process.env.BITSAFIRA_TOKEN;
  if (!token) {
    console.error('ERRO: BITSAFIRA_TOKEN não encontrado no .env. Aborting.');
    process.exit(1);
  }
  const bitSafira = getBitSafiraApiClient(token);

  let instanciaId = process.env.BITSAFIRA_INSTANCE_ID;
  if (!instanciaId) {
    try {
      const listResp = await bitSafira.listInstances();
      if (listResp.status === 200 && listResp.dados && listResp.dados.length > 0) {
        instanciaId = listResp.dados[0].id;
        console.log('Instância selecionada automaticamente (primeira encontrada):', instanciaId);
      }
    } catch (e: any) {
      console.warn('Falha ao listar instâncias automaticamente:', e.message || e);
    }
  }

  if (!instanciaId) {
    console.error('Nenhuma instância encontrada. Defina BITSAFIRA_INSTANCE_ID no .env ou crie uma instância via painel/API.');
    process.exit(1);
  }

  try {
    console.log(`Consultando informações da instância ${instanciaId}...`);
    const response: GetInstanceInfoResponse = await bitSafira.getInstanceInfo(instanciaId);

    if (response.status === 200 && response.dados) {
      console.log('Informações da instância:', response.dados);
    } else {
      console.error('Falha ao consultar instância:', response.mensagem || response.message);
    }

  } catch (error: any) {
    console.error('Erro ao consultar instância:', error.message || error);
  }
}

run();
