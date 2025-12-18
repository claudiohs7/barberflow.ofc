// src/lib/bitsafira/excluir_instancia_bitsafira.ts
import { getBitSafiraApiClient } from './api';
import { DeleteInstancePayload, DeleteInstanceResponse } from './types';
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

  let idToDelete = process.env.BITSAFIRA_INSTANCE_ID;

  if (!idToDelete) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    idToDelete = await new Promise<string>((resolve) => {
      rl.question('BITSAFIRA_INSTANCE_ID não definido. Insira o ID da instância a ser excluída (ou Enter para abortar): ', (answer) => {
        resolve((answer || '').trim());
      });
    });
    rl.close();
  }

  if (!idToDelete) {
    console.error('Nenhuma instância encontrada para exclusão. Defina BITSAFIRA_INSTANCE_ID no .env ou insira o ID.');
    process.exit(1);
  }

  const deletePayload: DeleteInstancePayload = { id: idToDelete };
  console.log('Payload para excluir instância:', deletePayload);

  try {
    const deleteResult: DeleteInstanceResponse = await bitSafira.deleteInstance(deletePayload);
    console.log('Resultado da exclusão da instância:', deleteResult);

    if (deleteResult.status === 200) {
      console.log(`Instância ${idToDelete} excluída com sucesso.`);
      // Opcional: remover BITSAFIRA_INSTANCE_ID do .env após exclusão
      // saveEnvVariable('BITSAFIRA_INSTANCE_ID', ''); // Descomente se quiser limpar o .env
    } else {
      console.error('Falha ao excluir instância:', deleteResult.mensagem || deleteResult.message);
    }

  } catch (error: any) {
    console.error('Erro ao excluir instância:', error.message || error);
  }
}

run();
