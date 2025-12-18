// src/lib/bitsafira/conectaqr_instanciabitsafira.ts
import { getBitSafiraApiClient } from './api';
import { ConnectInstancePayload, ConnectQRResponse } from './types';
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

  const connectPayload: ConnectInstancePayload = { id: instanciaId };
  try {
    const response: ConnectQRResponse = await bitSafira.connectInstance(connectPayload);

    // Detectar QR base64 cedo para evitar imprimir o base64 duas vezes
    let _qrPreview = null;
    try {
      let detectedQr: string | null = null;
      const dadosForDetect = response.dados;
      if (dadosForDetect) {
        detectedQr = dadosForDetect.qrCode || null;
      }
      // CORREÇÃO AQUI: 'response.qrCode' não existe diretamente em ConnectQRResponse, apenas em response.dados.qrCode
      // Remova a linha abaixo se a API BitSafira sempre retorna o QR em response.dados.qrCode
      // if (!detectedQr && response.qrCode) detectedQr = response.qrCode; 

      if (detectedQr) {
        const prefix = detectedQr.match(/^data:image\/(png|jpeg);base64,/i);
        const base64str = prefix ? detectedQr.replace(prefix[0], '') : detectedQr;
        _qrPreview = base64str.substring(0, 200);

        // criar uma cópia sanitizada do objeto de resposta para log sem o base64
        const safe = JSON.parse(JSON.stringify(response));
        if (safe.dados && safe.dados.qrCode) safe.dados.qrCode = `<base64 omitted, length ${base64str.length}>`;
        // CORREÇÃO AQUI: 'safe.qrCode' não existe diretamente em ConnectQRResponse, apenas em safe.dados.qrCode
        // Remova a linha abaixo se a API BitSafira sempre retorna o QR em response.dados.qrCode
        // if (safe.qrCode) safe.qrCode = `<base64 omitted, length ${base64str.length}>`;

        console.log('Resultado (QR base64 omitido):', safe);
      } else {
        console.log('Resultado:', response);
      }
    } catch (e) {
      // fallback: se algo falhar no sanitizing, imprime o resultado inteiro
      console.log('Resultado:', response);
    }

    if (response.status === 401) {
      console.error('ERRO: Token inválido ou expirado.');
      return;
    }

    if (response.dados) {
      console.log('Instância selecionada:', response.dados);

      // detectar QR code em base64 e salvar como imagem (png)
      try {
        let qrBase64: string | null = null;
        const dados = response.dados;
        if (dados) {
          qrBase64 = dados.qrCode || null;
        }
        // CORREÇÃO AQUI: 'response.qrCode' não existe diretamente em ConnectQRResponse, apenas em response.dados.qrCode
        // Remova a linha abaixo se a API BitSafira sempre retorna o QR em response.dados.qrCode
        // if (!qrBase64 && response.qrCode) qrBase64 = response.qrCode;

        if (qrBase64) {
          const prefix = qrBase64.match(/^data:image\/(png|jpeg);base64,/i);
          const base64str = prefix ? qrBase64.replace(prefix[0], '') : qrBase64;
          try {
            const buffer = Buffer.from(base64str, 'base64');
            const outPath = 'qrcode.png';
            fs.writeFileSync(outPath, buffer);
            console.log('QR code em base64 detectado e salvo automaticamente em:', outPath);
            try {
              const { exec } = require('child_process');
              const resolved = path.resolve(process.cwd(), outPath);
              exec(`cmd /c start "" "${resolved.replace(/"/g, '\\"')}"`, { windowsHide: true }, (err: any) => {
                if (err) console.warn('Não foi possível abrir automaticamente o QR (abrir manualmente qrcode.png):', err.message || err);
              });
            } catch (e: any) {
              console.warn('Erro ao tentar abrir a imagem automaticamente:', e.message || e);
            }
          } catch (e: any) {
            console.warn('Falha ao salvar QR code como imagem:', e.message || e);
            const preview = base64str.substring(0, 200);
            console.log('QR code em base64 detectado. Preview (200 chars):', preview + (base64str.length > 200 ? '...' : ''));
            console.log(`Tamanho (bytes base64): ${base64str.length}`);
          }
        } else {
          console.log('Nenhum QR code em base64 encontrado na resposta.');
        }
      } catch (e: any) {
        console.warn('Erro ao processar ou salvar QR code:', e.message || e);
      }

      // tentar extrair id retornado pela API e reter para uso posterior
      let returnedId: string | null = null;
      if (response.dados && response.dados.id) {
        returnedId = response.dados.id;
      }
      // CORREÇÃO AQUI: 'response.id' não existe diretamente em ConnectQRResponse, apenas em response.dados.id
      // Remova a linha abaixo se a API BitSafira sempre retorna o ID em response.dados.id
      // if (!returnedId && response.id) returnedId = response.id; 
      if (returnedId) {
        instanciaId = returnedId;
        console.log('ID retornado pela API:', instanciaId);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => {
          rl.question('Deseja salvar este ID em .env para usos futuros? (s/N): ', (a) => { rl.close(); resolve((a || '').trim().toLowerCase()); });
        });
        if (answer === 's' || answer === 'y') saveEnvVariable('BITSAFIRA_INSTANCE_ID', instanciaId);
      }
    }

  } catch (error: any) {
    console.error('Erro ao conectar instancia:', error);
  }
}

run();
