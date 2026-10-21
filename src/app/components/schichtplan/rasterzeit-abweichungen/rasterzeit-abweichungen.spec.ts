// pur-system/src/app/components/schichtplan/rasterzeit-abweichungen/rasterzeit-abweichungen.spec.ts

import { TestBed } from '@angular/core/testing';

import { RasterzeitAbweichungen } from './rasterzeit-abweichungen';

describe('RasterzeitAbweichungen', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RasterzeitAbweichungen],
    }).compileComponents();
  });

  it('should emit only activated day overrides while keeping outer limits automatic', () => {
    const fixture = TestBed.createComponent(RasterzeitAbweichungen);
    fixture.componentRef.setInput('tage', [
      {
        id: 'heiligabend',
        bezeichnung: 'Heiligabend',
        oeffnungsregel: {
          geoeffnet: true,
          beginnLokalzeit: '07:00',
          endeLokalzeit: '18:00',
          endetAmFolgetag: false,
        },
      },
    ]);
    fixture.componentRef.setInput('modellschichten', [
      {
        id: 'frueh',
        bezeichnung: 'Früh',
        beginnLokalzeit: '06:00',
        endeLokalzeit: '16:30',
        endetAmFolgetag: false,
        mehrfachbelegungErlaubt: false,
        vorbereitungsminuten: 30,
      },
      {
        id: 'spaet',
        bezeichnung: 'Spät',
        beginnLokalzeit: '16:30',
        endeLokalzeit: '01:00',
        endetAmFolgetag: true,
        mehrfachbelegungErlaubt: false,
        nachbereitungsminuten: 15,
      },
    ]);
    const ergebnisse: unknown[] = [];
    fixture.componentInstance.abweichungenChange.subscribe((wert) => {
      ergebnisse.push(wert);
    });
    fixture.detectChanges();

    const tagForm = fixture.componentInstance.form.at(0);
    tagForm.controls.aktiviert.setValue(true);
    tagForm.controls.rasterzeiten.at(0).controls.endeLokalzeit.setValue('14:00');

    expect(fixture.componentInstance.getAutomatischerBeginn(0)).toBe('06:30');
    expect(fixture.componentInstance.getAutomatischesEnde(0)).toBe('18:15');
    expect(ergebnisse.at(-1)).toEqual([
      expect.objectContaining({
        tagId: 'heiligabend',
        modellschichtId: 'frueh',
        endeLokalzeit: '14:00',
      }),
      expect.objectContaining({
        tagId: 'heiligabend',
        modellschichtId: 'spaet',
        beginnLokalzeit: '16:30',
      }),
    ]);
  });
});
