// pur-system/src/app/commons/models/domain/dienstplan.ts

import { Timestamp } from 'firebase/firestore';

export type TDienstplanVersionStatus = 'entwurf' | 'veroeffentlicht' | 'archiviert';

// ===== Anwendungs-Typen ====================

export interface IDienstplanAnlage {
  zeitraumStart: string;
  zeitraumEnde: string;
  zeitzone: string;
}

export interface IDienstplanEintrag extends IDienstplanAnlage {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IDienstplanVersionEintrag {
  id: string;
  dienstplanId: string;
  nummer: number;
  revision: number;
  status: TDienstplanVersionStatus;
}

// ===== Firestore-Dokumente ==================

export interface IDienstplanDokument extends IDienstplanAnlage {
  entwurfVersionId?: string;
  veroeffentlichteVersionId?: string;
  naechsteVersionsnummer: number;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface IDienstplanVersionDokument {
  nummer: number;
  revision: number;
  status: TDienstplanVersionStatus;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
  veroeffentlichtAm?: Timestamp;
  veroeffentlichtVonUid?: string;
  archiviertAm?: Timestamp;
  archiviertVonUid?: string;
}
