import { addDays, startOfDay } from "date-fns";
import type { Barbershop } from "@/lib/definitions";

const BASIC_PRICE = 49.9;
const PREMIUM_PRICE = 119.9;
const BILLING_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const PREMIUM_PLAN_LABEL = "Premium";

export function isBasicPlan(plan?: string | null) {
  return (plan || "").toLowerCase().startsWith("b");
}

export function calculateUpgradeCost(barbershop: Barbershop) {
  const today = startOfDay(new Date());
  const expiryDate = barbershop.expiryDate ? new Date(barbershop.expiryDate) : null;
  let remainingDays = 0;

  if (expiryDate && expiryDate > today) {
    remainingDays = Math.ceil((expiryDate.getTime() - today.getTime()) / MS_PER_DAY);
    remainingDays = Math.max(0, remainingDays);
  }

  const dailyBasic = BASIC_PRICE / BILLING_DAYS;
  const credit = isBasicPlan(barbershop.plan) ? remainingDays * dailyBasic : 0;
  // Nova regra: cobrar o valor cheio do Premium menos o crédito dos dias restantes do Básico
  const amount = Math.max(0, PREMIUM_PRICE - credit);

  return { amount, credit, remainingDays };
}

export function nextPremiumExpiry(currentExpiry?: Date | string | null) {
  const today = startOfDay(new Date());
  let base = today;
  if (currentExpiry) {
    const parsed = startOfDay(new Date(currentExpiry));
    if (!Number.isNaN(parsed.getTime()) && parsed > today) {
      base = parsed;
    }
  }
  // adiciona +30 dias preservando o saldo de dias se o vencimento atual for maior que hoje
  return addDays(base, BILLING_DAYS);
}

export function resolveWebhookUrl(barbershopId: string) {
  const base =
    process.env.PUSHIN_PAY_WEBHOOK_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const secret = process.env.PUSHIN_PAY_WEBHOOK_SECRET;
  const url = new URL("/api/webhooks/pushinpay", base);
  url.searchParams.set("barbershopId", barbershopId);
  if (secret) {
    url.searchParams.set("secret", secret);
  }
  return url.toString();
}
