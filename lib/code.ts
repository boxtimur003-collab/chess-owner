// Алфавит из 32 символов без 0/1/I/O → `byte % 32` не даёт перекоса (256 делится на 32 нацело).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % 32]).join('');
}

/** Приводит ввод к коду партии или возвращает null, если формат неверный. */
export function normalizeCode(input: string): string | null {
  const c = input.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{8}$/.test(c) ? c : null;
}
