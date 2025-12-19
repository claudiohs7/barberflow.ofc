import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import type { DeleteInstancePayload, DeleteInstanceResponse } from "@/lib/bitsafira/types";
import { getBarbershopById, updateBarbershop, deleteBarbershopAndData } from "@/server/db/repositories/barbershops";

export async function deleteBitSafiraInstanceForBarbershop(barbershopId: string) {
  const shop = await getBarbershopById(barbershopId);
  if (!shop) throw new Error("Barbearia não encontrada.");

  const instanceId = shop.bitsafiraInstanceId || null;
  if (!instanceId) {
    return { deleted: false, instanceId: null, message: "Sem instância cadastrada." };
  }

  const bitSafiraToken = shop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
  if (!bitSafiraToken) {
    throw new Error("Token da BitSafira não configurado.");
  }

  const bitSafira = getBitSafiraApiClient(bitSafiraToken);
  const deletePayload: DeleteInstancePayload = { id: instanceId };
  const deleteResult: DeleteInstanceResponse = await bitSafira.deleteInstance(deletePayload);

  // BitSafira às vezes retorna 404 quando já está apagada; tratamos como OK.
  const ok = [200, 201, 204, 404].includes(deleteResult.status || 0);
  if (!ok) {
    throw new Error(deleteResult.mensagem || deleteResult.message || "Falha ao excluir instância BitSafira.");
  }

  await updateBarbershop(barbershopId, {
    bitsafiraInstanceId: null,
    whatsappStatus: "DISCONNECTED",
    qrCodeBase64: null,
    bitsafiraInstanceData: null as any,
  });

  return { deleted: true, instanceId, message: "Instância excluída." };
}

export async function deleteBarbershopFully(
  barbershopId: string,
  options?: { forceBitSafiraFailure?: boolean }
) {
  // First: try to delete BitSafira instance (if any) so we don't orphan instances
  try {
    await deleteBitSafiraInstanceForBarbershop(barbershopId);
  } catch (error: any) {
    if (options?.forceBitSafiraFailure) {
      console.warn("Forçando exclusão mesmo com erro no BitSafira:", error?.message || error);
    } else {
      throw error;
    }
  }

  // Then: wipe all data and the barbershop record
  await deleteBarbershopAndData(barbershopId);
}
