// pur-system/src/app/commons/models/legacy/pur-employee.ts

// ===== Anwendungs-Typen =====================

export interface IPurEmployeeEintrag {
  id: string;
  purCompanyId: string;
  purBranchId: string;
  daten: IPurEmployeeDokument;
}

// ===== Legacy-Dokumente =====================

export interface IPurEmployeeAddress {
  city?: string | null;
  postcode?: string | number | null;
  street?: string | null;
}

export interface IPurEmployeePhone {
  fax?: string | null;
  fixedLineNumber?: string | null;
  mobile?: string | null;
}

export interface IPurEmployeeDokument {
  active?: boolean | boolean[];
  added?: string | null;
  address?: IPurEmployeeAddress;
  authorisation?: string[];
  basicWage?: number | null;
  birthday?: string | null;
  colorLabel?: string | null;
  deleted?: boolean;
  email?: string | null;
  employee_ID?: string | null;
  firstName?: string | null;
  gender?: string | null;
  holidays?: unknown;
  lastName?: string | null;
  password?: string | null;
  personNum?: number | null;
  phone?: IPurEmployeePhone;
  role?: string | null;
  thumb?: string | null;
  workHours?: unknown;
}
