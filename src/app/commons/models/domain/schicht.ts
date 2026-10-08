// pur-system/src/app/commons/models/domain/schicht.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export interface ISchichtAnlage {
  mitarbeiterId: string;
  mitarbeiterAnzeigename: string;
  beginn: Timestamp;
  ende: Timestamp;
  pauseMinuten: number;
}

export interface ISchichtAktualisierung {
  mitarbeiterId: string;
  mitarbeiterAnzeigename: string;
  beginn: Timestamp;
  ende: Timestamp;
  pauseMinuten: number;
}

export interface ISchichtEintrag extends ISchichtAnlage {
  id: string;
  dienstplanId: string;
  versionId: string;
}

// ===== Firestore-Dokumente ==================

export interface ISchichtDokument extends ISchichtAnlage {
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}
