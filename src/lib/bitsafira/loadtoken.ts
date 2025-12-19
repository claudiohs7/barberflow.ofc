// src/lib/bitsafira/loadtoken.ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
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

export async function getTokenInteractive(): Promise<string> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  let token = process.env.BITSAFIRA_TOKEN;
  if (token && token.trim()) return token.trim();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  token = await new Promise<string>((resolve) => {
    rl.question('BITSAFIRA_TOKEN não definido. Insira o token (ou Enter para abortar): ', (answer) => {
      resolve((answer || '').trim());
    });
  });

  if (!token) {
    rl.close();
    console.error('Token não informado. Abortando.');
    process.exit(1);
  }

  const saveAnswer = await new Promise<string>((resolve) => {
    rl.question('Deseja salvar este token em .env para usos futuros? (s/N): ', (ans) => {
      rl.close();
      resolve((ans || '').trim().toLowerCase());
    });
  });

  if (saveAnswer === 's' || saveAnswer === 'y') {
    saveEnvVariable('BITSAFIRA_TOKEN', token);
  }

  return token;
}

// Para permitir que seja executado diretamente via tsx
if (require.main === module) {
  getTokenInteractive().catch(console.error);
}
