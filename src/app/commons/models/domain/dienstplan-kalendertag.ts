// pur-system/src/app/commons/models/domain/dienstplan-kalendertag.ts

import type {
  TGesetzlicherFeiertagSchluessel,
  TOeffnungsregel,
  TWochentag,
} from './filialeinstellung';

export type TDienstplanOeffnungsregelQuelle = 'sondertag' | 'sonntag' | 'wochentag';
export type TDienstplanTagesstrukturQuelle =
  'wochentagsvorlage' | 'sonntagsvorlage' | 'freieTagesstruktur' | 'geschlossen';

export interface IDienstplanGesetzlicherFeiertag {
  schluessel: TGesetzlicherFeiertagSchluessel;
  bezeichnung: string;
}

export interface IDienstplanKalenderSondertag {
  id: string;
  bezeichnung: string;
}

export interface IDienstplanKalendertag {
  datum: string;
  wochentag: TWochentag;
  istSonntag: boolean;
  aktiveSondertage: readonly IDienstplanKalenderSondertag[];
  oeffnungsregelQuelle: TDienstplanOeffnungsregelQuelle;
  oeffnungsregel: TOeffnungsregel;
  tagesstrukturQuelle: TDienstplanTagesstrukturQuelle;
  bezeichnung?: string;
  sondertagId?: string;
  gesetzlicherFeiertag?: IDienstplanGesetzlicherFeiertag;
}
