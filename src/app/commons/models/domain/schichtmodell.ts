// pur-system/src/app/commons/models/domain/schichtmodell.ts

import type { Timestamp } from 'firebase/firestore';

import type {
  ISchichtrastermodellDokument,
  ISchichtrastermodellEintrag,
} from './schicht-rastermodell';
import type {
  ISchichttagesmodellDokument,
  ISchichttagesmodellEintrag,
} from './schicht-tagesmodell';

export type TPlanungsart = 'schichtrastermodell' | 'schichttagesmodell';
export type TModellschichtTag = 'starttag' | 'folgetag';

export interface ISchichtmodellDokumentBasis {
  bezeichnung: string;
  aktiv: boolean;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface ISchichtmodellEintragBasis extends ISchichtmodellDokumentBasis {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export type TSchichtmodellEintrag = ISchichtrastermodellEintrag | ISchichttagesmodellEintrag;
export type TSchichtmodellDokument = ISchichtrastermodellDokument | ISchichttagesmodellDokument;

export interface IAltesSchichtrastermodellDokument extends ISchichtmodellDokumentBasis {
  planungsart: 'schichtraster';
}

export * from './schicht-rastermodell';
export * from './schicht-tagesmodell';

// Übergangsaliase für bestehende Rastermodell-Verbraucher.
export type {
  IRastermodellschichtDaten as IModellschichtDaten,
  IRastermodellschichtDokument as IModellschichtDokument,
  IRastermodellschichtEintrag as IModellschichtEintrag,
  IRastermodellschichtMomentaufnahmeDokument as IModellschichtMomentaufnahmeDokument,
  IRastermodellschichtMomentaufnahmeEintrag as IModellschichtMomentaufnahmeEintrag,
  IRastermodellschichtSchreibdaten as IModellschichtSchreibdaten,
  IRastermodellschichtZeitgrenze as IModellschichtZeitgrenze,
} from './schicht-rastermodell';
