// pur-system/src/app/commons/models/domain/schicht-tagesmodell.ts

import type { Timestamp } from 'firebase/firestore';

import type {
  ISchichtmodellDokumentBasis,
  ISchichtmodellEintragBasis,
  TModellschichtTag,
} from './schichtmodell';

export type TTagesvorlageTyp = 'wochentag' | 'sonntag';
export type TTagesschichtHerkunft = TTagesvorlageTyp | 'sondertag';

export interface ITagesvorlagenschichtZeitgrenze {
  lokalzeit: string;
  tag: TModellschichtTag;
}

export interface ITagesvorlagenschichtDaten {
  vorlage: TTagesvorlageTyp;
  bezeichnung: string;
  reihenfolge: number;
  beginn: ITagesvorlagenschichtZeitgrenze;
  ende: ITagesvorlagenschichtZeitgrenze;
  mehrfachbelegungErlaubt: boolean;
  vorbereitungsminuten: number;
  nachbereitungsminuten: number;
}

export interface ITagesvorlagenschichtSchreibdaten extends ITagesvorlagenschichtDaten {
  id?: string;
}

export interface ITagesvorlagenschichtEintrag extends ITagesvorlagenschichtDaten {
  id: string;
  schichttagesmodellId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface ISchichttagesmodellAnlage {
  bezeichnung: string;
  tagesvorlagenschichten: readonly ITagesvorlagenschichtSchreibdaten[];
}

export interface ISchichttagesmodellAktualisierung extends ISchichttagesmodellAnlage {
  aktiv: boolean;
}

export interface ISchichttagesmodellEintrag extends ISchichtmodellEintragBasis {
  planungsart: 'schichttagesmodell';
}

export interface ISchichttagesmodellBestand {
  schichtmodell: ISchichttagesmodellEintrag;
  tagesvorlagenschichten: readonly ITagesvorlagenschichtEintrag[];
}

export interface ITagesschichtDaten {
  datum: string;
  herkunft: TTagesschichtHerkunft;
  vorlagenschichtId?: string;
  bezeichnung: string;
  reihenfolge: number;
  kernbeginnLokalzeit: string;
  kernendeLokalzeit: string;
  kernbeginnAmFolgetag: boolean;
  kernendeAmFolgetag: boolean;
  beginn: Timestamp;
  ende: Timestamp;
  mehrfachbelegungErlaubt: boolean;
  vorbereitungsminuten: number;
  nachbereitungsminuten: number;
}

export interface ITagesschichtEintrag extends ITagesschichtDaten {
  id: string;
  dienstplanId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IFreieTagesschichtSchreibdaten {
  id?: string;
  datum: string;
  bezeichnung: string;
  reihenfolge: number;
  beginn: ITagesvorlagenschichtZeitgrenze;
  ende: ITagesvorlagenschichtZeitgrenze;
  mehrfachbelegungErlaubt: boolean;
  vorbereitungsminuten: number;
  nachbereitungsminuten: number;
}

export interface ITagesvorlagenschichtDokument extends ITagesvorlagenschichtDaten {}

export interface ISchichttagesmodellDokument extends ISchichtmodellDokumentBasis {
  planungsart: 'schichttagesmodell';
}

export interface ITagesschichtDokument extends ITagesschichtDaten {}
