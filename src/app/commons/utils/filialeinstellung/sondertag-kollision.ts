// pur-system/src/app/commons/utils/filialeinstellung/sondertag-kollision.ts

import type {
  IFilialeinstellungSondertagEintrag,
  IJaehrlichFestesDatum,
} from '../../models/domain/filialeinstellung';

export class SondertagDatumskollisionFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SondertagDatumskollisionFehler';
  }
}

/**
 * Prüft einen jährlich festen aktiven Sondertag gegen den vorhandenen Bestand.
 *
 * @param sondertage - Vollständig geladene Sondertage der Filiale.
 * @param ziel - Zu speichernder Aktivstatus und Monatstag.
 * @param ausgenommeneId - ID des gerade bearbeiteten Sondertags.
 * @throws Wenn ein anderer aktiver jährlich fester Sondertag auf denselben Monatstag fällt.
 */
export function assertKeineAktiveSondertagDatumskollision(
  sondertage: readonly IFilialeinstellungSondertagEintrag[],
  ziel: {
    readonly bezeichnung: string;
    readonly aktiv: boolean;
    readonly datumsregel: IJaehrlichFestesDatum;
  },
  ausgenommeneId?: string,
): void {
  if (!ziel.aktiv) return;
  const kollision = sondertage.find((sondertag) => {
    const regel = sondertag.datumsregel;
    return (
      sondertag.id !== ausgenommeneId &&
      sondertag.aktiv &&
      regel.typ === 'jaehrlichFestesDatum' &&
      regel.monat === ziel.datumsregel.monat &&
      regel.tag === ziel.datumsregel.tag
    );
  });
  if (!kollision) return;
  const datum = `${String(ziel.datumsregel.tag).padStart(2, '0')}.${String(ziel.datumsregel.monat).padStart(2, '0')}.`;
  throw new SondertagDatumskollisionFehler(
    `Die aktiven Sondertage „${ziel.bezeichnung.trim()}“ und „${kollision.bezeichnung}“ verwenden beide den ${datum}`,
  );
}
