// pur-system/src/app/commons/models/legacy/pur-company.ts

// ===== Anwendungs-Typen =====================

export interface IPurCompanyEintrag {
  id: string;
  daten: IPurCompanyDokument;
}

// ===== Legacy-Dokumente =====================

export interface IPurCompanyAddress {
  city?: string | null;
  postcode?: string | number | null;
  street?: string | null;
}

export interface IPurCompanyPhone {
  fax?: string | null;
  fixedLineNumber?: string | null;
  mobile?: string | null;
}

export interface IPurCompanyDokument {
  active?: boolean;
  activeDate?: string | null;
  address?: IPurCompanyAddress;
  addressName?: string | null;
  companyName?: string | null;
  companyNumber?: number;
  company_ID?: string | null;
  email?: string | null;
  phone?: IPurCompanyPhone;
}
