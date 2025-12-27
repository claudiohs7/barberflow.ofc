import prisma from "../client";

export type AdminWhatsappSettings = {
  id: string;
  bitsafiraInstanceId?: string | null;
  bitSafiraToken?: string | null;
  templateContent?: string | null;
  intervalSeconds: number;
  whatsappStatus?: string | null;
  qrCodeBase64?: string | null;
  instanceData?: any;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_INSTANCE = process.env.BITSAFIRA_ADMIN_INSTANCE_ID || process.env.BITSAFIRA_INSTANCE_ID || null;
const DEFAULT_TOKEN = process.env.BITSAFIRA_ADMIN_TOKEN || process.env.BITSAFIRA_TOKEN || null;

type MemorySettings = {
  id: string;
  bitsafiraInstanceId: string | null;
  bitSafiraToken: string | null;
  templateContent: string | null;
  intervalSeconds: number;
  whatsappStatus?: string | null;
  qrCodeBase64?: string | null;
  instanceData?: any;
  createdAt: Date;
  updatedAt: Date;
};

let memorySettings: MemorySettings | null = null;

function getModel() {
  return (prisma as any).adminwhatsapp as
    | {
        findFirst: Function;
        create: Function;
        update: Function;
      }
    | undefined;
}

function ensureMemoryDefaults() {
  if (!memorySettings) {
    const now = new Date();
    memorySettings = {
      id: "admin-whatsapp-memory",
      bitsafiraInstanceId: DEFAULT_INSTANCE,
      bitSafiraToken: DEFAULT_TOKEN,
      templateContent: "",
      intervalSeconds: 10,
      whatsappStatus: "DISCONNECTED",
      qrCodeBase64: null,
      instanceData: undefined,
      createdAt: now,
      updatedAt: now,
    };
  }
  return memorySettings;
}

function shouldFallback(err: any) {
  return err?.code === "P2021" || err?.code === "P2022" || err?.message?.includes("does not exist");
}

async function ensureSingleRow() {
  const model = getModel();

  if (!model) {
    // fallback in memory when migration/table is missing
    return ensureMemoryDefaults();
  }

  try {
    const existing = await model.findFirst();
    if (existing) return existing;

    return model.create({
      data: {
        bitsafiraInstanceId: DEFAULT_INSTANCE,
        bitSafiraToken: DEFAULT_TOKEN,
        templateContent: "",
        intervalSeconds: 10,
      },
    });
  } catch (err: any) {
    if (shouldFallback(err)) {
      return ensureMemoryDefaults();
    }
    throw err;
  }
}

export async function getAdminWhatsappSettings(): Promise<AdminWhatsappSettings> {
  const row = await ensureSingleRow();
  return {
    id: row.id,
    bitsafiraInstanceId: row.bitsafiraInstanceId ?? DEFAULT_INSTANCE,
    bitSafiraToken: row.bitSafiraToken ?? DEFAULT_TOKEN,
    templateContent: row.templateContent ?? "",
    intervalSeconds: row.intervalSeconds ?? 10,
    whatsappStatus: row.whatsappStatus,
    qrCodeBase64: row.qrCodeBase64,
    instanceData:
      typeof row.instanceData === "string"
        ? JSON.parse(row.instanceData)
        : (row as any).instanceData ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateAdminWhatsappSettings(data: Partial<AdminWhatsappSettings>) {
  const row = await ensureSingleRow();
  const model = getModel();

  // If no model, or table missing, keep values in memory to avoid 500
  const updateMemory = () => {
    const mem = ensureMemoryDefaults();
    memorySettings = {
      ...mem,
      bitsafiraInstanceId: data.bitsafiraInstanceId ?? mem.bitsafiraInstanceId ?? DEFAULT_INSTANCE,
      bitSafiraToken: data.bitSafiraToken ?? mem.bitSafiraToken ?? DEFAULT_TOKEN,
      templateContent: data.templateContent ?? mem.templateContent ?? "",
      intervalSeconds: data.intervalSeconds ?? mem.intervalSeconds ?? 10,
      whatsappStatus: data.whatsappStatus ?? mem.whatsappStatus,
      qrCodeBase64: data.qrCodeBase64 ?? mem.qrCodeBase64,
      instanceData: data.instanceData ?? mem.instanceData,
      updatedAt: new Date(),
    };
    return {
      id: memorySettings.id,
      bitsafiraInstanceId: memorySettings.bitsafiraInstanceId,
      bitSafiraToken: memorySettings.bitSafiraToken,
      templateContent: memorySettings.templateContent,
      intervalSeconds: memorySettings.intervalSeconds,
      whatsappStatus: memorySettings.whatsappStatus,
      qrCodeBase64: memorySettings.qrCodeBase64,
      instanceData: memorySettings.instanceData,
      createdAt: memorySettings.createdAt,
      updatedAt: memorySettings.updatedAt,
    };
  };

  if (!model) {
    return updateMemory();
  }

  try {
    const updated = await model.update({
      where: { id: row.id },
      data: {
        bitsafiraInstanceId:
          data.bitsafiraInstanceId ?? data.bitsafiraInstanceId === null ? data.bitsafiraInstanceId : row.bitsafiraInstanceId,
        bitSafiraToken: data.bitSafiraToken ?? data.bitSafiraToken === null ? data.bitSafiraToken : row.bitSafiraToken,
        templateContent: data.templateContent ?? row.templateContent,
        intervalSeconds: data.intervalSeconds ?? row.intervalSeconds,
        whatsappStatus: data.whatsappStatus ?? row.whatsappStatus,
        qrCodeBase64: data.qrCodeBase64 ?? row.qrCodeBase64,
        instanceData: data.instanceData ? JSON.stringify(data.instanceData) : row.instanceData,
      },
    });
    return {
      id: updated.id,
      bitsafiraInstanceId: updated.bitsafiraInstanceId,
      bitSafiraToken: updated.bitSafiraToken,
      templateContent: updated.templateContent,
      intervalSeconds: updated.intervalSeconds,
      whatsappStatus: updated.whatsappStatus,
      qrCodeBase64: updated.qrCodeBase64,
      instanceData: updated.instanceData ? JSON.parse(updated.instanceData) : undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  } catch (err: any) {
    if (shouldFallback(err)) {
      return updateMemory();
    }
    throw err;
  }
}
