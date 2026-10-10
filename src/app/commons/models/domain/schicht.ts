// pur-system/src/app/commons/models/domain/schicht.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export interface ISchichtAnlage {
  mitarbeiterId: string;
  schichtvorlageId: string;
  schichtvorlageBezeichnung: string;
  beginn: Timestamp;
  ende: Timestamp;
  pauseMinuten: number;
}

export interface ISchichtAktualisierung {
  mitarbeiterId: string;
  schichtvorlageId: string;
  schichtvorlageBezeichnung: string;
  beginn: Timestamp;
  ende: Timestamp;
  pauseMinuten: number;
}

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
