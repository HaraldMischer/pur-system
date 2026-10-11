<!-- pur-system/docs/matrix-kontextselektor.md -->

# Matrix: Kontextselektor

Diese Übersicht zeigt die grundsätzliche Verfügbarkeit und Bedienbarkeit der Selektoren für den globalen Arbeitskontext. Ob
ein grundsätzlich verfügbarer Selektor tatsächlich dargestellt wird, richtet sich zusätzlich nach der Anzahl der im aktuellen
Kontext wählbaren Einträge. Architektur und Verantwortlichkeiten stehen im [Projektplan](./projekt-plan.md). Der aktuelle
Implementierungsstand steht im [Projektstand](./projekt-stand.md).

## 1. Selektormodus-Legende

### Legende

| Modus      | Bedeutung                                          |
| ---------- | -------------------------------------------------- |
| `hidden`   | Der Selektor wird nicht dargestellt.               |
| `readonly` | Der Selektor ist sichtbar, aber nicht veränderbar. |
| `editable` | Der Selektor ist sichtbar und veränderbar.         |
| `offen`    | Der wirksame Modus ist noch festzulegen.           |

## 2. Übergreifende Sichtbarkeitsregel

- Ein mit `editable` oder `readonly` konfigurierter Selektor wird nur dargestellt, wenn im aktuellen Kontext mehr als ein
  fachlich wählbarer Eintrag vorhanden ist.
- Bei genau einem wählbaren Eintrag wird dieser automatisch ausgewählt und der betreffende Selektor ausgeblendet.
- Bei keinem wählbaren Eintrag bleibt der Selektor ausgeblendet. Die betroffene Fachseite zeigt stattdessen ihren passenden
  Leer-, Fehler- oder Berechtigungszustand.
- Nach dem Wechsel eines Unternehmers oder einer Firma werden die verfügbaren untergeordneten Einträge neu bestimmt, eine
  eindeutige Auswahl automatisch übernommen und die Sichtbarkeit der abhängigen Selektoren erneut ausgewertet.
- Die Filialauswahl ist eine Mehrfachauswahl konkreter Filialen. Einen künstlichen Eintrag `Alle Filialen` gibt es nicht; alle
  Filialen werden durch die Auswahl aller verfügbaren Einträge dargestellt.
- Nach der Initialisierung oder dem Wechsel der Firma wird unabhängig von der Anzahl der verfügbaren Filialen zunächst die erste
  Filiale ausgewählt. Benutzer können anschließend eine oder mehrere konkrete Filialen auswählen.
- `readonly` bleibt für fachlich erforderliche Ausnahmen verfügbar. Ein lediglich eindeutiger Kontext wird jedoch nicht nur zur
  Information als deaktivierter Selektor dargestellt.

Die dynamische Regel wird auf die rollen- und bereichsabhängige Grundkonfiguration der folgenden Matrizen angewendet.

## 3. Master-Matrix

### Matrix

| Bereich            | Unternehmer | Firma      | Filiale    |
| ------------------ | ----------- | ---------- | ---------- |
| `dashboard`        | `editable`  | `editable` | `readonly` |
| `schichtplan`      | `editable`  | `editable` | `editable` |
| `mitarbeiter`      | `editable`  | `editable` | `editable` |
| `verwaltung`       | `editable`  | `editable` | `readonly` |
| `systemverwaltung` | `editable`  | `editable` | `readonly` |

### Zusatzbedingungen

- Unternehmer werden nur bei mehreren verfügbaren Unternehmern dargestellt.
- Firmen werden nur bei mehreren Firmen des ausgewählten Unternehmers dargestellt.
- Filialen werden bei mehreren Filialen der ausgewählten Firma dauerhaft dargestellt. In Bereichen ohne filialbezogenen
  Arbeitskontext bleibt die Auswahl sichtbar, ist aber deaktiviert.

## 4. Office-Matrix

### Matrix

| Bereich            | Unternehmer | Firma      | Filiale    |
| ------------------ | ----------- | ---------- | ---------- |
| `dashboard`        | `hidden`    | `editable` | `readonly` |
| `schichtplan`      | `hidden`    | `editable` | `editable` |
| `mitarbeiter`      | `hidden`    | `editable` | `editable` |
| `verwaltung`       | `hidden`    | `editable` | `readonly` |
| `systemverwaltung` | `hidden`    | `hidden`   | `hidden`   |

### Zusatzbedingungen

- Der einzige zugeordnete Unternehmer wird automatisch ausgewählt und nicht als Selektor dargestellt.
- Die Firmenauswahl wird nur bei mehreren zugewiesenen Firmen dargestellt.
- Die Filialauswahl wird bei mehreren erlaubten Filialen der ausgewählten Firma dauerhaft dargestellt. Im Dashboard und in der
  Verwaltung ist sie deaktiviert; im Schichtplan und Mitarbeiterbereich ist sie bearbeitbar.

## 5. Filial-Matrix

### Matrix

| Bereich            | Unternehmer | Firma    | Filiale  |
| ------------------ | ----------- | -------- | -------- |
| `dashboard`        | `offen`     | `offen`  | `offen`  |
| `schichtplan`      | `hidden`    | `hidden` | `hidden` |
| `mitarbeiter`      | `offen`     | `offen`  | `offen`  |
| `verwaltung`       | `offen`     | `offen`  | `offen`  |
| `systemverwaltung` | `offen`     | `offen`  | `offen`  |

### Zusatzbedingungen

- Unternehmer, Firma und Filiale sind für ein Filialkonto eindeutig und werden automatisch ausgewählt. Im Bereich
  `schichtplan` wird deshalb kein Kontextselektor dargestellt.
- Die wirksamen Modi der übrigen Bereiche sind noch festzulegen.

## 6. Mitarbeiter-Matrix

### Matrix

| Bereich            | Unternehmer | Firma    | Filiale    |
| ------------------ | ----------- | -------- | ---------- |
| `dashboard`        | `offen`     | `offen`  | `offen`    |
| `schichtplan`      | `hidden`    | `hidden` | `editable` |
| `mitarbeiter`      | `offen`     | `offen`  | `offen`    |
| `verwaltung`       | `offen`     | `offen`  | `offen`    |
| `systemverwaltung` | `offen`     | `offen`  | `offen`    |

### Zusatzbedingungen

- Unternehmer und Firma ergeben sich aus der festen Mitarbeiterzuordnung und werden nicht als Selektoren dargestellt.
- Die Filialauswahl wird nur bei mehreren fachlich erlaubten Filialen als Mehrfachauswahl dargestellt.
- Die wirksamen Modi der übrigen Bereiche sind noch festzulegen.

## 7. Umsetzung

### Matrix

| Datei                                                                                 | Aufgabe                                                       | Stand     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------- |
| `src/app/commons/models/app/app-kontext-selector.types.ts`                            | Definiert Selektoren, Modi und Konfiguration.                 | vorhanden |
| `src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.ts`      | Nimmt die wirksame Konfiguration entgegen.                    | vorhanden |
| `src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.html`    | Setzt `hidden`, `readonly` und `editable` je Selektor um.     | vorhanden |
| `src/app/commons/constants/app-kontext-selector.constants.ts`                         | Enthält die Rollen- und Bereichsmatrizen aus diesem Dokument. | vorhanden |
| `src/app/components/app-shell/app-sidenav/app-sidenav.ts`                             | Ermittelt Rolle und aktuellen App-Bereich.                    | vorhanden |
| `src/app/components/app-shell/app-sidenav/app-sidenav.html`                           | Übergibt die ermittelte Konfiguration an den Selector.        | vorhanden |
| `src/app/components/data-selectors/app-kontext-selector/app-kontext-selector.spec.ts` | Prüft Darstellung und Bedienbarkeit der Selektormodi.         | vorhanden |
| `src/app/components/app-shell/app-sidenav/app-sidenav.spec.ts`                        | Prüft die rollen- und bereichsabhängige Konfiguration.        | vorhanden |

### Zusatzbedingungen

Die Matrizen und die übergreifende Sichtbarkeitsregel dieses Dokuments bilden den verbindlichen Sollzustand für die zentrale
Konfiguration. Rollen mit noch offenen Matrixwerten verwenden bis zu ihrer Festlegung die sichere Fallback-Konfiguration
`hidden`.

Die vorhandenen Komponenten setzen die statischen Modi `hidden`, `readonly` und `editable`, die dynamische Sichtbarkeit nach dem
Laden, die automatische Auswahl eindeutiger Einträge und die Mehrfachauswahl konkreter Filialen um. Bei einer Firma mit Filialen
wird zunächst die erste verfügbare Filiale ausgewählt; einen künstlichen Eintrag `Alle Filialen` gibt es nicht.
