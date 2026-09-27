// pur-system/src/app/commons/models/domain/person.ts

import { IAdresse } from './adresse';
import { IKontakt } from './kontakt';

export interface IPerson {
  vorname: string;
  nachname: string;
  adresse: IAdresse;
  kontakt: IKontakt;
  geburtstag?: string;
  geschlecht?: EGender;
}

export enum EGender {
  DIVERSE = 'divers',
  FEMALE = 'weiblich',
  MALE = 'männlich',
}
