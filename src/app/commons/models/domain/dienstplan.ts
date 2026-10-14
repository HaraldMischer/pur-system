// pur-system/src/app/commons/models/domain/dienstplan.ts

import { Timestamp } from 'firebase/firestore';

import type { ISchichtEintrag } from './schicht';
import type { IModellschichtMomentaufnahmeEintrag } from './schichtmodell';

export type TDienstplanVersionStatus = 'entwurf' | 'veroeffentlicht' | 'archiviert';

// ===== Anwendungs-Typen ====================

export interface IDienstplanSchichtmodellReferenz {
  schichtmodellId: string;
  schichtmodellBezeichnung: string;
}

export interface IDienstplanAnlage {
  zeitraumStart: string;
  zeitraumEnde: string;
  zeitzone: string;
}

export interface IDienstplanEintrag extends IDienstplanDokument {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IDienstplanVersionEintrag extends IDienstplanVersionDokument {
  id: string;
  dienstplanId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IDienstplanBestand {
  dienstplaene: readonly IDienstplanEintrag[];
  versionen: readonly IDienstplanVersionEintrag[];
  schichten: readonly ISchichtEintrag[];
  modellschichten: readonly IModellschichtMomentaufnahmeEintrag[];
}

export interface IDienstplanAnlageErgebnis {
  dienstplan: IDienstplanEintrag;
  version: IDienstplanVersionEintrag;
  modellschichten: readonly IModellschichtMomentaufnahmeEintrag[];
}

export interface IDienstplanModellwechselErgebnis {
  dienstplan: IDienstplanEintrag;
  modellschichten: readonly IModellschichtMomentaufnahmeEintrag[];
  versionRevision: number;
}

// ===== Firestore-Dokumente ==================

export interface IDienstplanDokument extends IDienstplanAnlage, IDienstplanSchichtmodellReferenz {
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
