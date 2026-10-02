// pur-system/src/app/commons/models/domain/unternehmer.ts

import { Timestamp } from 'firebase/firestore';
import { IPerson } from './person';

// ===== Anwendungs-Typen ====================
export interface IUnternehmerAdresse {
  strasse?: string;
  hausnummer?: string;
  postleitzahl?: string;
  ort?: string;
}

export interface IUnternehmerPerson extends Omit<IPerson, 'adresse'> {
  adresse?: IUnternehmerAdresse;
}

export interface IUnternehmerAnlage {
  anzeigename: string;
  person: IUnternehmerPerson;
}

export interface IUnternehmerAnlageErgebnis {
  id: string;
  nummer: number;
  anzeigename: string;
}

export interface IUnternehmerEintrag {
  id: string;
  nummer: number;
  anzeigename: string;
}

// ===== Firestore-Dokumente ==================
export interface IUnternehmerDokument extends IUnternehmerAnlage {
  nummer: number;
  aktiv: boolean;
  erstelltAm?: Timestamp;
  aktualisiertAm?: Timestamp;
}
