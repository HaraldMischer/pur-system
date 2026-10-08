// pur-system/src/app/commons/models/domain/mitarbeiter.ts

import { Timestamp } from 'firebase/firestore';

import { IPerson } from './person';

export type TMitarbeiterRolle =
  'filialkasse' | 'servicekraft' | 'administrator' | 'kassierer' | 'techniker' | 'dienstplaner';

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
  rollen: TMitarbeiterRolle[];
  filialIds: string[];
  aktiv: boolean;
}

export interface IMitarbeiterAktualisierung {
  person: IPerson;
  rollen: TMitarbeiterRolle[];
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
}

// ===== Firestore-Dokumente ==================

export interface IMitarbeiterDokument extends IMitarbeiterAnlage {
  anzeigename: string;
  benutzerUid?: string;
  erstelltAm?: Timestamp;
  aktualisiertAm?: Timestamp;
}
