# LOCAL_SETUP.md — Como rodar o projeto localmente

Guia mínimo para rodar o projeto usando o Firebase Emulator Suite (Firestore/Auth) e o servidor Next.js. Agora inclui MySQL/Prisma.

Requisitos
- Node.js (v18+ recomendado)
- npm ou pnpm
- Firebase CLI (`npm install -g firebase-tools`) ou `npx firebase`
- MySQL rodando localmente (schema `barberflow`)

1) Instalar dependências
```powershell
cd c:\Users\Gedson\Documents\Barbearia\barberflow
npm install
```

2) Variáveis de ambiente
- Copie o exemplo e ajuste valores:
```powershell
copy .env.example .env.local
# Abra .env.local e preencha tokens (MP_ACCESS_TOKEN, BITSAFIRA_TOKEN, etc.) e, sempre que for necessário apontar ao ambiente de homologação, defina também BITSAFIRA_BASE_URL=https://api-hom.bitsafira.com.br (o padrão é https://api.bitsafira.com.br/).
```

Observações:
- Para emuladores locais, deixe `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` e `USE_FIREBASE_EMULATOR=true`.
- Para usar projeto real no GCP, defina `FIREBASE_SERVICE_ACCOUNT_KEY` com a JSON string e desligue flags de emulador.

3) Iniciar Firebase Emulator Suite
```powershell
npx firebase emulators:start --only firestore,auth,hosting
```
Firestore: `localhost:8080` | Auth: `localhost:9099` | UI: `http://localhost:4000`.

4) Iniciar Next.js
```powershell
npm run dev
```

5) Testes básicos
- Abra `http://localhost:3000`.
- Rotas server-side (`src/app/api/*`) vão para o emulador quando as flags estiverem ativas.

6) Configurar MySQL/Prisma (novo)
- Crie/garanta o schema `barberflow` no MySQL local.
- Defina `DATABASE_URL` em `.env.local`, ex.: `DATABASE_URL="mysql://root:senha@localhost:3306/barberflow"`.
- Rode `npm run prisma:generate` após instalar dependências.
- Para criar tabelas ou aplicar alterações recentes: `npm run prisma:migrate:dev -- --name init` e, após puxar atualizações, rode `npx prisma migrate dev --name add_bitsafira_instance_data` para criar a coluna `bitsafiraInstanceData` usada pela integração com o BitSafira (ou `npx prisma db push` se preferir sincronizar sem gerar migrações adicionais).

Notas técnicas
- O cliente web usa o emulador quando `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` (ver `src/firebase/index.ts`).
- O Admin SDK usa `USE_FIREBASE_EMULATOR=true` para apontar para `localhost:8080`.
- Para integrações externas (MercadoPago, BitSafira), use tokens reais ou adapte rotas para mocks.
