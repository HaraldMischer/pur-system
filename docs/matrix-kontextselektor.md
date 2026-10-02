<!-- pur-system/docs/matrix-kontextselektor.md -->

# Matrix: Kontextselektor

Diese Übersicht zeigt die Sichtbarkeit und Bedienbarkeit der Selektoren für den globalen Arbeitskontext. Architektur und
Verantwortlichkeiten stehen im [Projektplan](./projekt-plan.md). Der aktuelle Implementierungsstand steht im
[Projektstand](./projekt-stand.md).

## 1. Selektormodus-Legende

### Legende

| Modus      | Bedeutung                                          |
| ---------- | -------------------------------------------------- |
| `hidden`   | Der Selektor wird nicht dargestellt.               |
| `readonly` | Der Selektor ist sichtbar, aber nicht veränderbar. |
| `editable` | Der Selektor ist sichtbar und veränderbar.         |
| `offen`    | Der wirksame Modus ist noch festzulegen.           |

## 2. Master-Matrix

### Matrix

| Bereich            | Unternehmer | Firma      | Filiale    |
| ------------------ | ----------- | ---------- | ---------- |
| `dashboard`        | `editable`  | `editable` | `hidden`   |
| `schichtplan`      | `editable`  | `editable` | `hidden`   |
| `mitarbeiter`      | `editable`  | `editable` | `editable` |
| `verwaltung`       | `editable`  | `editable` | `hidden`   |
| `systemverwaltung` | `editable`  | `editable` | `hidden`   |

### Zusatzbedingungen

- Unternehmer und Firma sind für `master` in jedem Bereich veränderbar.
- Die Filiale ist nur im Bereich `mitarbeiter` sichtbar und veränderbar.

## 3. Office-Matrix

### Matrix

| Bereich            | Unternehmer | Firma   | Filiale |
| ------------------ | ----------- | ------- | ------- |
| `dashboard`        | `offen`     | `offen` | `offen` |
| `schichtplan`      | `offen`     | `offen` | `offen` |
| `mitarbeiter`      | `offen`     | `offen` | `offen` |
| `verwaltung`       | `offen`     | `offen` | `offen` |
| `systemverwaltung` | `offen`     | `offen` | `offen` |

### Zusatzbedingungen

- Die wirksamen Modi sind noch festzulegen.

## 4. Filial-Matrix

### Matrix

| Bereich            | Unternehmer | Firma   | Filiale |
| ------------------ | ----------- | ------- | ------- |
| `dashboard`        | `offen`     | `offen` | `offen` |
| `schichtplan`      | `offen`     | `offen` | `offen` |
| `mitarbeiter`      | `offen`     | `offen` | `offen` |
| `verwaltung`       | `offen`     | `offen` | `offen` |
| `systemverwaltung` | `offen`     | `offen` | `offen` |

### Zusatzbedingungen

- Die wirksamen Modi sind noch festzulegen.

## 5. Mitarbeiter-Matrix

### Matrix

| Bereich            | Unternehmer | Firma   | Filiale |
| ------------------ | ----------- | ------- | ------- |
| `dashboard`        | `offen`     | `offen` | `offen` |
| `schichtplan`      | `offen`     | `offen` | `offen` |
| `mitarbeiter`      | `offen`     | `offen` | `offen` |
| `verwaltung`       | `offen`     | `offen` | `offen` |
| `systemverwaltung` | `offen`     | `offen` | `offen` |

### Zusatzbedingungen

- Die wirksamen Modi sind noch festzulegen.

## 6. Umsetzung

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

Die Matrizen dieses Dokuments bilden den verbindlichen Sollzustand für die zentrale Konfiguration. Rollen mit noch offenen
Matrixwerten verwenden bis zu ihrer Festlegung die sichere Fallback-Konfiguration `hidden`.
