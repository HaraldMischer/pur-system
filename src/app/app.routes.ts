// pur-system/src/app/app.routes.ts

import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { bereichGuard } from './guards/bereich.guard';
import { dienstplanPlanungGuard } from './guards/dienstplan-planung.guard';
import { initialisierungGuard } from './guards/initialisierung.guard';
import { masterGuard } from './guards/master.guard';
import { mitarbeiterVerwaltungGuard } from './guards/mitarbeiter-verwaltung.guard';

export const routes: Routes = [
  // ===== Standardweiterleitung =======================
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },

  // ===== Systemzustände ==============================
  {
    path: 'login',
    title: 'Anmelden',
    data: { layout: 'auth' },
    loadComponent: () => import('./pages/zugang/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'passwort',
    title: 'Passwort ändern',
    canActivate: [authGuard, initialisierungGuard],
    loadComponent: () =>
      import('./pages/zugang/passwort-page/passwort-page').then((m) => m.PasswortPage),
  },
  {
    path: 'initialisierungsfehler',
    title: 'Initialisierungsfehler',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/zugang/initialisierungsfehler-page/initialisierungsfehler-page').then(
        (m) => m.InitialisierungsfehlerPage,
      ),
  },

  // ===== Fachbereiche ================================
  {
    path: 'dashboard',
    title: 'Dashboard',
    canActivate: [authGuard, initialisierungGuard, bereichGuard],
    data: { bereich: 'dashboard', pageToolbar: true },
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
        title: 'Dienstplanübersicht',
        loadComponent: () =>
          import('./pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page').then(
            (m) => m.DienstplanAnsichtPage,
          ),
      },
      {
        path: 'planung',
        title: 'Dienstplan bearbeiten',
        canActivate: [dienstplanPlanungGuard],
        data: { pageToolbar: true },
        loadComponent: () =>
          import('./pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page').then(
            (m) => m.DienstplanPlanungPage,
          ),
      },
      {
        path: 'einstellungen',
        title: 'Schichtmodelle',
        canActivate: [dienstplanPlanungGuard],
        loadComponent: () =>
          import('./pages/schichtplan/schichtmodelle-page/schichtmodelle-page').then(
            (m) => m.SchichtmodellePage,
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
    path: 'einstellungen',
    canActivate: [authGuard, initialisierungGuard, bereichGuard],
    canActivateChild: [authGuard, initialisierungGuard, bereichGuard],
    data: { bereich: 'einstellungen' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'oeffnungszeiten',
      },
      {
        path: 'oeffnungszeiten',
        title: 'Öffnungszeiten',
        loadComponent: () =>
          import('./pages/einstellungen/oeffnungszeiten-page/oeffnungszeiten-page').then(
            (m) => m.OeffnungszeitenPage,
          ),
      },
    ],
  },
  {
    path: 'system',
    canActivate: [authGuard, initialisierungGuard, bereichGuard, masterGuard],
    canActivateChild: [authGuard, initialisierungGuard, bereichGuard, masterGuard],
    data: { bereich: 'system' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'struktur/anlegen',
      },
      {
        path: 'struktur',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'anlegen',
          },
          {
            path: 'anlegen',
            title: 'Struktur anlegen',
            loadComponent: () =>
              import('./pages/system/struktur-anlegen-page/struktur-anlegen-page').then(
                (m) => m.StrukturAnlegenPage,
              ),
          },
          {
            path: 'bearbeiten',
            title: 'Struktur verwalten',
            loadComponent: () =>
              import('./pages/system/struktur-verwalten-page/struktur-verwalten-page').then(
                (m) => m.StrukturVerwaltenPage,
              ),
          },
        ],
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
              import('./pages/system/benutzer-anlegen-page/benutzer-anlegen-page').then(
                (m) => m.BenutzerAnlegenPage,
              ),
          },
          {
            path: 'verwalten',
            title: 'Benutzer verwalten',
            loadComponent: () =>
              import('./pages/system/benutzer-verwalten-page/benutzer-verwalten-page').then(
                (m) => m.BenutzerVerwaltenPage,
              ),
          },
        ],
      },
      {
        path: 'datenmigration',
        title: 'Datenmigration',
        loadComponent: () =>
          import('./pages/system/datenmigration-page/datenmigration-page').then(
            (m) => m.DatenmigrationPage,
          ),
      },
    ],
  },

  // ===== Fallback =====================================
  {
    path: '**',
    redirectTo: '',
  },
];
