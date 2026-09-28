import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { bereichGuard } from './guards/bereich.guard';
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
    title: 'Schichtplan',
    canActivate: [authGuard, initialisierungGuard, bereichGuard],
    data: { bereich: 'schichtplan' },
    loadComponent: () =>
      import('./pages/schichtplan-page/schichtplan-page').then((m) => m.SchichtplanPage),
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
          import('./pages/mitarbeiter-page/mitarbeiter-liste-page/mitarbeiter-liste-page').then(
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
          import('./pages/systemverwaltung-page/datenstruktur-page/datenstruktur-page').then(
            (m) => m.DatenstrukturPage,
          ),
      },
      {
        path: 'benutzer',
        title: 'Benutzerverwaltung',
        loadComponent: () =>
          import('./pages/systemverwaltung-page/benutzer-page/benutzer-page').then(
            (m) => m.BenutzerPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
