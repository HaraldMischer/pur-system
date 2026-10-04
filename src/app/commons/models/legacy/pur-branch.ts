// pur-system/src/app/commons/models/legacy/pur-branch.ts

// ===== Anwendungs-Typen =====================

export interface IPurBranchEintrag {
  id: string;
  purCompanyId: string;
  daten: IPurBranchDokument;
}

// ===== Legacy-Dokumente =====================

export interface IPurBranchAddress {
  city?: string | null;
  postcode?: string | number | null;
  street?: string | null;
}

export interface IPurBranchPhone {
  fax?: string | null;
  fixedLineNumber?: string | null;
  mobile?: string | null;
}

export interface IPurBranchDokument {
  active?: boolean;
  activeDate?: string | null;
  address?: IPurBranchAddress;
  addressName?: string | null;
  appVersion?: string | null;
  branchName?: string | null;
  branchNumber?: number;
  branch_ID?: string | null;
  company_ID?: string | null;
  customer_ID?: string | null;
  email?: string | null;
  module?: unknown;
  phone?: IPurBranchPhone;
}
