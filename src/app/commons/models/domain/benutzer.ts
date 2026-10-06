// pur-system/src/app/commons/models/domain/benutzer.ts

import { Timestamp } from 'firebase/firestore';
import { TAppBereich } from '../app/app-bereich';

export type TUserRole = 'filiale' | 'office' | 'mitarbeiter' | 'master';
export type TBenutzerZugriffe = Record<string, Record<string, string[]>>;

// ===== Anwendungs-Typen ====================

export interface IBenutzerAnlage {
  namensbestandteil: string;
  anzeigename: string;
  userRole: TUserRole;
  erlaubteBereiche: TAppBereich[];
  zugriffe: TBenutzerZugriffe;
  firmaMitarbeiterId?: string;
  passwort: string;
}

export interface IBenutzerAnlageErgebnis {
  uid: string;
  anmeldename: string;
  email: string;
}

export interface IBenutzerProfilEintrag extends IBenutzerProfilDokument {
  uid: string;
}

export interface IBenutzerProfilAktualisierung {
  anzeigename: string;
  aktiv: boolean;
  erlaubteBereiche: TAppBereich[];
  zugriffe: TBenutzerZugriffe;
}

export interface IBenutzerMitarbeiterZuordnung {
  unternehmerId: string;
  firmaId: string;
  firmaMitarbeiterId: string;
}

// ===== Firestore-Dokumente ==================

export interface IBenutzerProfilDokument {
  email: string;
  anmeldename?: string;
  anzeigename: string;
  aktiv: boolean;
  userRole: TUserRole;
  erlaubteBereiche: TAppBereich[];
  zugriffe: TBenutzerZugriffe;
  firmaMitarbeiterId?: string;
  erstelltAm?: Timestamp;
  aktualisiertAm?: Timestamp;
}
