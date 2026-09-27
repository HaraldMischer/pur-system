// pur-system/src/app/commons/models/domain/unternehmer.ts

import { Timestamp } from 'firebase/firestore';
import { IPerson } from './person';

// ===== Anwendungs-Typen ====================
export interface IUnternehmerAnlage {
  anzeigename: string;
  person: IPerson;
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
