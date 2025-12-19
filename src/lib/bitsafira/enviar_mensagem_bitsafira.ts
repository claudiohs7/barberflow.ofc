// src/lib/bitsafira/enviar_mensagem_bitsafira.ts
import { getBitSafiraApiClient } from './api';
import { SendMessagePayload, SendMessageResponse } from './types';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

async function run() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const token = process.env.BITSAFIRA_TOKEN;
  if (!token) {
    console.error('ERRO: BITSAFIRA_TOKEN não encontrado no .env. Aborting.');
    process.exit(1);
  }
  const bitSafira = getBitSafiraApiClient(token);

  const instanciaId = process.env.BITSAFIRA_INSTANCE_ID;
  if (!instanciaId) {
    console.error('ERRO: BITSAFIRA_INSTANCE_ID não encontrado no .env. Aborting.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const numero = await new Promise<string>((resolve) => {
    rl.question('Insira o número do destinatário (ex: 5511987654321): ', (answer) => {
      resolve((answer || '').trim());
    });
  });

  if (!numero) {
    rl.close();
    console.error('Número do destinatário não informado. Abortando.');
    process.exit(1);
  }

  const mensagem = await new Promise<string>((resolve) => {
    rl.question('Insira a mensagem a ser enviada: ', (answer) => {
      resolve((answer || '').trim());
    });
  });

  if (!mensagem) {
    rl.close();
    console.error('Mensagem não informada. Abortando.');
    process.exit(1);
  }

  const sendPayload: SendMessagePayload = {
    idInstancia: instanciaId,
    whatsapp: numero,
    texto: mensagem,
  };

  try {
    console.log('Payload para enviar mensagem:', sendPayload);
    const response: SendMessageResponse = await bitSafira.sendMessage(sendPayload);

    if (response.status === 200 && response.dados) {
      console.log('Mensagem enviada com sucesso:', response.dados);
    } else {
      console.error('Falha ao enviar mensagem:', response.mensagem || response.message);
    }
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error.message || error);
  } finally {
    rl.close();
  }
}

run();
