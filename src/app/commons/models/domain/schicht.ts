// pur-system/src/app/commons/models/domain/schicht.ts

import { Timestamp } from 'firebase/firestore';

// ===== Anwendungs-Typen ====================

export interface ISchichtZeitdaten {
  beginn: Timestamp;
  ende: Timestamp;
}

interface ISchichtAnlageBasis {
  datum: string;
  mitarbeiterId: string;
}

export interface ISchichtAnlage extends ISchichtAnlageBasis {
  tagesschichtId: string;
}
export type ISchichtAktualisierung = ISchichtAnlage;

export type ISchichtDaten = ISchichtAnlage &
  ISchichtZeitdaten & {
    pauseMinuten?: number;
  };

export type ISchichtEintrag = ISchichtDaten & {
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
};

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

export type ISchichtDokument = ISchichtZeitdaten &
  {
    tagesschichtId: string;
    datum: string;
    mitarbeiterId: string;
    erstelltAm?: Timestamp;
    erstelltVonUid: string;
    aktualisiertAm?: Timestamp;
    aktualisiertVonUid: string;
    pauseMinuten?: number;
  };
