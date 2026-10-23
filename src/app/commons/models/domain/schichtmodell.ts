// pur-system/src/app/commons/models/domain/schichtmodell.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export type TPlanungsart = 'schichtraster' | 'schichtbausteine';
export type TModellschichtTag = 'starttag' | 'folgetag';

export interface IModellschichtZeitgrenze {
  lokalzeit: string;
  tag: TModellschichtTag;
}

export interface IModellschichtDaten {
  bezeichnung: string;
  reihenfolge: number;
  beginn?: IModellschichtZeitgrenze;
  ende?: IModellschichtZeitgrenze;
  mehrfachbelegungErlaubt: boolean;
  vorbereitungsminuten?: number;
  nachbereitungsminuten?: number;
}

export interface IModellschichtEintrag extends IModellschichtDaten {
  id: string;
  schichtmodellId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IModellschichtSchreibdaten extends IModellschichtDaten {
  id?: string;
}

export interface ISchichtrastermodellAnlage {
  bezeichnung: string;
  modellschichten: readonly IModellschichtSchreibdaten[];
}

export interface ISchichtrastermodellAktualisierung extends ISchichtrastermodellAnlage {
  aktiv: boolean;
}

export interface ISchichtmodellEintragBasis extends ISchichtmodellDokumentBasis {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface ISchichtrastermodellEintrag extends ISchichtmodellEintragBasis {
  planungsart: 'schichtraster';
}

export interface ISchichtbausteinmodellEintrag extends ISchichtmodellEintragBasis {
  planungsart: 'schichtbausteine';
}

export type TSchichtmodellEintrag = ISchichtrastermodellEintrag | ISchichtbausteinmodellEintrag;

export interface ISchichtrastermodellBestand {
  schichtmodell: ISchichtrastermodellEintrag;
  modellschichten: readonly IModellschichtEintrag[];
}

export interface IModellschichtMomentaufnahmeEintrag extends IModellschichtDaten {
  id: string;
  dienstplanId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

// ===== Firestore-Dokumente ==================

export interface IModellschichtDokument extends IModellschichtDaten {}

export interface ISchichtmodellDokumentBasis {
  bezeichnung: string;
  aktiv: boolean;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface ISchichtrastermodellDokument extends ISchichtmodellDokumentBasis {
  planungsart: 'schichtraster';
}

export interface ISchichtbausteinmodellDokument extends ISchichtmodellDokumentBasis {
  planungsart: 'schichtbausteine';
}

export type TSchichtmodellDokument = ISchichtrastermodellDokument | ISchichtbausteinmodellDokument;

export interface IModellschichtMomentaufnahmeDokument extends IModellschichtDaten {}
