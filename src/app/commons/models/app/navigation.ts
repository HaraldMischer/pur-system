// pur-system/src/app/commons/models/app/navigation.ts

import { TAppBereich } from './app-bereich';

export type TNavigationDarstellung = 'flat' | 'nested';

interface INavigationEintragBasis {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}

export interface INavigationLink extends INavigationEintragBasis {
  readonly typ: 'link';
  readonly route: string;
  readonly bereich: TAppBereich;
}

export interface INavigationGruppe extends INavigationEintragBasis {
  readonly typ: 'gruppe';
  readonly kinder: readonly TNavigationEintrag[];
}

export type TNavigationEintrag = INavigationLink | INavigationGruppe;

export interface IRollenNavigation {
  readonly darstellung: TNavigationDarstellung;
  readonly eintraege: readonly TNavigationEintrag[];
}
