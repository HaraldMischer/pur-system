// pur-system/src/app/app.routes.spec.ts

import { authGuard } from './guards/auth.guard';
import { bereichGuard } from './guards/bereich.guard';
import { dienstplanPlanungGuard } from './guards/dienstplan-planung.guard';
import { initialisierungGuard } from './guards/initialisierung.guard';
import { masterGuard } from './guards/master.guard';
import { mitarbeiterVerwaltungGuard } from './guards/mitarbeiter-verwaltung.guard';
import { routes } from './app.routes';

describe('app routes', () => {
  it('should define titles for all routed pages', () => {
    const expectedTitles = new Map([
      ['login', 'Anmelden'],
      ['initialisierungsfehler', 'Initialisierungsfehler'],
      ['dashboard', 'Dashboard'],
      ['passwort', 'Passwort ändern'],
    ]);

    expectedTitles.forEach((title, path) => {
      expect(routes.find((route) => route.path === path)?.title).toBe(title);
    });
  });

  it('should provide a protected componentless shift plan area with three pages', () => {
    const schichtplanRoute = routes.find((route) => route.path === 'schichtplan');
    const redirectRoute = schichtplanRoute?.children?.find((route) => route.path === '');
    const ansichtRoute = schichtplanRoute?.children?.find((route) => route.path === 'ansicht');
    const planungRoute = schichtplanRoute?.children?.find((route) => route.path === 'planung');
    const einstellungenRoute = schichtplanRoute?.children?.find(
      (route) => route.path === 'einstellungen',
    );

    expect(schichtplanRoute?.canActivate).toEqual([authGuard, initialisierungGuard, bereichGuard]);
    expect(schichtplanRoute?.data?.['bereich']).toBe('schichtplan');
    expect(schichtplanRoute?.loadComponent).toBeUndefined();
    expect(redirectRoute).toEqual({ path: '', pathMatch: 'full', redirectTo: 'ansicht' });
    expect(ansichtRoute?.title).toBe('Dienstplanübersicht');
    expect(ansichtRoute?.loadComponent).toBeDefined();
    expect(planungRoute?.title).toBe('Dienstplan bearbeiten');
    expect(planungRoute?.canActivate).toEqual([dienstplanPlanungGuard]);
    expect(planungRoute?.loadComponent).toBeDefined();
    expect(einstellungenRoute?.title).toBe('Schichtmodelle');
    expect(einstellungenRoute?.canActivate).toEqual([dienstplanPlanungGuard]);
    expect(einstellungenRoute?.loadComponent).toBeDefined();
  });

  it('should provide a protected componentless employee parent and list route', () => {
    const mitarbeiterRoute = routes.find((route) => route.path === 'mitarbeiter');
    const redirectRoute = mitarbeiterRoute?.children?.find((route) => route.path === '');
    const listeRoute = mitarbeiterRoute?.children?.find((route) => route.path === 'liste');

    expect(mitarbeiterRoute?.canActivate).toEqual([authGuard, initialisierungGuard, bereichGuard]);
    expect(mitarbeiterRoute?.data?.['bereich']).toBe('mitarbeiter');
    expect(mitarbeiterRoute?.loadComponent).toBeUndefined();
    expect(redirectRoute).toEqual({ path: '', pathMatch: 'full', redirectTo: 'liste' });
    expect(listeRoute?.title).toBe('Mitarbeiter');
    expect(listeRoute?.canActivate).toEqual([mitarbeiterVerwaltungGuard]);
    expect(listeRoute?.loadComponent).toBeDefined();
  });

  it('should protect the componentless settings area and opening-hours page', () => {
    const einstellungenRoute = routes.find((route) => route.path === 'einstellungen');
    const redirectRoute = einstellungenRoute?.children?.find((route) => route.path === '');
    const oeffnungszeitenRoute = einstellungenRoute?.children?.find(
      (route) => route.path === 'oeffnungszeiten',
    );

    expect(einstellungenRoute?.canActivate).toEqual([
      authGuard,
      initialisierungGuard,
      bereichGuard,
    ]);
    expect(einstellungenRoute?.canActivateChild).toEqual([
      authGuard,
      initialisierungGuard,
      bereichGuard,
    ]);
    expect(einstellungenRoute?.data?.['bereich']).toBe('einstellungen');
    expect(einstellungenRoute?.loadComponent).toBeUndefined();
    expect(redirectRoute).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'oeffnungszeiten',
    });
    expect(oeffnungszeitenRoute?.title).toBe('Öffnungszeiten');
    expect(oeffnungszeitenRoute?.loadComponent).toBeDefined();
  });

  it('should use the auth layout for the login route', () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.data?.['layout']).toBe('auth');
  });

  it('should protect the initialization error route only by authentication', () => {
    const fehlerRoute = routes.find((route) => route.path === 'initialisierungsfehler');

    expect(fehlerRoute?.canActivate).toEqual([authGuard]);
    expect(fehlerRoute?.data?.['layout']).toBeUndefined();
    expect(fehlerRoute?.loadComponent).toBeDefined();
  });

  it('should protect the password route by authentication', () => {
    const passwordRoute = routes.find((route) => route.path === 'passwort');

    expect(passwordRoute).toBeDefined();
    expect(passwordRoute?.canActivate).toEqual([authGuard, initialisierungGuard]);
    expect(passwordRoute?.loadComponent).toBeDefined();
  });

  it('should protect the componentless administration parent by area and master role', () => {
    const systemRoute = routes.find((route) => route.path === 'system');

    expect(systemRoute).toBeDefined();
    expect(systemRoute?.data?.['bereich']).toBe('system');
    expect(systemRoute?.canActivate).toEqual([
      authGuard,
      initialisierungGuard,
      bereichGuard,
      masterGuard,
    ]);
    expect(systemRoute?.canActivateChild).toEqual([
      authGuard,
      initialisierungGuard,
      bereichGuard,
      masterGuard,
    ]);
    expect(systemRoute?.loadComponent).toBeUndefined();
  });

  it('should redirect administration to structure creation', () => {
    const systemRoute = routes.find((route) => route.path === 'system');
    const redirectRoute = systemRoute?.children?.find((route) => route.path === '');

    expect(redirectRoute).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'struktur/anlegen',
    });
  });

  it('should provide separate system administration routes', () => {
    const systemRoute = routes.find((route) => route.path === 'system');
    const strukturRoute = systemRoute?.children?.find((route) => route.path === 'struktur');
    const strukturRedirect = strukturRoute?.children?.find((route) => route.path === '');
    const strukturAnlegenRoute = strukturRoute?.children?.find((route) => route.path === 'anlegen');
    const strukturVerwaltenRoute = strukturRoute?.children?.find(
      (route) => route.path === 'bearbeiten',
    );
    const benutzerRoute = systemRoute?.children?.find((route) => route.path === 'benutzer');
    const benutzerRedirect = benutzerRoute?.children?.find((route) => route.path === '');
    const benutzerAnlegenRoute = benutzerRoute?.children?.find((route) => route.path === 'anlegen');
    const benutzerVerwaltenRoute = benutzerRoute?.children?.find(
      (route) => route.path === 'verwalten',
    );
    const datenmigrationRoute = systemRoute?.children?.find(
      (route) => route.path === 'datenmigration',
    );

    expect(strukturRoute?.loadComponent).toBeUndefined();
    expect(strukturRedirect).toEqual({ path: '', pathMatch: 'full', redirectTo: 'anlegen' });
    expect(strukturAnlegenRoute?.title).toBe('Struktur anlegen');
    expect(strukturAnlegenRoute?.loadComponent).toBeDefined();
    expect(strukturVerwaltenRoute?.title).toBe('Struktur verwalten');
    expect(strukturVerwaltenRoute?.loadComponent).toBeDefined();
    expect(benutzerRoute?.loadComponent).toBeUndefined();
    expect(benutzerRedirect).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'verwalten',
    });
    expect(benutzerAnlegenRoute?.title).toBe('Benutzer anlegen');
    expect(benutzerAnlegenRoute?.loadComponent).toBeDefined();
    expect(benutzerVerwaltenRoute?.title).toBe('Benutzer verwalten');
    expect(benutzerVerwaltenRoute?.loadComponent).toBeDefined();
    expect(datenmigrationRoute?.title).toBe('Datenmigration');
    expect(datenmigrationRoute?.loadComponent).toBeDefined();
  });

  it('should not provide a standalone management route', () => {
    expect(routes.find((route) => route.path === 'verwaltung')).toBeUndefined();
  });
});
