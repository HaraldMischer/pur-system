// pur-system/src/app/commons/utils/firestore/firestore-dokumentwerte.ts

/**
 * Bildet einen unbekannten Wert als einfaches Objekt ab.
 *
 * @param value - Zu prüfender Wert.
 * @returns Der Objektwert oder ein leeres Objekt.
 */
export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Liest und bereinigt einen Stringwert.
 *
 * @param value - Zu prüfender Wert.
 * @param fallback - Rückfallwert für einen fehlenden oder leeren String.
 * @returns Der bereinigte String oder der Rückfallwert.
 */
export function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/**
 * Liest einen optionalen bereinigten Stringwert.
 *
 * @param value - Zu prüfender Wert.
 * @returns Der bereinigte String oder `undefined`.
 */
export function getOptionalString(value: unknown): string | undefined {
  const text = getString(value);
  return text || undefined;
}
