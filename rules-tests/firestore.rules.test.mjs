// pur-system/rules-tests/firestore.rules.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

let testEnvironment;

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: 'demo-pur-office',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

test('keeps authenticated access to explicit legacy collections and subcollections', async () => {
  const firestore = testEnvironment.authenticatedContext('legacy-user').firestore();
  const customer = doc(firestore, 'purCustomers/customer-1');
  const machine = doc(firestore, 'purCustomers/customer-1/machines/machine-1');
  const user = doc(firestore, 'purUser/user-1');

  await assertSucceeds(setDoc(customer, { name: 'Customer' }));
  await assertSucceeds(getDoc(customer));
  await assertSucceeds(setDoc(machine, { name: 'Machine' }));
  await assertSucceeds(deleteDoc(machine));
  await assertSucceeds(setDoc(user, { active: true }));
  await assertSucceeds(getDoc(user));
});

test('rejects access by legacy accounts to unspecified collections', async () => {
  const firestore = testEnvironment.authenticatedContext('legacy-user').firestore();

  await assertFails(getDoc(doc(firestore, 'other/doc')));
  await assertFails(setDoc(doc(firestore, 'futureCollection/doc'), { value: true }));
});

test('continues to reject unauthenticated access to legacy collections', async () => {
  const firestore = testEnvironment.unauthenticatedContext().firestore();

  await assertFails(getDoc(doc(firestore, 'purCustomers/customer-1')));
  await assertFails(setDoc(doc(firestore, 'purUser/user-1'), { active: true }));
});

test('allows a user to read only the own Pur Office profile', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'benutzerprofil/user-1'), { uid: 'user-1' });
    await setDoc(doc(context.firestore(), 'benutzerprofil/user-2'), { uid: 'user-2' });
  });

  const firestore = testEnvironment.authenticatedContext('user-1').firestore();
  const ownProfile = await assertSucceeds(getDoc(doc(firestore, 'benutzerprofil/user-1')));

  assert.equal(ownProfile.data()?.['uid'], 'user-1');
  await assertFails(getDoc(doc(firestore, 'benutzerprofil/user-2')));
  await assertFails(getDocs(collection(firestore, 'benutzerprofil')));
});

test('rejects all client writes to Pur Office profiles', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'benutzerprofil/user-1'), {
      uid: 'user-1',
      userRole: 'filiale',
    });
  });

  const firestore = testEnvironment.authenticatedContext('user-1').firestore();

  await assertFails(
    setDoc(doc(firestore, 'benutzerprofil/user-1'), { userRole: 'master' }, { merge: true }),
  );
  await assertFails(setDoc(doc(firestore, 'benutzerprofil/new-user'), { uid: 'new-user' }));
  await assertFails(deleteDoc(doc(firestore, 'benutzerprofil/user-1')));
});

const zugriffe = { 'u-1': { 'f-1': ['b-1'] } };
const unternehmerPath = 'unternehmer/u-1';
const firmaPath = `${unternehmerPath}/firma/f-1`;
const filialePath = `${firmaPath}/filiale/b-1`;
const mitarbeiterPath = `${firmaPath}/mitarbeiter/m-1`;
const andererMitarbeiterPath = `${firmaPath}/mitarbeiter/m-2`;
const nichtZugeordneteFirmaPath = `${unternehmerPath}/firma/f-2`;
const nichtZugeordneterMitarbeiterPath = `${nichtZugeordneteFirmaPath}/mitarbeiter/m-3`;
const nichtZugeordneteFilialePath = `${firmaPath}/filiale/b-2`;
const legacyBranchPath = 'purCustomers/u-1/company/f-1/branches/b-1';

async function seedProfile(userRole, overrides = {}) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'benutzerprofil/scoped'), {
      aktiv: true,
      userRole,
      erlaubteBereiche: userRole === 'master' ? ['dashboard', 'systemverwaltung'] : ['dashboard'],
      zugriffe,
      ...overrides,
    });
    for (const path of [
      unternehmerPath,
      firmaPath,
      filialePath,
      `${filialePath}/mitarbeiter/m-1`,
      mitarbeiterPath,
      andererMitarbeiterPath,
      nichtZugeordneterMitarbeiterPath,
      nichtZugeordneteFirmaPath,
      nichtZugeordneteFilialePath,
      'unternehmer/u-2/firma/f-1/filiale/b-1',
      legacyBranchPath,
      'purUser/old',
      'other/doc',
      'benutzerprofil/other/private/doc',
    ]) {
      await setDoc(doc(db, path), { name: path });
    }
    for (const path of [
      mitarbeiterPath,
      andererMitarbeiterPath,
      nichtZugeordneterMitarbeiterPath,
    ]) {
      await setDoc(doc(db, path), {
        person: {
          vorname: 'Mia',
          nachname: 'Muster',
          adresse: { strasse: 'Weg', hausnummer: '1', postleitzahl: '12345', ort: 'Ort' },
          kontakt: {},
        },
        rollen: ['servicekraft'],
        filialIds: ['b-1'],
        aktiv: true,
      });
    }
    await setDoc(doc(db, 'benutzerprofil/other'), {
      anzeigename: 'Other',
      aktiv: true,
      userRole: 'office',
      erlaubteBereiche: ['dashboard'],
      zugriffe,
    });
  });
  return testEnvironment.authenticatedContext('scoped').firestore();
}

test('active master reads permitted collections and legacy customers without legacy write access', async () => {
  const db = await seedProfile('master', { zugriffe: [] });
  for (const path of [
    filialePath,
    `${filialePath}/mitarbeiter/m-1`,
    'benutzerprofil/other',
    'benutzerprofil/other/private/doc',
    legacyBranchPath,
  ]) {
    await assertSucceeds(getDoc(doc(db, path)));
  }
  for (const path of ['benutzerprofil', 'unternehmer', `${firmaPath}/filiale`, 'purCustomers']) {
    await assertSucceeds(getDocs(collection(db, path)));
  }
  for (const path of ['purUser/old', 'other/doc']) {
    await assertFails(getDoc(doc(db, path)));
  }
  await assertFails(getDocs(collection(db, 'purUser')));
  await assertFails(setDoc(doc(db, legacyBranchPath), { name: 'Geändert' }, { merge: true }));
  await assertFails(deleteDoc(doc(db, legacyBranchPath)));
});

test('active master reads and writes migration status without delete access', async () => {
  const db = await seedProfile('master', { zugriffe: [] });
  const systemmigration = doc(db, 'systemMigrationen/u-1');
  const datenbereich = doc(db, 'systemMigrationen/u-1/datenbereiche/unternehmer_v1');

  await assertSucceeds(
    setDoc(systemmigration, {
      purCustomerId: 'u-1',
      unternehmerId: 'u-1',
      erstelltAm: serverTimestamp(),
      aktualisiertAm: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(datenbereich, {
      datenbereich: 'unternehmer',
      version: 1,
      status: 'inProgress',
      quellDokumente: 1,
      migrierteDokumente: 0,
      bereitsMigrierteDokumente: 0,
      konflikte: 0,
      fehler: 0,
      probleme: [],
      gestartetAm: serverTimestamp(),
      abgeschlossenAm: null,
      aktualisiertAm: serverTimestamp(),
    }),
  );
  await assertSucceeds(getDoc(systemmigration));
  await assertSucceeds(getDocs(collection(db, 'systemMigrationen/u-1/datenbereiche')));
  await assertSucceeds(setDoc(datenbereich, { status: 'completed' }, { merge: true }));
  await assertFails(deleteDoc(systemmigration));
  await assertFails(deleteDoc(datenbereich));
});

for (const role of ['office', 'filiale', 'mitarbeiter']) {
  test(`${role} cannot access migration status`, async () => {
    const db = await seedProfile(role);
    const systemmigration = doc(db, 'systemMigrationen/u-1');
    const datenbereich = doc(db, 'systemMigrationen/u-1/datenbereiche/unternehmer_v1');

    await assertFails(getDoc(systemmigration));
    await assertFails(getDoc(datenbereich));
    await assertFails(setDoc(systemmigration, { purCustomerId: 'u-1' }));
    await assertFails(setDoc(datenbereich, { status: 'completed' }));
  });
}

test('inactive master cannot access migration status', async () => {
  const db = await seedProfile('master', { aktiv: false });
  const systemmigration = doc(db, 'systemMigrationen/u-1');
  const datenbereich = doc(db, 'systemMigrationen/u-1/datenbereiche/unternehmer_v1');

  await assertFails(getDoc(systemmigration));
  await assertFails(getDoc(datenbereich));
  await assertFails(setDoc(systemmigration, { purCustomerId: 'u-1' }));
  await assertFails(setDoc(datenbereich, { status: 'completed' }));
});

test('legacy and unauthenticated accounts cannot access migration status', async () => {
  for (const db of [
    testEnvironment.authenticatedContext('legacy').firestore(),
    testEnvironment.unauthenticatedContext().firestore(),
  ]) {
    const systemmigration = doc(db, 'systemMigrationen/u-1');
    const datenbereich = doc(db, 'systemMigrationen/u-1/datenbereiche/unternehmer_v1');

    await assertFails(getDoc(systemmigration));
    await assertFails(getDoc(datenbereich));
    await assertFails(setDoc(systemmigration, { purCustomerId: 'u-1' }));
    await assertFails(setDoc(datenbereich, { status: 'completed' }));
  }
});

for (const role of ['office', 'filiale']) {
  test(`${role} reads only assigned hierarchy, including branch descendants`, async () => {
    const db = await seedProfile(role);
    for (const path of [
      unternehmerPath,
      firmaPath,
      filialePath,
      `${filialePath}/mitarbeiter/m-1`,
    ]) {
      await assertSucceeds(getDoc(doc(db, path)));
    }
    await assertSucceeds(getDocs(collection(db, `${filialePath}/mitarbeiter`)));
    await assertSucceeds(getDoc(doc(db, 'benutzerprofil/scoped')));
    for (const path of [
      `${firmaPath}/filiale/b-2`,
      'unternehmer/u-2',
      'unternehmer/u-2/firma/f-1/filiale/b-1',
      'unternehmer/u-1/firma/f-2',
      `${firmaPath}/private/doc`,
      `${unternehmerPath}/private/doc`,
      legacyBranchPath,
      'purUser/old',
      'other/doc',
      'benutzerprofil/other',
      'benutzerprofil/other/private/doc',
    ]) {
      await assertFails(getDoc(doc(db, path)));
    }
    await assertFails(getDocs(collection(db, 'benutzerprofil')));
    await assertFails(getDocs(collection(db, 'unternehmer')));
    await assertFails(getDocs(collection(db, `${firmaPath}/filiale`)));
  });

  test(`${role} has no business access with empty scopes`, async () => {
    const db = await seedProfile(role, { zugriffe: {} });
    for (const path of [unternehmerPath, firmaPath, filialePath]) {
      await assertFails(getDoc(doc(db, path)));
    }
  });
}

test('active employee account reads direct company data only within the assigned company', async () => {
  const db = await seedProfile('mitarbeiter', {
    erlaubteBereiche: ['dashboard', 'schichtplan'],
    zugriffe: { 'u-1': { 'f-1': [] } },
    firmaMitarbeiterId: 'm-1',
  });

  await assertSucceeds(getDoc(doc(db, 'benutzerprofil/scoped')));
  await assertSucceeds(getDoc(doc(db, unternehmerPath)));
  await assertSucceeds(getDoc(doc(db, firmaPath)));
  await assertSucceeds(getDoc(doc(db, filialePath)));
  await assertSucceeds(getDoc(doc(db, nichtZugeordneteFilialePath)));
  await assertSucceeds(getDocs(collection(db, `${firmaPath}/filiale`)));
  await assertSucceeds(getDoc(doc(db, mitarbeiterPath)));
  await assertSucceeds(getDoc(doc(db, andererMitarbeiterPath)));
  await assertSucceeds(getDocs(collection(db, `${firmaPath}/mitarbeiter`)));
  for (const path of [
    nichtZugeordneteFirmaPath,
    'unternehmer/u-2/firma/f-1/filiale/b-1',
    `${filialePath}/mitarbeiter/m-1`,
    legacyBranchPath,
    'other/doc',
  ]) {
    await assertFails(getDoc(doc(db, path)));
  }
  await assertFails(getDoc(doc(db, nichtZugeordneterMitarbeiterPath)));
  await assertFails(getDocs(collection(db, `${nichtZugeordneteFirmaPath}/mitarbeiter`)));
  await assertFails(
    setDoc(doc(db, mitarbeiterPath), { rollen: ['administrator'] }, { merge: true }),
  );
  await assertFails(getDoc(doc(db, 'benutzerprofil/other')));
  await assertFails(getDocs(collection(db, 'unternehmer')));
});

for (const role of ['office', 'filiale']) {
  test(`${role} reads company employees and writes only allowed branch assignments`, async () => {
    const db = await seedProfile(role, {
      erlaubteBereiche: ['dashboard', 'mitarbeiter'],
    });
    const neuerMitarbeiter = doc(db, `${firmaPath}/mitarbeiter/neu`);

    await assertSucceeds(getDoc(doc(db, mitarbeiterPath)));
    if (role === 'filiale') {
      await assertSucceeds(getDocs(collection(db, `${firmaPath}/mitarbeiter`)));
      await assertSucceeds(
        getDocs(
          query(
            collection(db, `${firmaPath}/mitarbeiter`),
            where('filialIds', 'array-contains', 'b-1'),
          ),
        ),
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(db, `${firmaPath}/mitarbeiter`),
            where('filialIds', 'array-contains', 'b-2'),
          ),
        ),
      );
    } else {
      await assertSucceeds(getDocs(collection(db, `${firmaPath}/mitarbeiter`)));
    }
    await assertSucceeds(
      setDoc(neuerMitarbeiter, {
        person: {
          vorname: 'Neu',
          nachname: 'Mitarbeiter',
          adresse: { strasse: 'Weg', hausnummer: '2', postleitzahl: '12345', ort: 'Ort' },
          kontakt: {},
        },
        rollen: ['filialkasse', 'kassierer'],
        filialIds: role === 'filiale' ? ['b-1'] : [],
        aktiv: true,
        erstelltAm: serverTimestamp(),
        aktualisiertAm: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, `${firmaPath}/mitarbeiter/neu-inaktiv`), {
        person: {},
        rollen: ['servicekraft'],
        filialIds: role === 'filiale' ? ['b-1'] : [],
        aktiv: false,
        erstelltAm: serverTimestamp(),
        aktualisiertAm: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(db, `${firmaPath}/mitarbeiter/neu-inaktiv`)));
    await assertSucceeds(
      setDoc(
        doc(db, mitarbeiterPath),
        {
          rollen: ['administrator', 'techniker'],
          filialIds: ['b-1'],
          aktualisiertAm: serverTimestamp(),
        },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(
        doc(db, mitarbeiterPath),
        { rollen: ['unbekannt'], aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(
        doc(db, mitarbeiterPath),
        { rollen: [], aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(db, mitarbeiterPath),
        { anzeigename: 'Mia Muster', aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(db, mitarbeiterPath),
        { aktiv: false, aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(db, mitarbeiterPath),
        { aktiv: true, aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(
        doc(db, mitarbeiterPath),
        { filialIds: ['b-2'], aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(
        doc(db, mitarbeiterPath),
        { filialIds: ['b-1', 'b-1'], aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), mitarbeiterPath),
        { filialIds: ['b-1', 'b-2'] },
        { merge: true },
      );
    });
    const fremdeFilialeBehalten = setDoc(
      doc(db, mitarbeiterPath),
      {
        rollen: ['filialkasse'],
        filialIds: ['b-2'],
        aktualisiertAm: serverTimestamp(),
      },
      { merge: true },
    );
    if (role === 'office') {
      await assertSucceeds(fremdeFilialeBehalten);
    } else {
      await assertFails(fremdeFilialeBehalten);
    }
    await assertFails(
      setDoc(
        doc(db, mitarbeiterPath),
        { filialIds: [], aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(
        doc(db, mitarbeiterPath),
        { filialIds: ['b-2', 'b-3'], aktualisiertAm: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertFails(deleteDoc(doc(db, mitarbeiterPath)));
  });

  test(`${role} retains employee rights without the employee area`, async () => {
    const db = await seedProfile(role);

    await assertSucceeds(getDoc(doc(db, mitarbeiterPath)));
    await assertSucceeds(
      setDoc(doc(db, `${firmaPath}/mitarbeiter/neu`), {
        person: {},
        rollen: ['servicekraft'],
        filialIds: role === 'filiale' ? ['b-1'] : [],
        aktiv: true,
        erstelltAm: serverTimestamp(),
        aktualisiertAm: serverTimestamp(),
      }),
    );
  });
}

test('active master manages company employees without the employee area', async () => {
  const db = await seedProfile('master');

  await assertSucceeds(getDoc(doc(db, mitarbeiterPath)));
  await assertSucceeds(getDocs(collection(db, `${firmaPath}/mitarbeiter`)));
  await assertSucceeds(
    setDoc(doc(db, `${firmaPath}/mitarbeiter/neu`), {
      person: {},
      rollen: ['servicekraft'],
      filialIds: [],
      aktiv: true,
      erstelltAm: serverTimestamp(),
      aktualisiertAm: serverTimestamp(),
    }),
  );
  await assertSucceeds(deleteDoc(doc(db, mitarbeiterPath)));
});

test('active master manages all company employees with the employee area', async () => {
  const db = await seedProfile('master', {
    erlaubteBereiche: ['dashboard', 'mitarbeiter', 'systemverwaltung'],
    zugriffe: {},
  });
  const neuerMitarbeiter = doc(db, `${firmaPath}/mitarbeiter/neu`);

  await assertSucceeds(getDoc(doc(db, mitarbeiterPath)));
  await assertSucceeds(getDocs(collection(db, `${firmaPath}/mitarbeiter`)));
  await assertSucceeds(
    setDoc(neuerMitarbeiter, {
      person: {},
      rollen: ['servicekraft'],
      filialIds: ['b-1'],
      aktiv: true,
      erstelltAm: serverTimestamp(),
      aktualisiertAm: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, `${firmaPath}/mitarbeiter/neu-inaktiv`), {
      person: {},
      rollen: ['servicekraft'],
      filialIds: ['b-1'],
      aktiv: false,
      erstelltAm: serverTimestamp(),
      aktualisiertAm: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(
      doc(db, mitarbeiterPath),
      {
        rollen: ['administrator'],
        filialIds: ['b-2'],
        aktualisiertAm: serverTimestamp(),
      },
      { merge: true },
    ),
  );
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), andererMitarbeiterPath),
      { benutzerUid: 'mitarbeiter-user' },
      { merge: true },
    );
  });
  await assertFails(deleteDoc(doc(db, andererMitarbeiterPath)));
  await assertSucceeds(deleteDoc(doc(db, mitarbeiterPath)));
});

for (const role of ['master', 'office', 'filiale']) {
  test(`inactive ${role} reads own profile only and cannot write`, async () => {
    const db = await seedProfile(role, { aktiv: false });
    await assertSucceeds(getDoc(doc(db, 'benutzerprofil/scoped')));
    for (const path of [filialePath, 'purUser/old', 'benutzerprofil/other']) {
      await assertFails(getDoc(doc(db, path)));
    }
    await assertFails(setDoc(doc(db, filialePath), { name: 'updated' }, { merge: true }));
  });
}

test('active master can write business data but cannot update profiles directly', async () => {
  const db = await seedProfile('master');

  await assertSucceeds(setDoc(doc(db, 'unternehmer/new'), { anzeigename: 'Unternehmer Neu' }));
  await assertSucceeds(setDoc(doc(db, 'unternehmer/new/firma/new'), { anzeigename: 'Firma Neu' }));
  await assertSucceeds(
    setDoc(doc(db, 'unternehmer/new/firma/new/filiale/new'), {
      anzeigename: 'Filiale Neu',
    }),
  );
  await assertSucceeds(setDoc(doc(db, filialePath), { name: 'updated' }, { merge: true }));
  await assertSucceeds(setDoc(doc(db, `${filialePath}/mitarbeiter/new`), { name: 'new' }));
  await assertFails(
    setDoc(doc(db, 'benutzerprofil/other'), { anzeigename: 'updated' }, { merge: true }),
  );
  await assertFails(setDoc(doc(db, 'other/new'), { name: 'new' }));
  await assertFails(setDoc(doc(db, `${firmaPath}/private/new`), { name: 'new' }));
  await assertFails(setDoc(doc(db, `${unternehmerPath}/private/new`), { name: 'new' }));
  await assertFails(deleteDoc(doc(db, 'other/doc')));
  await assertFails(deleteDoc(doc(db, unternehmerPath)));
  await assertFails(deleteDoc(doc(db, firmaPath)));
  await assertFails(deleteDoc(doc(db, filialePath)));
  await assertFails(deleteDoc(doc(db, 'benutzerprofil/other')));
});

test('active master cannot update or delete the own profile directly', async () => {
  const db = await seedProfile('master');

  await assertFails(
    setDoc(doc(db, 'benutzerprofil/scoped'), { anzeigename: 'Master Neu' }, { merge: true }),
  );
  await assertFails(setDoc(doc(db, 'benutzerprofil/scoped'), { aktiv: false }, { merge: true }));
  await assertFails(deleteDoc(doc(db, 'benutzerprofil/scoped')));
});

test('active master cannot change immutable profile fields', async () => {
  const db = await seedProfile('master');

  await assertFails(
    setDoc(doc(db, 'benutzerprofil/other'), { email: 'neu@example.com' }, { merge: true }),
  );
  await assertFails(
    setDoc(doc(db, 'benutzerprofil/other'), { userRole: 'filiale' }, { merge: true }),
  );
});

test('active master cannot store client-managed profile areas directly', async () => {
  const db = await seedProfile('master');
  const eigenesProfil = doc(db, 'benutzerprofil/scoped');
  const anderesProfil = doc(db, 'benutzerprofil/other');

  await assertFails(setDoc(eigenesProfil, { erlaubteBereiche: ['dashboard'] }, { merge: true }));
  await assertFails(setDoc(anderesProfil, { erlaubteBereiche: ['verwaltung'] }, { merge: true }));
  await assertFails(
    setDoc(anderesProfil, { erlaubteBereiche: ['dashboard', 'systemverwaltung'] }, { merge: true }),
  );
  await assertFails(
    setDoc(anderesProfil, { erlaubteBereiche: ['dashboard', 'verwaltung'] }, { merge: true }),
  );
});

test('active master cannot change branch profile assignments directly', async () => {
  const db = await seedProfile('master');
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'benutzerprofil/filiale'), {
      anzeigename: 'Filiale',
      aktiv: true,
      userRole: 'filiale',
      erlaubteBereiche: ['dashboard'],
      zugriffe,
    });
  });
  const profil = doc(db, 'benutzerprofil/filiale');

  await assertFails(setDoc(profil, { anzeigename: 'Filiale Neu' }, { merge: true }));
  await assertFails(updateDoc(profil, { zugriffe: {} }));
  await assertFails(updateDoc(profil, { zugriffe: { 'u-1': { 'f-1': ['b-1', 'b-2'] } } }));
  await assertFails(
    updateDoc(profil, {
      zugriffe: { 'u-1': { 'f-1': ['b-1'] }, 'u-2': { 'f-2': ['b-2'] } },
    }),
  );
  await assertFails(updateDoc(profil, { zugriffe: { 'u-2': { 'f-2': ['b-2'] } } }));
});

test('active master cannot update employee profiles directly', async () => {
  const db = await seedProfile('master');
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'benutzerprofil/mitarbeiter'), {
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: { 'u-1': { 'f-1': [] } },
      firmaMitarbeiterId: 'm-1',
    });
  });
  const profil = doc(db, 'benutzerprofil/mitarbeiter');

  await assertFails(setDoc(profil, { anzeigename: 'Mitarbeiter Neu' }, { merge: true }));
  await assertFails(setDoc(profil, { erlaubteBereiche: ['dashboard'] }, { merge: true }));
  await assertFails(setDoc(profil, { aktiv: false }, { merge: true }));
  await assertFails(setDoc(profil, { zugriffe: {} }, { merge: true }));
  await assertFails(setDoc(profil, { zugriffe: { 'u-1': { 'f-2': [] } } }, { merge: true }));
  await assertFails(setDoc(profil, { firmaMitarbeiterId: 'm-2' }, { merge: true }));
});

test('active master cannot create employee account profiles directly', async () => {
  const db = await seedProfile('master');

  await assertFails(
    setDoc(doc(db, 'benutzerprofil/mitarbeiter-gueltig'), {
      email: 'mitarbeiter@example.com',
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard', 'schichtplan'],
      zugriffe: {},
    }),
  );
  await assertFails(
    setDoc(doc(db, 'benutzerprofil/mitarbeiter-ungueltig'), {
      email: 'mitarbeiter@example.com',
      anzeigename: 'Mitarbeiter',
      aktiv: true,
      userRole: 'mitarbeiter',
      erlaubteBereiche: ['dashboard'],
      zugriffe: {},
    }),
  );
});

test('active office can update assigned companies and branches without creating or deleting', async () => {
  const db = await seedProfile('office');

  await assertSucceeds(setDoc(doc(db, firmaPath), { name: 'Firma aktualisiert' }, { merge: true }));
  await assertSucceeds(
    setDoc(doc(db, filialePath), { name: 'Filiale aktualisiert' }, { merge: true }),
  );
  await assertFails(
    setDoc(doc(db, nichtZugeordneteFirmaPath), { name: 'Nicht zugeordnet' }, { merge: true }),
  );
  await assertFails(
    setDoc(doc(db, nichtZugeordneteFilialePath), { name: 'Nicht zugeordnet' }, { merge: true }),
  );
  await assertFails(setDoc(doc(db, `${unternehmerPath}/firma/f-3`), { name: 'Neue Firma' }));
  await assertFails(setDoc(doc(db, `${firmaPath}/filiale/b-3`), { name: 'Neue Filiale' }));
  await assertFails(setDoc(doc(db, `${filialePath}/mitarbeiter/new`), { name: 'Neu' }));
  await assertFails(deleteDoc(doc(db, firmaPath)));
  await assertFails(deleteDoc(doc(db, filialePath)));
});

test('active office cannot write entrepreneurs, legacy data or profiles', async () => {
  const db = await seedProfile('office');
  for (const path of [
    unternehmerPath,
    'purUser/old',
    'other/doc',
    'benutzerprofil/scoped',
    'benutzerprofil/other',
  ]) {
    await assertFails(setDoc(doc(db, path), { aktiv: true }, { merge: true }));
    await assertFails(deleteDoc(doc(db, path)));
  }
});

test('active branch users cannot write business data, own profile or other profiles', async () => {
  const db = await seedProfile('filiale');
  for (const path of [
    firmaPath,
    filialePath,
    'purUser/old',
    'other/doc',
    'benutzerprofil/scoped',
    'benutzerprofil/other',
  ]) {
    await assertFails(setDoc(doc(db, path), { aktiv: true }, { merge: true }));
    await assertFails(deleteDoc(doc(db, path)));
  }
  await assertFails(setDoc(doc(db, `${filialePath}/mitarbeiter/new`), { name: 'new' }));
});

test('legacy array scopes and unknown roles fail closed', async () => {
  let db = await seedProfile('office', {
    zugriffe: [{ unternehmerId: 'u-1', firmaId: 'f-1', filialIds: ['b-1'] }],
  });
  await assertFails(getDoc(doc(db, filialePath)));
  db = await seedProfile('unknown');
  await assertFails(getDoc(doc(db, filialePath)));
});

test('malformed nested access values fail closed', async () => {
  const db = await seedProfile('office', {
    zugriffe: { 'u-1': ['f-1'] },
  });
  for (const path of [unternehmerPath, firmaPath, filialePath]) {
    await assertFails(getDoc(doc(db, path)));
  }
});

test('empty branch lists grant neither company nor branch access', async () => {
  const db = await seedProfile('office', { zugriffe: { 'u-1': { 'f-1': [] } } });
  await assertSucceeds(getDoc(doc(db, unternehmerPath)));
  await assertFails(getDoc(doc(db, firmaPath)));
  await assertFails(getDoc(doc(db, filialePath)));
});

test('legacy users retain explicit old access but cannot access other collections or the new hierarchy', async () => {
  const db = testEnvironment.authenticatedContext('legacy').firestore();
  for (const path of ['purUser/old', legacyBranchPath, `${legacyBranchPath}/employee/e-1`]) {
    await assertSucceeds(setDoc(doc(db, path), { value: 1 }));
    await assertSucceeds(setDoc(doc(db, path), { value: 2 }, { merge: true }));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(deleteDoc(doc(db, path)));
  }
  await assertSucceeds(getDocs(collection(db, 'purCustomers')));
  await assertFails(getDoc(doc(db, 'other/doc')));
  await assertFails(setDoc(doc(db, 'other/doc'), { value: 1 }));
  await assertFails(getDoc(doc(db, unternehmerPath)));
  await assertFails(setDoc(doc(db, filialePath), { value: 1 }));
  await assertFails(getDocs(collection(db, 'unternehmer')));
  await assertFails(setDoc(doc(db, 'benutzerprofil/legacy'), { userRole: 'master' }));
  await assertFails(getDoc(doc(db, 'benutzerprofil/other')));
  await assertFails(setDoc(doc(db, 'benutzer/legacy'), { userRole: 'master' }));
  await assertFails(getDoc(doc(db, 'benutzer/other')));
});

test('scoped queries explicitly restricted to assigned document IDs succeed', async () => {
  const db = await seedProfile('office');
  for (const [path, id] of [
    ['unternehmer', 'u-1'],
    [`${unternehmerPath}/firma`, 'f-1'],
    [`${firmaPath}/filiale`, 'b-1'],
  ]) {
    const result = await assertSucceeds(
      getDocs(query(collection(db, path), where(documentId(), 'in', [id]))),
    );
    assert.equal(result.size, 1);
  }
});

test('multiple entrepreneurs and companies remain accessible beyond the first scope', async () => {
  const mehrereZugriffe = Object.fromEntries(
    Array.from({ length: 15 }, (_, i) => [`u-${i}`, { 'f-1': ['b-1'] }]),
  );
  const db = await seedProfile('office', { zugriffe: mehrereZugriffe });
  await assertSucceeds(getDoc(doc(db, 'unternehmer/u-14/firma/f-1/filiale/b-1')));
  await assertFails(getDoc(doc(db, 'unternehmer/u-14/firma/f-1/filiale/b-2')));
});
