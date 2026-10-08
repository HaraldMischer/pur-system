// pur-system/src/app/commons/constants/navigation.constants.ts

import { INavigationGruppe, INavigationLink, IRollenNavigation } from '../models/app/navigation';
import { TUserRole } from '../models/domain/benutzer';

const DASHBOARD_NAVIGATION: INavigationLink = {
  typ: 'link',
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'dashboard',
  route: '/dashboard',
  bereich: 'dashboard',
};

const SCHICHTPLAN_NAVIGATION: INavigationLink = {
  typ: 'link',
  id: 'schichtplan',
  label: 'Schichtplan',
  icon: 'calendar_month',
  route: '/schichtplan',
  bereich: 'schichtplan',
};

const MITARBEITER_NAVIGATION: INavigationGruppe = {
  typ: 'gruppe',
  id: 'mitarbeiter',
  label: 'Mitarbeiter',
  icon: 'groups',
  kinder: [
    {
      typ: 'link',
      id: 'mitarbeiterliste',
      label: 'Mitarbeiterliste',
      icon: 'badge',
      route: '/mitarbeiter/liste',
      bereich: 'mitarbeiter',
    },
  ],
};

const VERWALTUNG_NAVIGATION: INavigationLink = {
  typ: 'link',
  id: 'verwaltung',
  label: 'Verwaltung',
  icon: 'settings',
  route: '/verwaltung',
  bereich: 'verwaltung',
};

const SYSTEMVERWALTUNG_NAVIGATION: INavigationGruppe = {
  typ: 'gruppe',
  id: 'systemverwaltung',
  label: 'Systemverwaltung',
  icon: 'admin_panel_settings',
  kinder: [
    {
      typ: 'link',
      id: 'benutzerverwaltung',
      label: 'Benutzerverwaltung',
      icon: 'manage_accounts',
      route: '/systemverwaltung/benutzer',
      bereich: 'systemverwaltung',
    },
    {
      typ: 'link',
      id: 'datenstruktur',
      label: 'Datenstruktur',
      icon: 'account_tree',
      route: '/systemverwaltung/datenstruktur',
      bereich: 'systemverwaltung',
    },
    {
      typ: 'link',
      id: 'datenmigration',
      label: 'Datenmigration',
      icon: 'sync_alt',
      route: '/systemverwaltung/datenmigration',
      bereich: 'systemverwaltung',
    },
  ],
};

export const NAVIGATION_NACH_ROLLE = {
  master: {
    darstellung: 'nested',
    eintraege: [
      DASHBOARD_NAVIGATION,
      SCHICHTPLAN_NAVIGATION,
      MITARBEITER_NAVIGATION,
      VERWALTUNG_NAVIGATION,
      SYSTEMVERWALTUNG_NAVIGATION,
    ],
  },
  office: {
    darstellung: 'nested',
    eintraege: [
      DASHBOARD_NAVIGATION,
      SCHICHTPLAN_NAVIGATION,
      MITARBEITER_NAVIGATION,
      VERWALTUNG_NAVIGATION,
    ],
  },
  filiale: {
    darstellung: 'nested',
    eintraege: [DASHBOARD_NAVIGATION, SCHICHTPLAN_NAVIGATION, MITARBEITER_NAVIGATION],
  },
  mitarbeiter: {
    darstellung: 'flat',
    eintraege: [DASHBOARD_NAVIGATION, SCHICHTPLAN_NAVIGATION],
  },
} as const satisfies Readonly<Record<TUserRole, IRollenNavigation>>;
