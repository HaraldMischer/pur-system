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

export interface IDienstplanPfad extends IFilialPfad {
  dienstplanId: string;
}

export interface IDienstplanVersionPfad extends IDienstplanPfad {
  versionId: string;
}

export interface ISchichtPfad extends IDienstplanVersionPfad {
  schichtId: string;
}
