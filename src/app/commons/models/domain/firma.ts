// pur-system/src/app/commons/models/domain/firma.ts

import { Timestamp } from 'firebase/firestore';

import { IKontakt } from './kontakt';

// ===== Anwendungs-Typen ====================

export interface IFirmaAdresse {
  strasse?: string;
  hausnummer?: string;
  postleitzahl?: string;
  ort?: string;
}

export interface IFirmaAnlage {
  anzeigename: string;
  firmenname: string;
  adresse?: IFirmaAdresse;
  kontakt: IKontakt;
}

export interface IFirmaAktualisierung {
  anzeigename: string;
  firmenname: string;
  adresse?: IFirmaAdresse;
  kontakt: IKontakt;
}

export interface IFirmaAnlageErgebnis {
  id: string;
  nummer: number;
  anzeigename: string;
}

export interface IFirmaEintrag extends IFirmaAnlage {
  id: string;
  nummer: number;
  aktiv: boolean;
}

// ===== Firestore-Dokumente ==================

export interface IFirmaDokument extends IFirmaAnlage {
  nummer: number;
  aktiv: boolean;
  erstelltAm?: Timestamp;
  aktualisiertAm?: Timestamp;
}
