// pur-system/src/app/commons/models/domain/mitarbeiter.ts

import { Timestamp } from 'firebase/firestore';

import { IPerson } from './person';

export type TMitarbeiterRolle = 'service' | 'kasse' | 'admin';

// ===== Anwendungs-Typen ====================

export interface IMitarbeiterAuswahl {
  id: string;
  anzeigename: string;
}

export interface IMitarbeiterAuswahlAnfrage {
  unternehmerId: string;
  firmaId: string;
}

export interface IMitarbeiterAnlage {
  person: IPerson;
  rolle: TMitarbeiterRolle;
  filialIds: string[];
}

export interface IMitarbeiterAktualisierung {
  person: IPerson;
  rolle: TMitarbeiterRolle;
  filialIds: string[];
  aktiv: boolean;
}

export interface IMitarbeiterAnlageErgebnis {
  id: string;
}

export interface IMitarbeiterEintrag extends IMitarbeiterAnlage {
  id: string;
  unternehmerId: string;
  firmaId: string;
  aktiv: boolean;
}

// ===== Firestore-Dokumente ==================

export interface IMitarbeiterDokument extends IMitarbeiterAnlage {
  aktiv: boolean;
  benutzerUid?: string;
  erstelltAm?: Timestamp;
  aktualisiertAm?: Timestamp;
}
