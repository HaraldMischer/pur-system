// pur-system/src/app/commons/models/domain/schicht.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export interface ISchichtZeitdaten {
  beginn: Timestamp;
  ende: Timestamp;
  pauseMinuten: number;
}

export interface ISchichtAnlage extends ISchichtZeitdaten {
  mitarbeiterId: string;
  modellschichtId: string;
}

export interface ISchichtAktualisierung extends ISchichtAnlage {}

export interface ISchichtEintrag extends ISchichtDokument {
  id: string;
  dienstplanId: string;
  versionId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface ISchichtSchreibergebnis {
  schicht: ISchichtEintrag;
  versionRevision: number;
}

// ===== Firestore-Dokumente ==================

export interface ISchichtDokument extends ISchichtAnlage {
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}
