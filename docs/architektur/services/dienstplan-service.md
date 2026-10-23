<!-- pur-system/docs/architektur/services/dienstplan-service.md -->

# Dienstplan-Service

Der `DienstplanService` kapselt die Firestore-Zugriffe für filialbezogene Monatspläne, Modell-Momentaufnahmen, Versionen und
Schichten. Jeder öffentliche Aufruf erhält einen vollständigen Filial- beziehungsweise Dokumentpfad. Für die verbindliche
filialübergreifende Konfliktprüfung liest der Service zusätzlich die deterministisch adressierten Tagesdokumente des
firmenweiten Mitarbeiterbelegungsindex; vollständige Dienstpläne anderer Filialen muss er dafür nicht laden.

## Laden

- `loadDienstplanMonat()` lädt einen bekannten Monat, seine unveränderliche Modell-Momentaufnahme sowie dessen aktuelle
  Entwurfs- und Veröffentlichungsstände. Für die Mitarbeiteransicht kann der Aufruf auf die veröffentlichte Version begrenzt
  werden.
- `loadDienstplanBestand()` lädt für die Filial-App den vollständigen Bestand einer Filiale mit allen Monaten, Versionen und
  Schichten einschließlich ihrer Modell-Momentaufnahmen.
- `observeMitarbeiterbelegungen()` beobachtet bis zu 30 bekannte Dokument-IDs des firmenweiten Mitarbeiterbelegungsindex in
  einem begrenzten Firestore-Snapshot-Listener. Die Aufteilung größerer ID-Mengen und die Zusammenführung der Listener-Stände
  übernimmt der Mitarbeiterbelegungs-Store.

Die Lesestrategie wird vom Aufrufer vorgegeben. Geladene Dokumente werden um ihre IDs und vollständigen Pfadinformationen
ergänzt und anschließend fachlich sortiert.

## Schreiben

- `createDienstplan()` prüft ein aktives, nicht leeres Schichtmodell derselben Filiale und legt den Monatsplan, seine erste
  Entwurfsversion und die vollständige Modell-Momentaufnahme in einer Transaktion an. Die Transaktion liest zuerst den
  Monatsplanpfad und verhindert dadurch auch bei parallelen Aufrufen eine zweite Anlage desselben Filialmonats. Zuvor lädt die
  Methode die Filialeinstellungen verbindlich mit `networkOnly`. Fehlende, unvollständige oder für den Zielmonat
  widersprüchliche Einstellungen verhindern die Anlage. Sind die Filialeinstellungen noch nicht angelegt, liefert der Service
  einen fachlichen Fehler mit dem Hinweis, zuerst die Öffnungszeiten der Filiale zu initialisieren. Die verpflichtende
  Planungsart des gewählten Modells wird in den Monatsplan übernommen. Auch unvollständige Filialeinstellungen,
  widersprüchliche Kalenderregeln und ein zwischenzeitlich ungültiges Schichtmodell werden als konkrete Fehler der
  Dienstplananlage weitergegeben. Unbekannte technische Fehler erhalten weiterhin nur eine allgemeine sichtbare Meldung und
  werden vollständig über den `DebugLogService` protokolliert.
- `deleteDienstplan()` lädt Dienstplan, Entwurfsschichten und Modell-Momentaufnahme verbindlich vom Server. Nur einen leeren,
  noch nie veröffentlichten Entwurf löscht die Methode gemeinsam mit dem Dienstplan und dessen Momentaufnahme.
- `publishDienstplan()` lädt den aktuellen Entwurf und einen gegebenenfalls bisher veröffentlichten Stand verbindlich vom
  Server. Die Transaktion prüft Entwurfsrevision, Mitarbeiterstatus, Filialzuordnung und die betroffenen firmenweiten
  Belegungstage erneut. Sie veröffentlicht den Entwurf, archiviert den ersetzten Stand, aktualisiert den Belegungsindex und
  speichert Veröffentlichungs- beziehungsweise Archivierungsmetadaten atomar.
- `createEntwurfAusVeroeffentlichung()` legt die nächste filialbezogene Versionsnummer als Entwurf mit Revision 0 an, kopiert
  die Schichten einschließlich ihrer berechneten Pausenwerte und ergänzt deren Entwurfsreferenzen atomar im Belegungsindex.
  Die Modell-Momentaufnahme bleibt unverändert am Monatsplan bestehen.
- `createSchicht()`, `updateSchicht()` und `deleteSchicht()` schreiben eine Schicht gemeinsam mit der nächsten Versionsrevision
  und allen betroffenen Tagesdokumenten des firmenweiten Mitarbeiterbelegungsindex in einer Firestore-Transaktion. Vor Anlage
  und Änderung prüft der Service anhand der Modell-Momentaufnahme und der vorhandenen Schichten, ob die betroffene Rasterzelle
  eine weitere Belegung erlaubt. In derselben Transaktion verhindert der Index zeitliche Überschneidungen des Mitarbeiters
  über alle Filialen der Firma hinweg.

`updateSchicht()` deckt auch das Verschieben einer bestehenden Entwurfsschicht ab. Die Dokument-ID und die
Mitarbeiterzuordnung bleiben dabei erhalten, während Datum, Modellschicht und die daraus abgeleiteten absoluten Zeitwerte
ersetzt werden. Die Transaktion erhöht die Revision genau einmal, entfernt die bisherigen Indexreferenzen, ergänzt die neuen
Belegungstage und berechnet die Pausen der betroffenen Arbeitsblöcke neu. Eine abweichende Revision verhindert, dass eine
zwischen Vorprüfung und Transaktion geänderte Zielbelegung überschrieben wird.

Schichten enthalten die Mitarbeiter-ID sowie die ID ihrer Modellschicht aus der Momentaufnahme des Monatsplans. Beginn und Ende
sind absolute Firestore-Zeitstempel; zusätzlich wird das zugehörige Dienstplandatum gespeichert. Der Service erhält für Anlage
und Änderung nur Datum, Modellschicht-ID und Mitarbeiter-ID. Beginn und Ende leitet er verbindlich aus der im Monatsplan
gespeicherten Tagesrasterzeit und der Zeitzone ab. Schichtdokumente benötigen das Dienstplandatum sowie Beginn und Ende
verbindlich. Eine abweichende Entwurfsrevision verhindert veraltete Schreibzugriffe. Dadurch kann auch eine parallele Anlage die
Begrenzung einer Einfachbelegung nicht umgehen. Nach der ersten Veröffentlichung verhindert der TypeScript-Service das
Löschen des Monatsplans.

Der Mitarbeiterbelegungsindex liegt unter
`unternehmer/{unternehmerId}/firma/{firmaId}/mitarbeiterbelegung/{mitarbeiterId}__{datum}`. Jede enthaltene Referenz nennt
Mitarbeiter, Dienstplandatum, Filiale, Dienstplan, Version, Schicht, Versionsstatus, absoluten Beginn und absolutes Ende sowie
den berechneten Pausenwert. Eine Schicht über Mitternacht wird in jedem von ihr berührten lokalen Kalendertag indexiert; ein
genau um Mitternacht liegendes Ende gehört als exklusive Zeitgrenze nicht mehr zum Folgetag. Zusätzlich wird jede Referenz unter
ihrem Dienstplandatum geführt. Bei Änderungen liest die Transaktion die bisherigen und die neuen Belegungstage, entfernt
veraltete Referenzen und ergänzt den neuen Zeitraum. Dadurch konkurrieren parallele Einplanungen desselben Mitarbeiters um
dieselben Indexdokumente und Firestore wiederholt die Prüfung bei einer zwischenzeitlichen Änderung.

Der Service unterstützt derzeit ausschließlich die Planungsart `schichtraster`. Monatspläne oder Schichtmodelle mit fehlender
oder anderer Planungsart werden abgewiesen, statt irrtümlich mit der Rasterlogik verarbeitet zu werden. Eine spätere Umsetzung
von `schichtbausteine` kann dadurch eine eigene Anlage-, Momentaufnahme- und Schichtlogik erhalten.

`calculateArbeitsbloecke()` gruppiert die bereits auf einen Mitarbeiter und Dienstplantag begrenzten Schichten. Lücken unter
30 Minuten verbinden Schichten, ab 30 Minuten beginnt ein neuer Block; Überschneidungen sind ungültig. Die Arbeitszeit summiert
ausschließlich die Schichtdauern und ergibt je Block 0, 30 oder 45 Minuten bezahlte Pause. Direkt aufeinanderfolgende Schichten
bilden damit einen gemeinsamen Arbeitsblock. Anlage, Änderung und Löschung einer Schicht leiten die betroffenen Arbeitsblöcke
aus dem firmenweiten Belegungsindex neu ab. Ausschließlich die chronologisch letzte Schicht jedes Blocks speichert dessen
`pauseMinuten`; alle übrigen Blockschichten speichern `0`. Indexänderungen, Pausenwerte, konkrete Schicht und
Versionsrevision werden innerhalb derselben Firestore-Transaktion geschrieben.

Jede Indexreferenz wird unter ihrem Dienstplandatum und unter allen tatsächlich berührten lokalen Kalendertagen geführt. Damit
stehen sowohl Schichten über Mitternacht als auch erst am Folgetag beginnende Rasterplätze für Konflikt- und Pausenberechnung
zur Verfügung. Der Service berücksichtigt relevante Entwürfe und veröffentlichte Stände; ein Entwurf ersetzt den
veröffentlichten Stand desselben Filialdienstplans.

Beim Veröffentlichen werden die im Entwurf bereits berechneten Pausenwerte unverändert als Bestandteil der
Planungsmomentaufnahme übernommen. Der Statuswechsel der Entwurfsreferenzen und das Entfernen der Referenzen eines ersetzten
veröffentlichten Stands erfolgen in derselben Transaktion. Eine abweichende Revision oder eine parallele Änderung eines
beteiligten Dokuments lässt Firestore die Prüfung wiederholen beziehungsweise den Vorgang kontrolliert abbrechen.

Beim Anlegen löst der Service im aktuellen technischen Stand alle 28 bis 31 Kalendertage über die zentrale Öffnungsregel- und
Feiertagslogik aus Todo 20 auf.
Die Liste `kalendertage` liegt direkt im Monatsdienstplandokument und enthält je Datum Wochentag, wirksame Öffnungsregel, deren
Quelle, vorhandene Quellangaben, alle aktiven Sondertage und die tatsächlich passenden Rasterzeiten. Feiertage, jährliche
Sondertage und einmalige Datumsausnahmen beeinflussen das Raster ausschließlich über ihre wirksame Öffnungsregel. Der
gesetzliche Feiertagsstatus wird unabhängig vom Aktivstatus seiner besonderen Öffnungsregel übernommen. Dienstplan und
Tagesmomentaufnahmen werden gemeinsam atomar geschrieben und ohne zusätzliche Dokumentlesevorgänge geladen. Tages- und
Rasterzeitmomentaufnahmen sind verbindliche Bestandteile jedes Monatsdienstplans; unvollständige Dokumente werden nicht durch
Ersatzwerte ergänzt.

Der Beginn des ersten Rasterplatzes wird aus dem Öffnungsbeginn und das Ende des letzten Rasterplatzes aus dem Öffnungsende
abgeleitet. Vorbereitungsminuten der ersten beziehungsweise Nachbereitungsminuten der letzten Modellschicht erweitern diese
Grenzen. Feste innere Grenzen werden anhand ihrer gespeicherten Zuordnung zum Start- oder Folgetag eingeordnet. Nur Rasterplätze
mit positiver Dauer, deren innere Grenzen vollständig zu den Tagesgrenzen passen, werden in die Tagesmomentaufnahme übernommen.
Ein unpassender Rasterplatz bleibt an diesem Tag ohne Rasterzeit, statt die gesamte Dienstplananlage zu verhindern; ein
geöffneter Tag darf dadurch eine leere Rasterzeitliste enthalten. Eine konkrete Schicht kann ausschließlich für eine vorhandene
Tagesrasterzeit angelegt werden. Geschlossene Tage enthalten ebenfalls keine Rasterzeiten.

Die Firestore Rules sichern gemäß Berechtigungsmatrix ausschließlich aktives Profil, Rolle, Filialpfad und erlaubte
CRUD-Aktion. Die neue Feldstruktur, Modellschicht-IDs, Reihenfolge und sämtliche Zeitregeln validiert der TypeScript-Code mit
seinen Tests.

## Beteiligte Dateien

- `src/app/services/domain/dienstplan.service.ts`
- `src/app/stores/domain/dienstplan.store.ts`
- `src/app/commons/models/domain/dienstplan.ts`
- `src/app/commons/models/domain/dienstplan-kalendertag.ts`
- `src/app/commons/models/domain/mitarbeiterbelegung.ts`
- `src/app/commons/models/domain/schicht.ts`
- `src/app/commons/models/domain/schichtmodell.ts`
- `src/app/commons/utils/dienstplan/mitarbeiterbelegung.ts`
- `src/app/commons/utils/dienstplan/schicht-zeit.ts`
- `src/app/commons/utils/dienstplan/dienstplan-kalendertage.ts`
