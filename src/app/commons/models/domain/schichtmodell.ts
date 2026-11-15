// pur-system/src/app/commons/models/domain/schichtmodell.ts

import type { Timestamp } from 'firebase/firestore';

import type { TWochentag } from './filialeinstellung';

export type TAbweichenderWochentag = Exclude<TWochentag, 'sonntag'>;
export type TTagesvorlageTyp =
  'wochentag' | 'sonntag' | `wochentag:${TAbweichenderWochentag}` | `sondertag:${string}`;
export type TTagesschichtHerkunft = 'wochentag' | 'sonntag' | 'sondertag';
export type TSchichtZeitgrenzeTag = 'starttag' | 'folgetag';

export interface ISchichtmodellRandzeiten {
  vorbereitungsminuten: number;
  nachbereitungsminuten: number;
}

export interface ISchichtmodellDokument extends ISchichtmodellRandzeiten {
  bezeichnung: string;
  aktiv: boolean;
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface ISchichtmodellEintrag extends ISchichtmodellDokument {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface ITagesvorlagenschichtZeitgrenze {
  lokalzeit: string;
  tag: TSchichtZeitgrenzeTag;
}

export interface ITagesvorlagenschichtDaten {
  vorlage: TTagesvorlageTyp;
  bezeichnung: string;
  reihenfolge: number;
  beginn?: ITagesvorlagenschichtZeitgrenze;
  ende?: ITagesvorlagenschichtZeitgrenze;
  mehrfachbelegungErlaubt: boolean;
}

export interface ITagesvorlagenschichtSchreibdaten extends ITagesvorlagenschichtDaten {
  id?: string;
}

export interface ITagesvorlagenschichtEintrag extends ITagesvorlagenschichtDaten {
  id: string;
  schichtmodellId: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface ISchichtmodellAnlage extends ISchichtmodellRandzeiten {
  bezeichnung: string;
  tagesvorlagenschichten: readonly ITagesvorlagenschichtSchreibdaten[];
}

export interface ISchichtmodellAktualisierung extends ISchichtmodellAnlage {
  aktiv: boolean;
}

export interface ISchichtmodellBestand {
  schichtmodell: ISchichtmodellEintrag;
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

export type TTagesstrukturSchichtSchreibdaten = Omit<ITagesvorlagenschichtSchreibdaten, 'vorlage'> &
  ISchichtmodellRandzeiten & {
    beginn: ITagesvorlagenschichtZeitgrenze;
    ende: ITagesvorlagenschichtZeitgrenze;
  };

export interface ITagesvorlagenschichtDokument extends ITagesvorlagenschichtDaten {}

export interface ITagesschichtDokument extends ITagesschichtDaten {}
