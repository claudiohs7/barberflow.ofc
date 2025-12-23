import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "error.log");
let isRegistered = false;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function appendLog(message: string) {
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, `${message}\n`, { encoding: "utf8" });
  } catch (err) {
    // Último recurso: registra no console se não conseguir gravar em arquivo
    console.error("Failed to write log file:", err);
  }
}

function logError(type: string, error: any) {
  const timestamp = new Date().toISOString();
  const stack = error?.stack || String(error);
  appendLog(`[${timestamp}] [${type}] ${stack}`);
}

export function register() {
  if (isRegistered) return;
  isRegistered = true;

  process.on("uncaughtException", (err) => logError("uncaughtException", err));
  process.on("unhandledRejection", (reason) => logError("unhandledRejection", reason));
}
