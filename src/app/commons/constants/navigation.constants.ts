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

const DIENSTPLAN_ANSICHT_NAVIGATION: INavigationLink = {
  typ: 'link',
  id: 'dienstplanansicht',
  label: 'Dienstplan ansehen',
  icon: 'visibility',
  route: '/schichtplan/ansicht',
  bereich: 'schichtplan',
};

const SCHICHTPLAN_NAVIGATION: INavigationGruppe = {
  typ: 'gruppe',
  id: 'schichtplan',
  label: 'Schichtplan',
  icon: 'calendar_month',
  kinder: [
    DIENSTPLAN_ANSICHT_NAVIGATION,
    {
      typ: 'link',
      id: 'dienstplanplanung',
      label: 'Dienstplan planen',
      icon: 'edit_calendar',
      route: '/schichtplan/planung',
      bereich: 'schichtplan',
    },
    {
      typ: 'link',
      id: 'schichtvorlagen',
      label: 'Schichtvorlagen',
      icon: 'tune',
      route: '/schichtplan/einstellungen',
      bereich: 'schichtplan',
    },
  ],
};

const SCHICHTPLAN_ANSICHT_NAVIGATION: INavigationGruppe = {
  typ: 'gruppe',
  id: 'schichtplan',
  label: 'Schichtplan',
  icon: 'calendar_month',
  kinder: [DIENSTPLAN_ANSICHT_NAVIGATION],
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
      id: 'benutzeranlage',
      label: 'Benutzer anlegen',
      icon: 'person_add',
      route: '/systemverwaltung/benutzer/anlegen',
      bereich: 'systemverwaltung',
    },
    {
      typ: 'link',
      id: 'benutzerverwaltung',
      label: 'Benutzer verwalten',
      icon: 'manage_accounts',
      route: '/systemverwaltung/benutzer/verwalten',
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
    eintraege: [DASHBOARD_NAVIGATION, SCHICHTPLAN_ANSICHT_NAVIGATION, MITARBEITER_NAVIGATION],
  },
  mitarbeiter: {
    darstellung: 'flat',
    eintraege: [DASHBOARD_NAVIGATION, DIENSTPLAN_ANSICHT_NAVIGATION],
  },
} as const satisfies Readonly<Record<TUserRole, IRollenNavigation>>;
