// pur-system/src/app/commons/models/domain/datenmigration.ts

import { Timestamp } from 'firebase/firestore';

// ===== Konstanten & Typen ===================

export const DATENMIGRATIONS_BEREICHE = {
  unternehmer: 'unternehmer_v1',
  firmen: 'firmen_v1',
  filialen: 'filialen_v1',
  mitarbeiter: 'mitarbeiter_v1',
} as const;

export type TDatenmigrationsbereich = keyof typeof DATENMIGRATIONS_BEREICHE;
export type TDatenmigrationsstatus = 'inProgress' | 'completed' | 'failed' | 'conflict';
export type TDatenmigrationsproblemTyp = 'fehler' | 'konflikt';

// ===== Anwendungs-Typen =====================

export interface IDatenmigrationsproblem {
  typ: TDatenmigrationsproblemTyp;
  quellPfad: string;
  zielPfad?: string;
  ursache: string;
}

export type TDatenmigrationsstatusMap = Partial<
  Record<TDatenmigrationsbereich, IDatenbereichMigrationDokument>
>;

// ===== Firestore-Dokumente ==================

export interface ISystemmigrationDokument {
  purCustomerId: string;
  unternehmerId: string;
  firmenIds?: Readonly<Record<string, string>>;
  erstelltAm: Timestamp;
  aktualisiertAm: Timestamp;
}

export interface IDatenbereichMigrationDokument {
  datenbereich: TDatenmigrationsbereich;
  version: number;
  status: TDatenmigrationsstatus;
  quellDokumente: number;
  migrierteDokumente: number;
  bereitsMigrierteDokumente: number;
  konflikte: number;
  fehler: number;
  probleme: IDatenmigrationsproblem[];
  gestartetAm: Timestamp;
  abgeschlossenAm: Timestamp | null;
  aktualisiertAm: Timestamp;
}
