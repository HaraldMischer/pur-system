// pur-system/src/app/commons/utils/dienstplan/schichtmodell-vorlagen.ts

import type {
  IFilialeinstellungOeffnungszeitenDokument,
  IFilialeinstellungSondertagEintrag,
  IGeoeffneteOeffnungsregel,
  TWochentag,
} from '../../models/domain/filialeinstellung';
import type { TAbweichenderWochentag, TTagesvorlageTyp } from '../../models/domain/schichtmodell';
import { getSondertagsmodus } from '../filialeinstellung/oeffnungsregel-aufloesung';

export interface ISchichtmodellVorlage {
  readonly vorlage: TTagesvorlageTyp;
  readonly bezeichnung: string;
  readonly oeffnung: IGeoeffneteOeffnungsregel;
}

const ABWEICHENDE_WOCHENTAGE: readonly TAbweichenderWochentag[] = [
  'montag',
  'dienstag',
  'mittwoch',
  'donnerstag',
  'freitag',
  'samstag',
];

const WOCHENTAG_BEZEICHNUNGEN: Readonly<Record<TWochentag, string>> = {
  montag: 'Montag',
  dienstag: 'Dienstag',
  mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag',
  freitag: 'Freitag',
  samstag: 'Samstag',
  sonntag: 'Sonntag',
};

/**
 * Ermittelt alle für ein Schichtmodell aktuell erforderlichen Tagesvorlagen.
 *
 * Zusätzliche Vorlagen entstehen ausschließlich für geöffnete Regeln mit dem Modus `Abweichend`.
 */
export function createSchichtmodellVorlagen(
  oeffnungszeiten: IFilialeinstellungOeffnungszeitenDokument,
  sondertage: readonly IFilialeinstellungSondertagEintrag[],
): readonly ISchichtmodellVorlage[] {
  const sonntagsregel = oeffnungszeiten.wochenregeln.sonntag;
  if (sonntagsregel.modus === 'geschlossen') {
    throw new Error('Für die Sonntagsvorlage fehlt eine geöffnete Sonntagsregel.');
  }
  const sonntagsoeffnung =
    sonntagsregel.modus === 'abweichend'
      ? sonntagsregel.oeffnungsregel
      : oeffnungszeiten.standardoeffnungsregel;
  const abweichendeWochentage = ABWEICHENDE_WOCHENTAGE.flatMap(
    (wochentag): readonly ISchichtmodellVorlage[] => {
      const regel = oeffnungszeiten.wochenregeln[wochentag];
      if (regel.modus !== 'abweichend') return [];
      return [
        {
          vorlage: `wochentag:${wochentag}`,
          bezeichnung: WOCHENTAG_BEZEICHNUNGEN[wochentag],
          oeffnung: regel.oeffnungsregel,
        },
      ];
    },
  );
  const abweichendeSondertage = sondertage
    .filter((sondertag) => {
      return (
        sondertag.aktiv &&
        getSondertagsmodus(sondertag) === 'abweichend' &&
        sondertag.oeffnungsregel.geoeffnet
      );
    })
    .sort((links, rechts) => {
      return links.bezeichnung.localeCompare(rechts.bezeichnung, 'de');
    })
    .map((sondertag): ISchichtmodellVorlage => {
      if (!sondertag.oeffnungsregel.geoeffnet) {
        throw new Error(`Die abweichende Öffnung für „${sondertag.bezeichnung}“ ist ungültig.`);
      }
      return {
        vorlage: `sondertag:${sondertag.id}`,
        bezeichnung: sondertag.bezeichnung,
        oeffnung: sondertag.oeffnungsregel,
      };
    });
  return [
    {
      vorlage: 'wochentag',
      bezeichnung: 'Wochentagsvorlage',
      oeffnung: oeffnungszeiten.standardoeffnungsregel,
    },
    { vorlage: 'sonntag', bezeichnung: 'Sonntagsvorlage', oeffnung: sonntagsoeffnung },
    ...abweichendeWochentage,
    ...abweichendeSondertage,
  ];
}

/**
 * Liefert die fachliche Herkunft einer konkreten Modellvorlage.
 */
export function getTagesschichtHerkunft(
  vorlage: TTagesvorlageTyp,
): 'wochentag' | 'sonntag' | 'sondertag' {
  if (vorlage === 'sonntag') return 'sonntag';
  if (vorlage.startsWith('sondertag:')) return 'sondertag';
  return 'wochentag';
}
