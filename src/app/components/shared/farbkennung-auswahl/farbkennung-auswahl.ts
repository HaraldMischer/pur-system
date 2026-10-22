// pur-system/src/app/components/shared/farbkennung-auswahl/farbkennung-auswahl.ts

import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';

import {
  MITARBEITER_FARBEN,
  TMitarbeiterFarbkennung,
} from '../../../commons/constants/mitarbeiter-farbkennung.constants';
import { getMitarbeiterFarbe } from '../../../commons/utils/mitarbeiter/mitarbeiter-farbkennung';

@Component({
  selector: 'app-farbkennung-auswahl',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FarbkennungAuswahl),
      multi: true,
    },
  ],
  templateUrl: './farbkennung-auswahl.html',
  styleUrl: './farbkennung-auswahl.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarbkennungAuswahl implements ControlValueAccessor {
  // ===== Öffentliche API ======================
  readonly label = input('Farbkennung');

  // ===== Interner State =======================
  private onChange: (farbkennung: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  // ===== Öffentliche Werte ====================
  readonly farben = MITARBEITER_FARBEN;
  readonly getMitarbeiterFarbe = getMitarbeiterFarbe;
  readonly farbkennung = signal<string | null>(null);
  readonly deaktiviert = signal(false);

  // ===== Öffentliche Aktionen =================
  /**
   * Übernimmt eine externe Farbkennung in die Auswahl.
   */
  writeValue(farbkennung: string | null): void {
    this.farbkennung.set(farbkennung);
  }

  /**
   * Registriert die Weitergabe einer ausgewählten Farbkennung.
   */
  registerOnChange(onChange: (farbkennung: string | null) => void): void {
    this.onChange = onChange;
  }

  /**
   * Registriert die Weitergabe des Berührungszustands.
   */
  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  /**
   * Übernimmt den deaktivierten Zustand des übergeordneten Formularfelds.
   */
  setDisabledState(deaktiviert: boolean): void {
    this.deaktiviert.set(deaktiviert);
  }

  /**
   * Öffnet das Farbauswahlmenü über den zugehörigen Labeltext.
   *
   * @param menuTrigger - Trigger des gemeinsamen Farbauswahlmenüs.
   */
  openMenu(menuTrigger: MatMenuTrigger): void {
    if (this.deaktiviert()) return;

    menuTrigger.openMenu();
  }

  /**
   * Übernimmt die ausgewählte Farbkennung und gibt sie an das Formular weiter.
   *
   * @param farbkennung - Ausgewählte Kennung oder `null` zum Entfernen.
   */
  selectFarbkennung(farbkennung: TMitarbeiterFarbkennung | null): void {
    if (this.deaktiviert()) return;

    this.farbkennung.set(farbkennung);
    this.onChange(farbkennung);
    this.onTouched();
  }
}
