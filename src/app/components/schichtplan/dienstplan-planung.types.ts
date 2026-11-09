// pur-system/src/app/components/schichtplan/dienstplan-planung.types.ts

import { ISchichtEintrag } from '../../commons/models/domain/schicht';

export type TSchichtplanRasterauswahl = {
  readonly datum: string;
  readonly modellschichtId: string;
};

export type TSchichtplanMitarbeiterAblage = TSchichtplanRasterauswahl & {
  readonly mitarbeiterId: string;
};

export type TSchichtplanVerschiebung = TSchichtplanRasterauswahl & {
  readonly schicht: ISchichtEintrag;
};

export type TSchichtplanTagesschichtauswahl = {
  readonly datum: string;
  readonly tagesschichtId: string;
};

export type TSchichtplanTagesschichtMitarbeiterAblage = TSchichtplanTagesschichtauswahl & {
  readonly mitarbeiterId: string;
};

export type TSchichtplanTagesschichtVerschiebung = TSchichtplanTagesschichtauswahl & {
  readonly schicht: ISchichtEintrag;
};

export type TSchichtplanMehrfachbelegungAblehnung = {
  readonly schichtBezeichnung: string;
};

export type TSchichtplanDragDaten =
  | { readonly art: 'mitarbeiter'; readonly mitarbeiterId: string }
  | { readonly art: 'schicht'; readonly schicht: ISchichtEintrag };
