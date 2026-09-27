<!-- pur-system/docs/todo_spaeter.md -->

# Spätere Todos

## 9. Todo: Offline-Fachdaten bei konkretem fachlichem Bedarf prüfen

### Ziel

Fachliche Daten werden in allen Auslieferungsvarianten zunächst ausschließlich online gelesen und geändert. Eine installierbare
PWA und eine offline verfügbare App-Shell führen nicht automatisch zu einer lokalen Verfügbarkeit fachlicher Daten.

Eine dauerhafte lokale Speicherung fachlicher Daten, Offline-Änderungen und eine spätere Synchronisation werden erst geplant, wenn
eine konkrete Fachfunktion dies benötigt. Die Entscheidung erfolgt dann einzeln für Datenart, Benutzerrolle, Auslieferungsvariante
und Aktion. Dieses Todo ist bis zu einem solchen fachlichen Bedarf zurückgestellt.

### Betroffene Dateien

Änderungen:

- docs/todo_spaeter.md
- docs/projekt-plan.md
- docs/projekt-stand.md
- docs/pwa-betriebsarten.md

### Schritt 1: Aktuellen Online-Betrieb festhalten

- [x] Fachliche Datenzugriffe in Pur Master, Pur Office, Pur Filiale und Pur Mitarbeiter zunächst ausschließlich online vorsehen.
- [x] Keine fachlichen Daten bewusst dauerhaft für eine spätere Offline-Anzeige speichern.
- [x] Keine Offline-Änderungen und keine spätere Synchronisation fachlicher Änderungen vorsehen.
- [x] Offline-App-Shell und fachliche Offline-Daten als getrennte Fähigkeiten behandeln.

### Schritt 2: Späteren fachlichen Bedarf konkretisieren

- [ ] Die konkrete Fachfunktion und Datenart benennen, für die ein Offline-Betrieb benötigt wird.
- [ ] Betroffene Benutzerrollen und Auslieferungsvarianten festlegen.
- [ ] Lokale Anzeige, lokale Speicherung und Offline-Änderungen getrennt entscheiden.
- [ ] Schutzbedarf, Benutzertrennung, veraltete Daten und Verhalten bei entzogenen Berechtigungen bewerten.
- [ ] Für Offline-Änderungen Synchronisation und Konfliktbehandlung fachlich festlegen.

### Schritt 3: Konkrete Umsetzung planen

- [ ] Für den freigegebenen Anwendungsfall ein eigenes Umsetzungstodo mit den tatsächlich betroffenen Dateien anlegen.
- [ ] Nur die ausdrücklich beschlossene Datenart, Rolle, Auslieferungsvariante und Aktion umsetzen.
- [ ] Passende Service-, Store-, Guard-, Rules-, Build- und manuelle Prüfungen für den konkreten Anwendungsfall festlegen.

### Tests und Abschluss

- [x] Die vorläufige Online-Entscheidung in `projekt-plan.md`, `projekt-stand.md` und `pwa-betriebsarten.md` dokumentieren.
- [x] Festhalten, dass für die aktuelle Entscheidung keine Code-, Rules- oder Build-Änderung erforderlich ist.
- [ ] Bei späterer Aktivierung dieses Todos die konkrete Entscheidung mit Auth, Backend, Firestore Rules und PWA-Konfigurationen
      abgleichen.

### Erledigt, wenn

- [ ] Für einen konkreten fachlichen Anwendungsfall ist der benötigte Offline-Betrieb eindeutig beschrieben.
- [ ] Datenart, Rollen, Auslieferungsvarianten und erlaubte Aktionen sind festgelegt.
- [ ] Sicherheits-, Synchronisations- und Konfliktregeln sind soweit erforderlich entschieden.
- [ ] Ein abgegrenztes Umsetzungstodo mit prüfbaren Abnahmekriterien ist angelegt.
