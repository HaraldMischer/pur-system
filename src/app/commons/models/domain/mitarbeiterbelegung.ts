// pur-system/src/app/commons/models/domain/mitarbeiterbelegung.ts

import { Timestamp } from 'firebase/firestore';

import type { TDienstplanVersionStatus } from './dienstplan';

export interface IMitarbeiterbelegungReferenz {
  datum: string;
  mitarbeiterId: string;
  filialeId: string;
  dienstplanId: string;
  versionId: string;
  schichtId: string;
  status: TDienstplanVersionStatus;
  beginn: Timestamp;
  ende: Timestamp;
  pauseMinuten?: number;
}

export interface IMitarbeiterbelegungDokument {
  mitarbeiterId: string;
  datum: string;
  belegungen: readonly IMitarbeiterbelegungReferenz[];
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}
