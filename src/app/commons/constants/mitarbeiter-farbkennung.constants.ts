// pur-system/src/app/commons/constants/mitarbeiter-farbkennung.constants.ts

export type TMitarbeiterFarbkennung =
  | 'rot'
  | 'pink'
  | 'violett'
  | 'dunkelviolett'
  | 'indigo'
  | 'blau'
  | 'hellblau'
  | 'cyan'
  | 'tuerkis'
  | 'gruen'
  | 'hellgruen'
  | 'limette'
  | 'gelb'
  | 'hellgelb'
  | 'bernstein'
  | 'orange'
  | 'braun'
  | 'grau'
  | 'blaugrau'
  | 'dunkelblau';

export interface IMitarbeiterFarbe {
  readonly kennung: TMitarbeiterFarbkennung;
  readonly bezeichnung: string;
  readonly farbe: string;
  readonly kontrastfarbe: string;
}

export const MITARBEITER_FARBEN: readonly IMitarbeiterFarbe[] = [
  { kennung: 'rot', bezeichnung: 'Rot', farbe: '#d32f2f', kontrastfarbe: '#ffffff' },
  { kennung: 'pink', bezeichnung: 'Pink', farbe: '#c2185b', kontrastfarbe: '#ffffff' },
  { kennung: 'violett', bezeichnung: 'Violett', farbe: '#7b1fa2', kontrastfarbe: '#ffffff' },
  {
    kennung: 'dunkelviolett',
    bezeichnung: 'Dunkelviolett',
    farbe: '#673ab7',
    kontrastfarbe: '#ffffff',
  },
  { kennung: 'indigo', bezeichnung: 'Indigo', farbe: '#3f51b5', kontrastfarbe: '#ffffff' },
  { kennung: 'blau', bezeichnung: 'Blau', farbe: '#1976d2', kontrastfarbe: '#ffffff' },
  {
    kennung: 'hellblau',
    bezeichnung: 'Hellblau',
    farbe: '#29b6f6',
    kontrastfarbe: '#1d1b20',
  },
  { kennung: 'cyan', bezeichnung: 'Cyan', farbe: '#00acc1', kontrastfarbe: '#1d1b20' },
  { kennung: 'tuerkis', bezeichnung: 'Türkis', farbe: '#00838f', kontrastfarbe: '#ffffff' },
  { kennung: 'gruen', bezeichnung: 'Grün', farbe: '#388e3c', kontrastfarbe: '#ffffff' },
  {
    kennung: 'hellgruen',
    bezeichnung: 'Hellgrün',
    farbe: '#8bc34a',
    kontrastfarbe: '#1d1b20',
  },
  { kennung: 'limette', bezeichnung: 'Limette', farbe: '#cddc39', kontrastfarbe: '#1d1b20' },
  { kennung: 'gelb', bezeichnung: 'Gelb', farbe: '#f9a825', kontrastfarbe: '#1d1b20' },
  {
    kennung: 'hellgelb',
    bezeichnung: 'Hellgelb',
    farbe: '#ffeb3b',
    kontrastfarbe: '#1d1b20',
  },
  {
    kennung: 'bernstein',
    bezeichnung: 'Bernstein',
    farbe: '#ffb300',
    kontrastfarbe: '#1d1b20',
  },
  { kennung: 'orange', bezeichnung: 'Orange', farbe: '#f57c00', kontrastfarbe: '#ffffff' },
  { kennung: 'braun', bezeichnung: 'Braun', farbe: '#795548', kontrastfarbe: '#ffffff' },
  { kennung: 'grau', bezeichnung: 'Grau', farbe: '#9e9e9e', kontrastfarbe: '#1d1b20' },
  {
    kennung: 'blaugrau',
    bezeichnung: 'Blaugrau',
    farbe: '#607d8b',
    kontrastfarbe: '#ffffff',
  },
  {
    kennung: 'dunkelblau',
    bezeichnung: 'Dunkelblau',
    farbe: '#263b59',
    kontrastfarbe: '#ffffff',
  },
];
