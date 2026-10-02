// pur-system/src/app/commons/models/legacy/pur-customer.ts

import { EGender } from '../domain/person';

// ===== Anwendungs-Typen =====================

export interface IPurCustomerEintrag {
  id: string;
  anzeigename: string;
  daten: IPurCustomerDokument;
}

// ===== Legacy-Dokumente ======================

export interface IPurCustomerPerson {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  gender?: EGender;
}

export interface IPurCustomerAddress {
  addressName?: string;
  city?: string;
  postcode?: string;
  street?: string;
}

export interface IPurCustomerContact {
  email?: string;
  landline?: string;
  mobile?: string;
}

export interface IPurCustomerDokument {
  _admin_UID?: string;
  displayName?: string;
  firstName?: string;
  id?: string;
  lastName?: string;
  seqNo?: number;
  person?: IPurCustomerPerson;
  address?: IPurCustomerAddress;
  contact?: IPurCustomerContact;
}
