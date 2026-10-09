// pur-system/src/app/commons/models/domain/schichtvorlage.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export interface ISchichtvorlageAnlage {
  bezeichnung: string;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
  standardpauseMinuten?: number;
}

export interface ISchichtvorlageAktualisierung extends ISchichtvorlageAnlage {
  aktiv: boolean;
}

export interface ISchichtvorlageEintrag extends ISchichtvorlageDokument {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

// ===== Firestore-Dokumente ==================

export interface ISchichtvorlageDokument extends ISchichtvorlageAnlage {
  aktiv: boolean;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}
