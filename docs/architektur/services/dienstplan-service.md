<!-- pur-system/docs/architektur/services/dienstplan-service.md -->

# Dienstplan-Service

Der `DienstplanService` kapselt die Firestore-Zugriffe für filialbezogene Monatspläne, Modell-Momentaufnahmen, Versionen und
Schichten. Jeder öffentliche Aufruf erhält einen vollständigen Filial- beziehungsweise Dokumentpfad; filialübergreifende
Abfragen führt der Service nicht aus.

## Laden

- `loadDienstplanMonat()` lädt einen bekannten Monat, seine unveränderliche Modell-Momentaufnahme sowie dessen aktuelle
  Entwurfs- und Veröffentlichungsstände. Für die Mitarbeiteransicht kann der Aufruf auf die veröffentlichte Version begrenzt
  werden.
- `loadDienstplanBestand()` lädt für die Filial-App den vollständigen Bestand einer Filiale mit allen Monaten, Versionen und
  Schichten einschließlich ihrer Modell-Momentaufnahmen.

Die Lesestrategie wird vom Aufrufer vorgegeben. Geladene Dokumente werden um ihre IDs und vollständigen Pfadinformationen
ergänzt und anschließend fachlich sortiert.

## Schreiben

- `createDienstplan()` prüft ein aktives, nicht leeres Schichtmodell derselben Filiale und legt den Monatsplan, seine erste
  Entwurfsversion und die vollständige Modell-Momentaufnahme atomar an. Zuvor lädt die Methode die Filialeinstellungen
  verbindlich mit `networkOnly`. Fehlende, unvollständige oder für den Zielmonat widersprüchliche Einstellungen verhindern die
  Anlage. Die verpflichtende Planungsart des gewählten Modells wird in den Monatsplan übernommen.
- `deleteDienstplan()` lädt Dienstplan, Entwurfsschichten und Modell-Momentaufnahme verbindlich vom Server. Nur einen leeren,
  noch nie veröffentlichten Entwurf löscht die Methode gemeinsam mit dem Dienstplan und dessen Momentaufnahme.
- `createSchicht()`, `updateSchicht()` und `deleteSchicht()` schreiben eine Schicht gemeinsam mit der nächsten Versionsrevision
  in einer Firestore-Transaktion. Vor Anlage und Änderung prüft der Service anhand der Modell-Momentaufnahme und der vorhandenen
  Schichten, ob die betroffene Rasterzelle eine weitere Belegung erlaubt.

Schichten enthalten die Mitarbeiter-ID sowie die ID ihrer Modellschicht aus der Momentaufnahme des Monatsplans. Beginn und Ende
sind absolute Firestore-Zeitstempel; zusätzlich wird das zugehörige Dienstplandatum gespeichert. Der Service erhält für Anlage
und Änderung nur Datum, Modellschicht-ID und Mitarbeiter-ID. Beginn und Ende leitet er verbindlich aus der im Monatsplan
gespeicherten Tagesrasterzeit und der Zeitzone ab. Schichtdokumente benötigen das Dienstplandatum sowie Beginn und Ende
verbindlich. Eine abweichende Entwurfsrevision verhindert veraltete Schreibzugriffe. Dadurch kann auch eine parallele Anlage die
Begrenzung einer Einfachbelegung nicht umgehen. Nach der ersten Veröffentlichung verhindern Service und Firestore Rules das
Löschen des Monatsplans.

Der Service unterstützt derzeit ausschließlich die Planungsart `schichtraster`. Monatspläne oder Schichtmodelle mit fehlender
oder anderer Planungsart werden abgewiesen, statt irrtümlich mit der Rasterlogik verarbeitet zu werden. Eine spätere Umsetzung
von `schichtbausteine` kann dadurch eine eigene Anlage-, Momentaufnahme- und Schichtlogik erhalten.

Die bezahlte Pause ist keine Eigenschaft einer einzelnen Schicht. `calculateArbeitsbloecke()` gruppiert die bereits auf einen
Mitarbeiter und Dienstplantag begrenzten Schichten. Lücken unter 30 Minuten verbinden Schichten, ab 30 Minuten beginnt ein neuer
Block; Überschneidungen sind ungültig. Die Arbeitszeit summiert ausschließlich die Schichtdauern und ergibt je Block 0, 30 oder
45 Minuten bezahlte Pause. Die verbindliche filialübergreifende Einbindung dieser Berechnung folgt in Todo 21.9 Schritt 5.

Beim Anlegen löst der Service alle 28 bis 31 Kalendertage über die zentrale Öffnungsregel- und Feiertagslogik aus Todo 20 auf.
Die Liste `kalendertage` liegt direkt im Monatsdienstplandokument und enthält je Datum Wochentag, wirksame Öffnungsregel, deren
Quelle, vorhandene Quellangaben, alle aktiven Sondertage und die wirksamen Zeiten sämtlicher fester Rasterplätze. Besondere
Rasterzeiten werden nur bei einer wirksamen aktiven Sondertagsregel angewendet; optionale einmalige Datumsüberschreibungen haben
Vorrang. Nicht überschriebene Rasterplätze verwenden ihre regulären Modellzeiten. Der gesetzliche Feiertagsstatus wird
unabhängig vom Aktivstatus seiner besonderen Öffnungsregel übernommen. Dienstplan und Tagesmomentaufnahmen werden gemeinsam
atomar geschrieben und ohne zusätzliche Dokumentlesevorgänge geladen. Tages- und Rasterzeitmomentaufnahmen sind verbindliche
Bestandteile jedes Monatsdienstplans; unvollständige Dokumente werden nicht durch Ersatzwerte ergänzt.

## Beteiligte Dateien

- `src/app/services/domain/dienstplan.service.ts`
- `src/app/stores/domain/dienstplan.store.ts`
- `src/app/commons/models/domain/dienstplan.ts`
- `src/app/commons/models/domain/dienstplan-kalendertag.ts`
- `src/app/commons/models/domain/schicht.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/utils/dienstplan/schicht-zeit.ts`
- `src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts`
