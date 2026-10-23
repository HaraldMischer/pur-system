// pur-system/src/app/commons/models/domain/filialeinstellung.ts

import { Timestamp } from 'firebase/firestore';

// ===== Konstanten & Typen ===================

export type TBundeslandCode =
  | 'DE-BB'
  | 'DE-BE'
  | 'DE-BW'
  | 'DE-BY'
  | 'DE-HB'
  | 'DE-HE'
  | 'DE-HH'
  | 'DE-MV'
  | 'DE-NI'
  | 'DE-NW'
  | 'DE-RP'
  | 'DE-SH'
  | 'DE-SL'
  | 'DE-SN'
  | 'DE-ST'
  | 'DE-TH';

export const STANDARD_BUNDESLAND: TBundeslandCode = 'DE-NW';

export interface ISchliesszeitraum {
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
}

export type TWochentag =
  'montag' | 'dienstag' | 'mittwoch' | 'donnerstag' | 'freitag' | 'samstag' | 'sonntag';

export type TGesetzlicherFeiertagSchluessel =
  | 'neujahr'
  | 'heiligeDreiKoenige'
  | 'internationalerFrauentag'
  | 'karfreitag'
  | 'ostersonntag'
  | 'ostermontag'
  | 'tagDerArbeit'
  | 'christiHimmelfahrt'
  | 'pfingstsonntag'
  | 'pfingstmontag'
  | 'fronleichnam'
  | 'augsburgerFriedensfest'
  | 'mariaHimmelfahrt'
  | 'weltkindertag'
  | 'tagDerDeutschenEinheit'
  | 'reformationstag'
  | 'allerheiligen'
  | 'bussUndBettag'
  | 'ersterWeihnachtstag'
  | 'zweiterWeihnachtstag'
  | 'aufstand17Juni2028';

// ===== Anwendungs-Typen =====================

export interface IGeschlosseneOeffnungsregel {
  geoeffnet: false;
  beginnLokalzeit?: string;
  endeLokalzeit?: string;
  endetAmFolgetag?: boolean;
}

export interface IGeoeffneteOeffnungsregel {
  geoeffnet: true;
  beginnLokalzeit: string;
  endeLokalzeit: string;
  endetAmFolgetag: boolean;
}

export type TOeffnungsregel = IGeschlosseneOeffnungsregel | IGeoeffneteOeffnungsregel;

export type TWochenoeffnungszeiten = Readonly<Record<TWochentag, TOeffnungsregel>>;

export interface IJaehrlichFestesDatum {
  typ: 'jaehrlichFestesDatum';
  monat: number;
  tag: number;
}

export interface IGesetzlicherFeiertag {
  typ: 'gesetzlicherFeiertag';
  feiertagSchluessel: TGesetzlicherFeiertagSchluessel;
}

export type TDatumsregel = IJaehrlichFestesDatum | IGesetzlicherFeiertag;
export type TSondertagHerkunft = 'system' | 'benutzer';

export interface IFilialeinstellungDokumentMetadaten {
  erstelltAm?: Timestamp;
  erstelltVonUid: string;
  aktualisiertAm?: Timestamp;
  aktualisiertVonUid: string;
}

export interface IFilialeinstellungSondertagVorlage {
  id: string;
  bezeichnung: string;
  aktiv: boolean;
  herkunft: TSondertagHerkunft;
  datumsregel: TDatumsregel;
  oeffnungsregel: TOeffnungsregel;
}

export interface IFilialeinstellungSondertagEintrag extends IFilialeinstellungSondertagDokument {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

export interface IFilialeinstellungAusnahmeEintrag extends IFilialeinstellungAusnahmeDokument {
  id: string;
  unternehmerId: string;
  firmaId: string;
  filialeId: string;
}

// ===== Firestore-Dokumente ==================

export interface IFilialeinstellungAllgemeinDokument extends IFilialeinstellungDokumentMetadaten {
  bundesland: TBundeslandCode;
}

export interface IFilialeinstellungOeffnungszeitenDokument extends IFilialeinstellungDokumentMetadaten {
  schliesszeitraum: ISchliesszeitraum;
  wochenregeln: TWochenoeffnungszeiten;
}

export interface IFilialeinstellungSondertagDokument extends IFilialeinstellungDokumentMetadaten {
  bezeichnung: string;
  aktiv: boolean;
  herkunft: TSondertagHerkunft;
  datumsregel: TDatumsregel;
  oeffnungsregel: TOeffnungsregel;
}

export interface IFilialeinstellungAusnahmeDokument extends IFilialeinstellungDokumentMetadaten {
  datum: string;
  bezeichnung: string;
  oeffnungsregel: TOeffnungsregel;
}
