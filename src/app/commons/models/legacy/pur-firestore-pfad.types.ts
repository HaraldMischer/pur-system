// pur-system/src/app/commons/models/legacy/pur-firestore-pfad.types.ts

export interface IPurCustomerPfad {
  purCustomerId: string;
}

export interface IPurCompanyPfad extends IPurCustomerPfad {
  purCompanyId: string;
}

export interface IPurBranchPfad extends IPurCompanyPfad {
  purBranchId: string;
}

export interface IPurEmployeePfad extends IPurBranchPfad {
  purEmployeeId: string;
}
