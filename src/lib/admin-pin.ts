import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// The PIN a dono types to delete a client. Kept as a salted scrypt hash in
// admin_pins, which only the service role can read; checked here and nowhere
// else. After MAX_ATTEMPTS wrong tries in a row the PIN is locked for
// LOCK_MINUTES, which is what makes four digits enough.

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

function hashPin(pin: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

function matches(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(pin, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

type PinRow = { pin_hash: string; failed_attempts: number; locked_until: string | null };

export async function hasPin(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from("admin_pins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** Only when the dono has none yet: a PIN is never overwritten here. */
export async function createPin(admin: SupabaseClient, userId: string, pin: string) {
  const { error } = await admin
    .from("admin_pins")
    .insert({ user_id: userId, pin_hash: hashPin(pin) });
  return error ? error.message : null;
}

/** Null when the PIN is right; otherwise what to tell the dono. */
export async function checkPin(admin: SupabaseClient, userId: string, pin: string) {
  const { data: row } = await admin
    .from("admin_pins")
    .select("pin_hash, failed_attempts, locked_until")
    .eq("user_id", userId)
    .maybeSingle<PinRow>();

  if (!row) return "Você ainda não tem PIN de exclusão.";

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return "PIN bloqueado por tentativas erradas demais. Tente de novo em alguns minutos.";
  }

  if (isValidPin(pin) && matches(pin, row.pin_hash)) {
    if (row.failed_attempts > 0 || row.locked_until) {
      await admin
        .from("admin_pins")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("user_id", userId);
    }
    return null;
  }

  const attempts = row.failed_attempts + 1;
  const locked = attempts >= MAX_ATTEMPTS;
  await admin
    .from("admin_pins")
    .update({
      failed_attempts: locked ? 0 : attempts,
      locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    })
    .eq("user_id", userId);

  return locked
    ? `PIN errado. Exclusão bloqueada por ${LOCK_MINUTES} minutos.`
    : `PIN errado. ${MAX_ATTEMPTS - attempts} tentativa(s) antes do bloqueio.`;
}
