// pur-system/src/app/commons/models/app/firestore-pfad.types.ts

export interface IUnternehmerPfad {
  unternehmerId: string;
}

export interface IFirmaPfad extends IUnternehmerPfad {
  firmaId: string;
}

export interface IFilialPfad extends IFirmaPfad {
  filialeId: string;
}

export interface IFilialeinstellungPfad extends IFilialPfad {
  einstellungId: 'allgemein' | 'oeffnungszeiten';
}

export interface IFilialeinstellungSondertagPfad extends IFilialPfad {
  sondertagId: string;
}

export interface IFilialeinstellungAusnahmePfad extends IFilialPfad {
  datum: string;
}

export interface ISchichtmodellPfad extends IFilialPfad {
  schichtmodellId: string;
}

export interface IModellschichtPfad extends ISchichtmodellPfad {
  modellschichtId: string;
}

export interface IDienstplanPfad extends IFilialPfad {
  dienstplanId: string;
}

export interface IDienstplanModellschichtPfad extends IDienstplanPfad {
  modellschichtId: string;
}

export interface IDienstplanVersionPfad extends IDienstplanPfad {
  versionId: string;
}

export interface ISchichtPfad extends IDienstplanVersionPfad {
  schichtId: string;
}
