<!-- pur-system/AGENTS.md -->

# Projekt-Vorgaben

## Projektregeln

- Jede Code-Änderung erfordert vorher ein Okay vom Benutzer.
- Beschreibe vor jeder Code-Änderung zuerst kurz, was geändert werden soll und in welchen Dateien; warte danach auf das
  ausdrückliche Okay des Benutzers, bevor du die Änderung umsetzt.
- Ohne ausdrückliches Okay des Benutzers werden keine Dateien angelegt, geändert oder gelöscht.
- Jede neu angelegte Quelltext- oder Konfigurationsdatei beginnt, soweit der Dateityp Kommentare unterstützt, mit einem Kommentar,
  der den Projektpfad der Datei angibt.
- Commit-Kommentare werden in diesem Projekt auf Deutsch formuliert.

## Projektziel

- Das fachliche und architektonische Zielbild steht in `docs/projekt-plan.md`.
- Der aktuelle Umsetzungsstand steht in `docs/projekt-stand.md`.
- Konkrete nächste Arbeitsschritte stehen in `docs/todo_next.md`.
- Bewusst zurückgestellte Arbeitsschritte stehen in `docs/todo_spaeter.md`.
- Abgeschlossene Arbeitsschritte stehen in `docs/todo_done.md`.
- Agents richten neue Umsetzung an diesen Dokumenten aus.

## Todo-Dokumentation

- Offene Hauptaufgaben werden in `docs/todo_next.md` unter einem fachlichen Todo gebündelt und mit fortlaufenden Unterpunkten wie
  `4.1`, `4.2` und `4.3` gegliedert.
- Bewusst zurückgestellte Hauptaufgaben werden unter Erhalt ihres Bearbeitungsstands in `docs/todo_spaeter.md` geführt und bei
  konkretem fachlichem Bedarf nach `docs/todo_next.md` übernommen.
- Vollständig abgeschlossene Hauptaufgaben werden unter Erhalt ihrer Erledigt-Markierungen nach `docs/todo_done.md` verschoben.
- Jeder Todo-Unterpunkt verwendet in dieser Reihenfolge die Bereiche `Ziel`, `Betroffene Dateien`, fachlich benannte und
  nummerierte Schritte, `Tests und Abschluss` sowie `Erledigt, wenn`.
- `Betroffene Dateien` unterscheidet vorhandene Dateien unter `Änderungen` von neu anzulegenden Dateien unter `Neu hinzuzufügen`.
  Bereiche ohne Einträge werden weggelassen.
- Arbeitsschritte werden als `Schritt 1: ...`, `Schritt 2: ...` und so weiter bezeichnet. Zusammengehörige Aufgaben stehen als
  Checkliste unter dem jeweiligen Schritt.
- `Tests und Abschluss` enthält konkrete Prüf-, Build-, Dokumentations- und manuelle Abschlussarbeiten.
- `Erledigt, wenn` bleibt ein eigener Bereich und beschreibt die fachlich prüfbaren Abnahmekriterien des Todo-Unterpunkts.
- Beim Neuordnen von Todos bleiben vorhandene Erledigt-Markierungen erhalten. Inhaltlich gleiche Aufgaben werden zusammengeführt,
  ohne offene Arbeiten versehentlich als erledigt zu markieren.

## Projektstruktur

- Echte Seiten liegen unter `src/app/pages`.
- Wiederverwendbare Components liegen unter `src/app/components`.
- App-Shell-Components liegen unter `src/app/components/app-shell`.
- Die Sidebar liegt unter `src/app/components/app-shell/app-sidenav`.
- Die Toolbar liegt unter `src/app/components/app-shell/app-toolbar`.
- Gemeinsame Modelle, Mapper, Konstanten, Utilities und Typen liegen unter `src/app/commons`.
- Guards liegen unter `src/app/guards`.
- Services liegen unter `src/app/services`.
- Allgemeine technische Services liegen unter `src/app/services/core`.
- Unmittelbare technische Anbindungen an Firebase liegen unter `src/app/services/firebase`.
- Fachliche Services für konkrete Domänen liegen unter `src/app/services/domain`.
- Stores liegen unter `src/app/stores`.
- App-weite Stores liegen unter `src/app/stores/app`, z. B. `src/app/stores/app/benutzer.store.ts`.
- Fachliche Domain-Stores liegen unter `src/app/stores/domain`.

## Template-Schreibweise

- Zusammenhängende Template-Bereiche und in umfangreichen Formularen auch einzelne fachlich relevante Felder dürfen kurze
  HTML-Kommentare zur Orientierung erhalten, z. B. `<!-- Benutzerkarte -->`, `<!-- Hauptnavigation -->` oder `<!-- Passwort -->`.
  Kommentare benennen ausschließlich den Bereich oder das Feld und enthalten keine ausführlichen Erklärungen.
- Einfache Seiten-Sections werden ohne `aria-labelledby` geschrieben.
- Dafür werden auch keine nur zu diesem Zweck angelegten `id`-Attribute auf Titeln verwendet.
- `pur-form` wird immer mit genau einem Layout-Modifier verwendet, z. B. `pur-form pur-form--grid` oder `pur-form pur-form--flex`.
- Formular-Dialoge bestehen aus den direkten Dialogbereichen `mat-dialog-title`, `mat-dialog-content` und `mat-dialog-actions`.
  Das Formular liegt innerhalb von `mat-dialog-content`; die Aktionen liegen außerhalb des Formulars in `mat-dialog-actions`.
- Reactive Forms verwenden in Dialogen `(ngSubmit)` statt eines manuell behandelten nativen `(submit)`-Ereignisses mit
  `$event.preventDefault()`.
- Liegt der Submit-Button außerhalb des Formulars, wird er mit `type="submit"` und `form="<formular-id>"` eindeutig dem Formular
  zugeordnet.
- Während eines laufenden Schreibvorgangs (`inProgress`) wird das gesamte betroffene Formular einschließlich eigenständig
  verwalteter Unterkomponenten und weiterer datenverändernder Aktionen deaktiviert. Der Submit-Handler verhindert zusätzlich
  wiederholte Aufrufe. Nach Erfolg oder Fehler wird das Formular wieder aktiviert.
- Datenändernde Submit-Aktionen sind nur aktiv, wenn das Formular gültig ist und kein Schreibvorgang läuft. Bearbeiten-Dialoge
  vergleichen den normalisierten, speicherbaren Ausgangszustand und den aktuellen Zustand per `JSON.stringify()`. Ohne fachliche
  Änderung bleibt der Submit-Button deaktiviert und der Submit-Handler verhindert den Schreibzugriff zusätzlich. Anlegen-Dialoge
  verhindern leere oder fachlich unvollständige Schreibzugriffe über ihre Validierung.
- Nach einem erfolgreichen Submit wird ein erneut verwendbares Reactive Form einschließlich des nativen Submitstatus über die
  `FormGroupDirective` zurückgesetzt. Leere Pflichtfelder bleiben dadurch fachlich ungültig, sind aber wieder `pristine` und
  `untouched` und werden nicht unmittelbar als fehlerhaft dargestellt. Bei einem Fehler bleiben die Eingaben erhalten.
- Erfolgsmeldungen innerhalb von Formularen verwenden die globale Klasse `pur-form__success`; dafür werden keine lokalen
  Erfolgsfarben oder formularspezifischen Erfolgsklassen angelegt.
- Für fehlende Pflichtfeldeingaben werden keine `mat-error`-Texte ausgegeben. Die Pflichtkennzeichnung erfolgt durch den Stern
  und der Fehlerzustand durch die rote Angular-Material-Darstellung. Fehlermeldungen für Format-, Längen- und sonstige fachliche
  Validierungsfehler bleiben zulässig.

## Naming

- Fachliche Projekt- und Domänenbegriffe im UI, in Modellen und in Firestore-Pfaden werden auf Deutsch gehalten.
- Technische Aktionen und übliche Code-Verben bleiben auf Englisch, z. B. `load`, `get`, `set`, `subscribe`, `filter`, `map` und
  `handle`.
- Kombiniere englische technische Verben mit deutschen Domänenbegriffen, z. B. `loadMitarbeiter`, `getMitarbeiter`, `updateFilter`
  und `handleMitarbeiterSelect`.
- Lademethoden heißen `load...`, Speichermethoden `save...`, reine Neuanlagen `create...` und Löschmethoden `delete...`.
- In Stores kennzeichnet `download` einen laufenden Ladevorgang.
- In Stores kennzeichnet `isLoaded`, dass Daten erfolgreich vollständig geladen wurden, wenn zwischen noch nicht geladenen und
  geladenen, aber leeren Daten unterschieden werden muss.
- In Stores kennzeichnet `inProgress` laufende Schreiboperationen wie Anlegen, Speichern oder Löschen.
- Deutsche Aktionsnamen wie `laden`, `geladen`, `anlegen` oder `speichern` werden nicht als Store-State-Namen verwendet.
- Auswahlzustände werden mit `selected` und dem deutschen Domänenbegriff benannt, z. B. `selectedFirma` oder
  `selectedUnternehmer`.
- Fachliche Domain-Dateien werden ohne Suffix benannt, z. B. `mitarbeiter.ts` oder `filiale.ts`.
- Technische oder lose Typ-Sammlungen verwenden `.types.ts`.
- Konkrete Klassen oder Model-Implementierungen verwenden `.model.ts`.
- Interfaces verwenden den Prefix `I`, z. B. `IMitarbeiterDokument`.
- Type Aliases verwenden den Prefix `T`, z. B. `TRolle`.
- Enums verwenden den Prefix `E`, z. B. `EMitarbeiterStatus`.
- Firestore-Collections werden auf Deutsch benannt, z. B. `mitarbeiter` statt `employees`.
- Innerhalb eines Firestore-Pfads wird keine Sprache gemischt.
- Technische Begriffe aus Frameworks, Libraries und APIs bleiben in der jeweils etablierten Schreibweise, z. B. `uid`, `email`,
  `Auth`, `Firestore` und `Timestamp`.

## Code-Dokumentation

- Fließtext in Markdown-Dokumenten wird möglichst bei 130 Zeichen pro Zeile umgebrochen. Einfache Zeilenumbrüche innerhalb eines
  Absatzes erzeugen dabei keinen neuen Absatz. Links, URLs, Tabellen und Code dürfen länger bleiben, wenn ein Umbruch die
  Lesbarkeit verschlechtern würde.
- Deutsche Texte, Kommentare und JSDoc verwenden echte Umlaute und `ß`. Die Umschreibungen `ae`, `oe`, `ue` sowie `ss` anstelle
  von `ß` werden dort nicht verwendet. Technische Bezeichner, Dateinamen, Pfade, Firestore-Schlüssel und API-Werte bleiben
  unverändert.
- JSDoc-Kommentare werden auf Deutsch geschrieben.
- JSDoc wird immer mehrzeilig geschrieben; einzeilige Schreibweisen wie `/** Beschreibung. */` sind nicht zulässig.
- Auch kurze JSDoc-Beschreibungen verwenden das Format mit eigener Öffnungszeile, Beschreibungszeile und Abschlusszeile.
- Öffentliche Methoden in Components, Services und Stores erhalten JSDoc.
- Private Hilfsmethoden erhalten nur JSDoc, wenn ihre Logik nicht selbsterklärend ist.
- Neue öffentliche Methoden werden direkt bei ihrer Erstellung dokumentiert.

## Coding-Stil

- Imports werden nach Herkunft gruppiert, innerhalb der Importliste aber ohne Leerzeilen: Angular und Frameworks, Commons, Stores
  und Services, lokale relative Imports.
- Gleichartige Deklarationen werden innerhalb eines Abschnitts kompakt ohne Leerzeilen gruppiert.
- Leerzeilen trennen unterschiedliche Abschnitte oder klar unterschiedliche Arten von Logik.
- Code in Components, Pages, Services und Stores wird nach den unten definierten Abschnittsblöcken geordnet.
- Abschnittsblöcke werden nur angelegt, wenn der jeweilige Inhalt vorhanden ist; leere Abschnittsüberschriften werden weggelassen.
- Für eigenständige benannte Hilfsfunktionen werden Funktionsdeklarationen gegenüber als `const` definierten Arrow Functions
  bevorzugt. Kurze Callbacks, beispielsweise für `map()`, `filter()`, `find()`, `some()`, `every()` und `sort()`, dürfen
  weiterhin als Arrow Functions geschrieben werden.
- Arrow Functions, die einen Wert zurückgeben, werden grundsätzlich mit Block-Body und explizitem `return` geschrieben; die
  kompakte Expression-Body-Schreibweise `() => wert` wird nicht verwendet. Callbacks ohne Rückgabewert verwenden ebenfalls einen
  Block-Body; ein inhaltlich bedeutungsloses `return` ist dort nicht erforderlich.
- Callbacks von `computed()` werden immer mit Block-Body und explizitem `return` geschrieben; die kompakte
  Expression-Body-Schreibweise wie `computed(() => store.inProgress())` wird auch bei kurzen Berechnungen nicht verwendet.
- Für kurze Array-Callbacks wie `map()`, `filter()`, `find()`, `some()`, `every()` und `sort()` bleibt die kompakte
  Expression-Body-Schreibweise erlaubt.
- `withComputed()` verwendet immer einen Block-Body. Computed-Signale werden darin als lokale Konstanten definiert und über einen
  gemeinsamen expliziten `return` als öffentliche Store-API zurückgegeben.
- `withMethods()` verwendet immer einen Block-Body. Methoden werden darin als benannte lokale Funktionsdeklarationen geschrieben
  und über einen gemeinsamen expliziten `return` als öffentliche Store-API zurückgegeben.
- Lokale Funktionen in `withMethods()`, die nicht im abschließenden Objekt zurückgegeben werden, gelten als private Helfer des
  Stores.
- Die direkten Objektliteral-Schreibweisen `withComputed(() => ({ ... }))` und `withMethods(() => ({ ... }))` werden nicht
  verwendet.

### Components und Pages

1.  `// ===== Top-Level Helper =====================`
2.  `// ===== Interne Dependency Injection =========`
3.  `// ===== Konstanten & Typen ===================`
4.  `// ===== Öffentliche API ======================`
5.  `// ===== View Queries =========================`
6.  `// ===== Interner State =======================`
7.  `// ===== Interne Ableitungen ==================`
8.  `// ===== Öffentliche Werte ====================`
9.  `// ===== Öffentliche Ableitungen ==============`
10. `// ===== Lifecycle Hooks ======================`
11. `// ===== Öffentliche Aktionen =================`
12. `// ===== Interne Helfer =======================`

### Services

1.  `// ===== Top-Level Helper =====================`
2.  `// ===== Interne Dependency Injection =========`
3.  `// ===== Konstanten & Typen ===================`
4.  `// ===== Öffentliche API ======================`
5.  `// ===== Interner State =======================`
6.  `// ===== Interne Ableitungen ==================`
7.  `// ===== Öffentliche Werte ====================`
8.  `// ===== Öffentliche Ableitungen ==============`
9.  `// ===== Öffentliche Aktionen =================`
10. `// ===== Interne Helfer =======================`

### Stores

1.  `// ===== Top-Level Helper =====================`
2.  `// ===== Methoden: Laden ======================`
3.  `// ===== Methoden: Schreiben ==================`
4.  `// ===== Methoden: Sonstige Aktionen ==========`

## Styles und UI

- Nutze Angular Material/CDK als bestehendes UI-System.
- Jeder über `MatDialog` geöffnete Dialog erhält standardmäßig `panelClass: ['pur-dialog__panel']`. Benötigt ein Dialog mehr
  Platz, wird die Standardklasse durch `pur-dialog__panel--large` ergänzt.
- Für eigene Layoutwerte werden grundsätzlich `px` verwendet, insbesondere für Breiten, Höhen, Abstände und Breakpoints.
- `rem` wird nur verwendet, wenn eine Größe ausdrücklich mit der Root-Schriftgröße skalieren soll.
- Vorhandene Angular-Material-Tokens bleiben von dieser Einheitenregel unberührt.
- Safe-Area-Abstände werden nur an den Viewportkanten berücksichtigt, die das betreffende Element tatsächlich berührt.
- `safe-area-inset-right` wird nicht pauschal verwendet, sondern nur bei Elementen am rechten Viewportrand.
- Bei einer links verankerten, nicht vollbreiten Sidebar sind hauptsächlich `safe-area-inset-left` und für Inhalte am unteren Rand
  `safe-area-inset-bottom` relevant.
- Safe-Area-Werte werden mit dem regulären Abstand per `calc()` kombiniert.
- Damit Safe-Area-Werte auf iOS greifen, verwendet der Viewport-Meta-Tag `viewport-fit=cover`.
- Wiederverwendbare CSS-Klassen folgen BEM: `block__element` für Elemente und `block__element--modifier` für Varianten oder
  Zustände. Zusammengesetzte Elementnamen verwenden einfache Bindestriche.
- Formulargruppen verwenden `pur-form__group`; ihre Überschriften verwenden `pur-form__group-titel` (in SCSS unter `&__group` als
  `&-titel`). `titel` ist ein eigenes Element, kein Modifier.
- Formulargruppen werden ohne `fieldset` und `legend` aufgebaut: `div`-Gruppen mit sichtbaren `h2`-Überschriften mit
  `pur-form__group-titel`. Diese Gruppen-Divs erhalten weder `role="group"` noch `aria-label` oder `aria-labelledby`.
  Beschriftungen für Bedienelemente wie reine Icon-Buttons bleiben davon unberührt.
- Komponentenbezogene Styles liegen in der jeweiligen Component-SCSS-Datei; bewusst wiederverwendbare Styles liegen unter
  `src/assets/scss`.
- Lokale Component-SCSS-Dateien bleiben als eingebundene Platzhalter bestehen und werden auch dann nicht entfernt, wenn aktuell
  alle Styles durch globale Klassen abgedeckt sind.
- Beachte die vorhandenen Prettier-Einstellungen aus `package.json`.

## Testregeln

- Tests prüfen vorrangig fachliches Verhalten und öffentlich beobachtbare Ergebnisse statt interner Implementierungsdetails.
- Rollen, Berechtigungen, Validierung, erfolgreiche Abläufe und relevante Fehlerfälle werden gezielt abgesichert.
- Template-Tests prüfen sichtbares oder interaktives Verhalten. Reine DOM-Verschachtelung, dekorative Elemente und CSS-Klassen
  werden nur getestet, wenn sie für Funktion, Barrierefreiheit oder verbindliche Projektkonventionen relevant sind.
- Selektoren und Erwartungen werden so gewählt, dass fachlich bedeutungslose Template- oder Styling-Änderungen keine Tests
  brechen.
- Bestehende Tests werden bei einer Verhaltensänderung auf ihre fachliche Aussage geprüft und angepasst, wenn das zuvor erwartete
  Verhalten bewusst entfällt.
- Redundante Tests und Tests, die ausschließlich die Testanzahl erhöhen, werden vermieden.
- Store- und Service-Tests prüfen Zustandsübergänge, Seiteneffekte, Fehlerweitergabe und die Zusammenarbeit mit ihren direkten
  Abhängigkeiten.
- Tests bleiben bei Vitest; Karma- oder Jasmine-Pakete werden nicht eingeführt.

## Arbeitsweise und Prüfungen

- Halte Änderungen auf die vereinbarte Aufgabe beschränkt; keine unnötigen Refactorings.
- Erhalte bestehende Änderungen des Benutzers. Dateien nur löschen, wenn es zur vereinbarten Aufgabe gehört; keine destruktiven
  Git-Aktionen ohne ausdrücklichen Auftrag.
- Verwende die vorhandenen npm-Skripte aus dem Projekt-Root. Der lokale Dev-Server startet mit `npm run web:pur-system`.
- Füge Dependencies nur bei begründetem Bedarf hinzu und aktualisiere `package.json` und `package-lock.json` gemeinsam.
- Ergänze oder aktualisiere passende `.spec.ts` Dateien bei Verhaltensänderungen.
- Führe vor Abschluss von Code-Änderungen `npm test` ohne Watch-Modus aus.
- Führe bei Build-, Template- oder größeren UI-Änderungen zusätzlich `npm run build` aus.
