// pur-system/src/app/commons/models/domain/schichtmodell.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export interface IModellschichtDaten {
  bezeichnung: string;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
  standardpauseMinuten: number;
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

export interface ISchichtmodellAnlage {
  bezeichnung: string;
  modellschichten: readonly IModellschichtSchreibdaten[];
}

export interface ISchichtmodellAktualisierung extends ISchichtmodellAnlage {
  aktiv: boolean;
}

export interface ISchichtmodellEintrag extends ISchichtmodellDokument {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface ISchichtmodellBestand {
  schichtmodell: ISchichtmodellEintrag;
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

export interface ISchichtmodellDokument {
  bezeichnung: string;
  aktiv: boolean;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface IModellschichtMomentaufnahmeDokument extends IModellschichtDaten {}
