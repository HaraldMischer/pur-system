// pur-system/src/app/commons/models/domain/dienstplan.ts

import { Timestamp } from 'firebase/firestore';

import type { IDienstplanKalendertag } from './dienstplan-kalendertag';
import type { ISchichtEintrag } from './schicht';
import type { IModellschichtMomentaufnahmeEintrag, TPlanungsart } from './schichtmodell';
import type { ITagesschichtEintrag } from './schicht-tagesmodell';

export type TDienstplanVersionStatus = 'entwurf' | 'veroeffentlicht' | 'archiviert';

// ===== Anwendungs-Typen ====================

interface IDienstplanSchichtmodellReferenzBasis {
  schichtmodellId: string;
  schichtmodellBezeichnung: string;
}

export interface IDienstplanRastermodellReferenz extends IDienstplanSchichtmodellReferenzBasis {
  planungsart: Extract<TPlanungsart, 'schichtrastermodell'>;
}

export interface IDienstplanTagesmodellReferenz extends IDienstplanSchichtmodellReferenzBasis {
  planungsart: Extract<TPlanungsart, 'schichttagesmodell'>;
}

export type IDienstplanSchichtmodellReferenz =
  IDienstplanRastermodellReferenz | IDienstplanTagesmodellReferenz;

export interface IDienstplanAnlage {
  zeitraumStart: string;
  zeitraumEnde: string;
  zeitzone: string;
}

export type IDienstplanEintrag = IDienstplanDokument & {
  kalendertage: readonly IDienstplanKalendertag[];
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
};

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
  tagesschichten?: readonly ITagesschichtEintrag[];
}

export interface IDienstplanAnlageErgebnis {
  dienstplan: IDienstplanEintrag;
  version: IDienstplanVersionEintrag;
  modellschichten: readonly IModellschichtMomentaufnahmeEintrag[];
  tagesschichten: readonly ITagesschichtEintrag[];
}

export interface IDienstplanVeroeffentlichungErgebnis {
  dienstplan: IDienstplanEintrag;
  veroeffentlichteVersion: IDienstplanVersionEintrag;
  archivierteVersion?: IDienstplanVersionEintrag;
}

export interface IDienstplanEntwurfAnlageErgebnis {
  dienstplan: IDienstplanEintrag;
  version: IDienstplanVersionEintrag;
  schichten: readonly ISchichtEintrag[];
}

// ===== Firestore-Dokumente ==================

export type IDienstplanDokument = IDienstplanAnlage &
  IDienstplanSchichtmodellReferenz & {
    kalendertage: readonly IDienstplanKalendertag[];
    entwurfVersionId?: string;
    veroeffentlichteVersionId?: string;
    naechsteVersionsnummer: number;
    erstelltAm?: Timestamp;
    erstelltVonUid: string;
    aktualisiertAm?: Timestamp;
    aktualisiertVonUid: string;
  };

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
