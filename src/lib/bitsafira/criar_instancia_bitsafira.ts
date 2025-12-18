// src/lib/bitsafira/criar_instancia_bitsafira.ts
import { getBitSafiraApiClient } from './api';
import { CreateInstancePayload, CreateInstanceResponse } from './types';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import fs from 'fs'; // Importar fs

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

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const descricao = await new Promise<string>((resolve) => {
    rl.question('Insira a descrição para a nova instância (ex: "Minha Barbearia"): ', (answer) => {
      resolve((answer || '').trim());
    });
  });

  if (!descricao) {
    rl.close();
    console.error('Descrição da instância não informada. Abortando.');
    process.exit(1);
  }

  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/bitsafira/webhook` : 'https://your-default-webhook-url.com/api/bitsafira/webhook';
  console.log(`Usando URL de webhook: ${webhookUrl}`);

  const createPayload: CreateInstancePayload = {
    descricao: descricao,
    urlWebhook: webhookUrl,
  };

  try {
    console.log('Payload para criar instância:', createPayload);
    const response: CreateInstanceResponse = await bitSafira.createInstance(createPayload);

    if (response.status === 200 && response.dados) {
      console.log('Instância criada com sucesso:', response.dados);
      const newInstanceId = response.dados.id;
      if (newInstanceId) {
        console.log('ID da nova instância:', newInstanceId);
        const answer = await new Promise<string>((resolve) => {
          rl.question('Deseja salvar este ID em .env para usos futuros? (s/N): ', (a) => { rl.close(); resolve((a || '').trim().toLowerCase()); });
        });
        if (answer === 's' || answer === 'y') {
          saveEnvVariable('BITSAFIRA_INSTANCE_ID', newInstanceId);
        }
      } else {
        console.error('Falha ao criar instância: Nenhum ID retornado nos dados.');
      }
    } else {
      console.error('Falha ao criar instância:', response.mensagem || response.message);
    }
  } catch (error: any) {
    console.error('Erro ao criar instância:', error.message || error);
  } finally {
    rl.close();
  }
}

run();
