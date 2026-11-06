// pur-system/src/app/commons/models/domain/schicht-rastermodell.ts

import type {
  ISchichtmodellDokumentBasis,
  ISchichtmodellEintragBasis,
  TModellschichtTag,
} from './schichtmodell';

export interface IRastermodellschichtZeitgrenze {
  lokalzeit: string;
  tag: TModellschichtTag;
}

export interface IRastermodellschichtDaten {
  bezeichnung: string;
  reihenfolge: number;
  beginn?: IRastermodellschichtZeitgrenze;
  ende?: IRastermodellschichtZeitgrenze;
  mehrfachbelegungErlaubt: boolean;
  vorbereitungsminuten?: number;
  nachbereitungsminuten?: number;
}

export interface IRastermodellschichtEintrag extends IRastermodellschichtDaten {
  id: string;
  schichtmodellId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IRastermodellschichtSchreibdaten extends IRastermodellschichtDaten {
  id?: string;
}

export interface ISchichtrastermodellAnlage {
  bezeichnung: string;
  modellschichten: readonly IRastermodellschichtSchreibdaten[];
}

export interface ISchichtrastermodellAktualisierung extends ISchichtrastermodellAnlage {
  aktiv: boolean;
}

export interface ISchichtrastermodellEintrag extends ISchichtmodellEintragBasis {
  planungsart: 'schichtrastermodell';
}

export interface ISchichtrastermodellBestand {
  schichtmodell: ISchichtrastermodellEintrag;
  modellschichten: readonly IRastermodellschichtEintrag[];
}

export interface IRastermodellschichtMomentaufnahmeEintrag extends IRastermodellschichtDaten {
  id: string;
  dienstplanId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IRastermodellschichtDokument extends IRastermodellschichtDaten {}

export interface ISchichtrastermodellDokument extends ISchichtmodellDokumentBasis {
  planungsart: 'schichtrastermodell';
}

export interface IRastermodellschichtMomentaufnahmeDokument extends IRastermodellschichtDaten {}
