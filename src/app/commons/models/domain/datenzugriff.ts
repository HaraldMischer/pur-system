// pur-system/src/app/commons/models/domain/datenzugriff.ts

export interface IDatenzugriffEintrag {
  id: string;
  anzeigename: string;
}

// Unternehmer-Auswahl
export interface IUnternehmerAuswahl {
  id: string;
  anzeigename: string;
  firmen: readonly IFirmaAuswahl[];
}

// Firmen-Auswahl
export interface IFirmaAuswahl {
  id: string;
  anzeigename: string;
  filialen: readonly IFilialeAuswahl[];
}

// Filial-Auswahl
export interface IFilialeAuswahl {
  id: string;
  anzeigename: string;
}
