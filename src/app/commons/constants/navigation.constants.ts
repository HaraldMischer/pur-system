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
  label: 'Dienstplan',
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
      label: 'Bearbeiten',
      icon: 'edit_calendar',
      route: '/schichtplan/planung',
      bereich: 'schichtplan',
    },
    {
      typ: 'link',
      id: 'schichtmodelle',
      label: 'Modelle',
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

const EINSTELLUNGEN_NAVIGATION: INavigationGruppe = {
  typ: 'gruppe',
  id: 'einstellungen',
  label: 'Einstellungen',
  icon: 'settings',
  kinder: [
    {
      typ: 'link',
      id: 'oeffnungszeiten',
      label: 'Öffnungszeiten',
      icon: 'schedule',
      route: '/einstellungen/oeffnungszeiten',
      bereich: 'einstellungen',
    },
  ],
};

const SYSTEM_NAVIGATION: INavigationGruppe = {
  typ: 'gruppe',
  id: 'system',
  label: 'System',
  icon: 'admin_panel_settings',
  kinder: [
    {
      typ: 'link',
      id: 'benutzeranlage',
      label: 'Benutzer anlegen',
      icon: 'person_add',
      route: '/system/benutzer/anlegen',
      bereich: 'system',
    },
    {
      typ: 'link',
      id: 'benutzerverwaltung',
      label: 'Benutzer verwalten',
      icon: 'manage_accounts',
      route: '/system/benutzer/verwalten',
      bereich: 'system',
    },
    {
      typ: 'link',
      id: 'strukturanlage',
      label: 'Struktur anlegen',
      icon: 'account_tree',
      route: '/system/struktur/anlegen',
      bereich: 'system',
    },
    {
      typ: 'link',
      id: 'strukturverwaltung',
      label: 'Struktur verwalten',
      icon: 'edit_note',
      route: '/system/struktur/bearbeiten',
      bereich: 'system',
    },
    {
      typ: 'link',
      id: 'datenmigration',
      label: 'Datenmigration',
      icon: 'sync_alt',
      route: '/system/datenmigration',
      bereich: 'system',
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
      EINSTELLUNGEN_NAVIGATION,
      SYSTEM_NAVIGATION,
    ],
  },
  office: {
    darstellung: 'nested',
    eintraege: [
      DASHBOARD_NAVIGATION,
      SCHICHTPLAN_NAVIGATION,
      MITARBEITER_NAVIGATION,
      EINSTELLUNGEN_NAVIGATION,
    ],
  },
  filiale: {
    darstellung: 'nested',
    eintraege: [
      DASHBOARD_NAVIGATION,
      SCHICHTPLAN_ANSICHT_NAVIGATION,
      MITARBEITER_NAVIGATION,
      EINSTELLUNGEN_NAVIGATION,
    ],
  },
  mitarbeiter: {
    darstellung: 'flat',
    eintraege: [DASHBOARD_NAVIGATION, DIENSTPLAN_ANSICHT_NAVIGATION],
  },
} as const satisfies Readonly<Record<TUserRole, IRollenNavigation>>;
