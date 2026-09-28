// pur-system/src/app/app.routes.spec.ts

import { authGuard } from './guards/auth.guard';
import { bereichGuard } from './guards/bereich.guard';
import { initialisierungGuard } from './guards/initialisierung.guard';
import { masterGuard } from './guards/master.guard';
import { mitarbeiterVerwaltungGuard } from './guards/mitarbeiter-verwaltung.guard';
import { verwaltungGuard } from './guards/verwaltung.guard';
import { routes } from './app.routes';

describe('app routes', () => {
  it('should define titles for all routed pages', () => {
    const expectedTitles = new Map([
      ['login', 'Anmelden'],
      ['initialisierungsfehler', 'Initialisierungsfehler'],
      ['dashboard', 'Dashboard'],
      ['schichtplan', 'Schichtplan'],
      ['passwort', 'Passwort ändern'],
      ['verwaltung', 'Verwaltung'],
    ]);

    expectedTitles.forEach((title, path) => {
      expect(routes.find((route) => route.path === path)?.title).toBe(title);
    });
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
    const systemverwaltungRoute = routes.find((route) => route.path === 'systemverwaltung');

    expect(systemverwaltungRoute).toBeDefined();
    expect(systemverwaltungRoute?.data?.['bereich']).toBe('systemverwaltung');
    expect(systemverwaltungRoute?.canActivate).toEqual([
      authGuard,
      initialisierungGuard,
      bereichGuard,
      masterGuard,
    ]);
    expect(systemverwaltungRoute?.canActivateChild).toEqual([
      authGuard,
      initialisierungGuard,
      bereichGuard,
      masterGuard,
    ]);
    expect(systemverwaltungRoute?.loadComponent).toBeUndefined();
  });

  it('should redirect administration to the data structure route', () => {
    const systemverwaltungRoute = routes.find((route) => route.path === 'systemverwaltung');
    const redirectRoute = systemverwaltungRoute?.children?.find((route) => route.path === '');

    expect(redirectRoute).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'datenstruktur',
    });
  });

  it('should provide separate data structure and user administration routes', () => {
    const systemverwaltungRoute = routes.find((route) => route.path === 'systemverwaltung');
    const datenstrukturRoute = systemverwaltungRoute?.children?.find(
      (route) => route.path === 'datenstruktur',
    );
    const benutzerRoute = systemverwaltungRoute?.children?.find(
      (route) => route.path === 'benutzer',
    );

    expect(datenstrukturRoute?.title).toBe('Datenstruktur anlegen');
    expect(datenstrukturRoute?.loadComponent).toBeDefined();
    expect(benutzerRoute?.title).toBe('Benutzerverwaltung');
    expect(benutzerRoute?.loadComponent).toBeDefined();
  });

  it('should protect the management route by area and allowed roles', () => {
    const verwaltungRoute = routes.find((route) => route.path === 'verwaltung');

    expect(verwaltungRoute).toBeDefined();
    expect(verwaltungRoute?.data?.['bereich']).toBe('verwaltung');
    expect(verwaltungRoute?.canActivate).toEqual([
      authGuard,
      initialisierungGuard,
      bereichGuard,
      verwaltungGuard,
    ]);
    expect(verwaltungRoute?.loadComponent).toBeDefined();
  });
});
