// pur-system/src/app/commons/models/app/app-kontext.types.ts

import { IFilialeEintrag } from '../domain/filiale';

export type TFilialKontext =
  { readonly typ: 'alle' } | { readonly typ: 'filiale'; readonly filiale: IFilialeEintrag } | null;
