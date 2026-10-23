// pur-system/src/app/commons/models/domain/schicht.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export interface ISchichtZeitdaten {
  beginn: Timestamp;
  ende: Timestamp;
}

export interface ISchichtAnlage {
  datum: string;
  mitarbeiterId: string;
  modellschichtId: string;
}

export interface ISchichtAktualisierung extends ISchichtAnlage {}

export interface ISchichtDaten extends ISchichtAnlage, ISchichtZeitdaten {
  pauseMinuten?: number;
}

export interface ISchichtEintrag extends ISchichtDaten {
  id: string;
  dienstplanId: string;
  versionId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface ISchichtPausenaktualisierung {
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
  dienstplanId: string;
  versionId: string;
  schichtId: string;
  pauseMinuten: number;
}

export interface ISchichtSchreibergebnis {
  schicht: ISchichtEintrag;
  versionRevision: number;
  pauseAktualisierungen: readonly ISchichtPausenaktualisierung[];
}

// ===== Firestore-Dokumente ==================

export interface ISchichtDokument extends ISchichtZeitdaten {
  datum: string;
  mitarbeiterId: string;
  modellschichtId: string;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
  pauseMinuten?: number;
}
