// pur-system/src/app/commons/constants/filialeinstellung.constants.ts

import type { ISchliesszeitraum } from '../models/domain/filialeinstellung';

// ===== Konstanten & Typen ===================

export const STANDARD_SCHLIESSZEITRAUM_NRW: Readonly<ISchliesszeitraum> = {
  beginnLokalzeit: '01:00',
  endeLokalzeit: '06:00',
  endetAmFolgetag: false,
};
