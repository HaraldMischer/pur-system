// pur-system/src/app/commons/utils/navigation/rollen-navigation.ts

import { NAVIGATION_NACH_ROLLE } from '../../constants/navigation.constants';
import { TAppBereich } from '../../models/app/app-bereich';
import {
  INavigationLink,
  IRollenNavigation,
  TNavigationEintrag,
} from '../../models/app/navigation';
import { IBenutzerProfilDokument } from '../../models/domain/benutzer';
import { darfMitarbeiterBereichNutzen } from '../mitarbeiter/mitarbeiter-berechtigung';

function filterNavigationEintraege(
  eintraege: readonly TNavigationEintrag[],
  erlaubteBereiche: ReadonlySet<TAppBereich>,
): TNavigationEintrag[] {
  const sichtbareEintraege: TNavigationEintrag[] = [];

  for (const eintrag of eintraege) {
    if (eintrag.typ === 'link') {
      if (erlaubteBereiche.has(eintrag.bereich)) {
        sichtbareEintraege.push(eintrag);
      }
      continue;
    }

    const kinder = filterNavigationEintraege(eintrag.kinder, erlaubteBereiche);
    if (kinder.length > 0) {
      sichtbareEintraege.push({ ...eintrag, kinder });
    }
  }

  return sichtbareEintraege;
}

/**
 * Ermittelt die sichtbare Navigationsstruktur für ein Benutzerprofil.
 *
 * @param profil - Das Benutzerprofil mit Rolle, Aktivstatus und erlaubten Bereichen.
 * @returns Die Rollen-Navigation mit den für das Profil sichtbaren Einträgen.
 */
export function getSichtbareRollenNavigation(profil: IBenutzerProfilDokument): IRollenNavigation {
  const navigation = NAVIGATION_NACH_ROLLE[profil.userRole];
  const erlaubteBereiche = new Set(profil.erlaubteBereiche);
  if (!darfMitarbeiterBereichNutzen(profil)) {
    erlaubteBereiche.delete('mitarbeiter');
  }
  const eintraege = profil.aktiv
    ? filterNavigationEintraege(navigation.eintraege, erlaubteBereiche)
    : [];

  return {
    darstellung: navigation.darstellung,
    eintraege,
  };
}

/**
 * Liefert alle Navigationslinks einer möglicherweise verschachtelten Navigationsstruktur.
 *
 * @param eintraege - Die flachen oder verschachtelten Navigationseinträge.
 * @returns Alle enthaltenen Links in ihrer konfigurierten Reihenfolge.
 */
export function getNavigationLinks(eintraege: readonly TNavigationEintrag[]): INavigationLink[] {
  const links: INavigationLink[] = [];

  for (const eintrag of eintraege) {
    if (eintrag.typ === 'link') {
      links.push(eintrag);
      continue;
    }
    links.push(...getNavigationLinks(eintrag.kinder));
  }

  return links;
}
