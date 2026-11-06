// pur-system/src/app/commons/constants/filialeinstellung.constants.ts

import type { IGeoeffneteOeffnungsregel } from '../models/domain/filialeinstellung';

// ===== Konstanten & Typen ===================

export const STANDARD_OEFFNUNGSREGEL: Readonly<IGeoeffneteOeffnungsregel> = {
  geoeffnet: true,
  beginnLokalzeit: '06:00',
  endeLokalzeit: '01:00',
  endetAmFolgetag: true,
};
