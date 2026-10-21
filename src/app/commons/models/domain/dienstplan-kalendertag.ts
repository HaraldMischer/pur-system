// pur-system/src/app/commons/models/domain/dienstplan-kalendertag.ts

import type {
  TGesetzlicherFeiertagSchluessel,
  TOeffnungsregel,
  TWochentag,
} from './filialeinstellung';

export type TDienstplanOeffnungsregelQuelle = 'ausnahme' | 'sondertag' | 'wochentag';

export interface IDienstplanGesetzlicherFeiertag {
  schluessel: TGesetzlicherFeiertagSchluessel;
  bezeichnung: string;
}

export interface IDienstplanKalenderSondertag {
  id: string;
  bezeichnung: string;
}

export interface IDienstplanRasterzeit {
  modellschichtId: string;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
}

export interface IDienstplanKalendertag {
  datum: string;
  wochentag: TWochentag;
  istSonntag: boolean;
  aktiveSondertage: readonly IDienstplanKalenderSondertag[];
  oeffnungsregelQuelle: TDienstplanOeffnungsregelQuelle;
  oeffnungsregel: TOeffnungsregel;
  bezeichnung?: string;
  sondertagId?: string;
  ausnahmeId?: string;
  gesetzlicherFeiertag?: IDienstplanGesetzlicherFeiertag;
  rasterzeiten: readonly IDienstplanRasterzeit[];
}
