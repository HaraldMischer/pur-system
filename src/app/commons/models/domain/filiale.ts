// pur-system/src/app/commons/models/domain/filiale.ts

import { Timestamp } from 'firebase/firestore';

import { IKontakt } from './kontakt';

// ===== Anwendungs-Typen ====================

export interface IFilialeAdresse {
  strasse?: string;
  hausnummer?: string;
  postleitzahl?: string;
  ort?: string;
}

export interface IFilialeAnlage {
  anzeigename: string;
  filialname: string;
  adresse?: IFilialeAdresse;
  kontakt: IKontakt;
}

export interface IFilialeAktualisierung {
  anzeigename: string;
  filialname: string;
  adresse?: IFilialeAdresse;
  kontakt: IKontakt;
}

export interface IFilialeAnlageErgebnis {
  id: string;
  nummer: number;
  anzeigename: string;
}

export interface IFilialeEintrag extends IFilialeAnlage {
  id: string;
  nummer: number;
  aktiv: boolean;
}

// ===== Firestore-Dokumente ==================

export interface IFilialeDokument extends IFilialeAnlage {
  nummer: number;
  aktiv: boolean;
  erstelltAm?: Timestamp;
  aktualisiertAm?: Timestamp;
}
