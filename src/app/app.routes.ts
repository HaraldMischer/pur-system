import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { bereichGuard } from './guards/bereich.guard';
import { dienstplanPlanungGuard } from './guards/dienstplan-planung.guard';
import { initialisierungGuard } from './guards/initialisierung.guard';
import { masterGuard } from './guards/master.guard';
import { mitarbeiterVerwaltungGuard } from './guards/mitarbeiter-verwaltung.guard';
import { verwaltungGuard } from './guards/verwaltung.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Anmelden',
    data: { layout: 'auth' },
    loadComponent: () => import('./pages/auth/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'initialisierungsfehler',
    title: 'Initialisierungsfehler',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/initialisierungsfehler-page/initialisierungsfehler-page').then(
        (m) => m.InitialisierungsfehlerPage,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    title: 'Dashboard',
    canActivate: [authGuard, initialisierungGuard, bereichGuard],
    data: { bereich: 'dashboard' },
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'schichtplan',
    canActivate: [authGuard, initialisierungGuard, bereichGuard],
    data: { bereich: 'schichtplan' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'ansicht',
      },
      {
        path: 'ansicht',
        title: 'Dienstplan ansehen',
        loadComponent: () =>
          import('./pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page').then(
            (m) => m.DienstplanAnsichtPage,
          ),
      },
      {
        path: 'planung',
        title: 'Dienstplan planen',
        canActivate: [dienstplanPlanungGuard],
        loadComponent: () =>
          import('./pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page').then(
            (m) => m.DienstplanPlanungPage,
          ),
      },
      {
        path: 'einstellungen',
        title: 'Schichtvorlagen',
        canActivate: [dienstplanPlanungGuard],
        loadComponent: () =>
          import('./pages/schichtplan/schichtvorlagen-page/schichtvorlagen-page').then(
            (m) => m.SchichtvorlagenPage,
          ),
      },
    ],
  },
  {
    path: 'mitarbeiter',
    canActivate: [authGuard, initialisierungGuard, bereichGuard],
    data: { bereich: 'mitarbeiter' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'liste',
      },
      {
        path: 'liste',
        title: 'Mitarbeiter',
        canActivate: [mitarbeiterVerwaltungGuard],
        loadComponent: () =>
          import('./pages/mitarbeiter/mitarbeiter-liste-page/mitarbeiter-liste-page').then(
            (m) => m.MitarbeiterListePage,
          ),
      },
    ],
  },
  {
    path: 'passwort',
    title: 'Passwort ändern',
    canActivate: [authGuard, initialisierungGuard],
    loadComponent: () =>
      import('./pages/auth/passwort-page/passwort-page').then((m) => m.PasswortPage),
  },
  {
    path: 'verwaltung',
    title: 'Verwaltung',
    canActivate: [authGuard, initialisierungGuard, bereichGuard, verwaltungGuard],
    data: { bereich: 'verwaltung' },
    loadComponent: () =>
      import('./pages/verwaltung-page/verwaltung-page').then((m) => m.VerwaltungPage),
  },
  {
    path: 'systemverwaltung',
    canActivate: [authGuard, initialisierungGuard, bereichGuard, masterGuard],
    canActivateChild: [authGuard, initialisierungGuard, bereichGuard, masterGuard],
    data: { bereich: 'systemverwaltung' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'datenstruktur',
      },
      {
        path: 'datenstruktur',
        title: 'Datenstruktur anlegen',
        loadComponent: () =>
          import('./pages/systemverwaltung/datenstruktur-page/datenstruktur-page').then(
            (m) => m.DatenstrukturPage,
          ),
      },
      {
        path: 'benutzer',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'verwalten',
          },
          {
            path: 'anlegen',
            title: 'Benutzer anlegen',
            loadComponent: () =>
              import('./pages/systemverwaltung/benutzer-anlegen-page/benutzer-anlegen-page').then(
                (m) => m.BenutzerAnlegenPage,
              ),
          },
          {
            path: 'verwalten',
            title: 'Benutzer verwalten',
            loadComponent: () =>
              import('./pages/systemverwaltung/benutzer-verwalten-page/benutzer-verwalten-page').then(
                (m) => m.BenutzerVerwaltenPage,
              ),
          },
        ],
      },
      {
        path: 'datenmigration',
        title: 'Datenmigration',
        loadComponent: () =>
          import('./pages/systemverwaltung/datenmigration-page/datenmigration-page').then(
            (m) => m.DatenmigrationPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
