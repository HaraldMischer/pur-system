<!-- pur-system/docs/matrix-pwa-konfigurationen.md -->

# Matrix: PWA-Konfigurationen

Diese Übersicht enthält die technischen Build-, Vorschau-, Service-Worker- und Hosting-Konfigurationen der
Auslieferungsvarianten. Fachliche Cache- und Offline-Entscheidungen stehen in der
[Cache- und Betriebsartenmatrix](./matrix-cache-strategien.md).

## 1. Build- und Auslieferungsmatrix

| Variante               | Adresse oder Ziel                 | Befehl                           | Angular-Konfiguration    | Ausgabe                        | Service Worker | Manifest        | Offline-App-Shell |
| ---------------------- | --------------------------------- | -------------------------------- | ------------------------ | ------------------------------ | -------------- | --------------- | ----------------- |
| Entwicklung            | `http://localhost:4200`           | `npm run web:pur-system`         | `development`            | Angular Dev Server             | aus            | Pur Office      | nein              |
| Lokale Master-PWA      | `http://localhost:8080`           | `npm run pwa:pur-master`         | `office,master`      | `dist/pur-master/browser`      | an             | Pur Master      | ja                |
| Lokale Office-PWA      | `http://localhost:8081`           | `npm run pwa:pur-office`         | `office`             | `dist/pur-office/browser`      | an             | Pur Office      | ja                |
| Lokale Filial-PWA      | `http://localhost:8082`           | `npm run pwa:pur-filiale`        | `office,filiale`     | `dist/pur-filiale/browser`     | an             | Pur Filiale     | ja                |
| Lokale Mitarbeiter-PWA | `http://localhost:8083`           | `npm run pwa:pur-mitarbeiter`    | `office,mitarbeiter` | `dist/pur-mitarbeiter/browser` | an             | Pur Mitarbeiter | ja                |
| Master-Produktion      | `https://pur-master.web.app`      | `npm run deploy:pur-master`      | `office,master`      | `dist/pur-master/browser`      | an             | Pur Master      | ja                |
| Office-Produktion      | `https://pur-office.web.app`      | `npm run deploy:pur-office`      | `office`             | `dist/pur-office/browser`      | an             | Pur Office      | ja                |
| Filial-Produktion      | `https://pur-filiale.web.app`     | `npm run deploy:pur-filiale`     | `office,filiale`     | `dist/pur-filiale/browser`     | an             | Pur Filiale     | ja                |
| Mitarbeiter-Produktion | `https://pur-mitarbeiter.web.app` | `npm run deploy:pur-mitarbeiter` | `office,mitarbeiter` | `dist/pur-mitarbeiter/browser` | an             | Pur Mitarbeiter | ja                |

Die Ports `8080` bis `8083` liefern lokal dieselben PWA-Builds aus, die für die jeweils gleichnamige Firebase-Hosting-Site
vorgesehen sind. Alle vier Produktionsvarianten verwenden im Manifest den Darstellungsmodus `standalone` und besitzen eine
Offline-App-Shell.

Die allgemeine Entwicklungsumgebung wird mit `npm run web:pur-system` gestartet.

Jede PWA ergänzt bei der Anmeldung automatisch ihre Benutzerrolle. Benutzer geben nur den Namensbestandteil ein; Master, Office,
Filiale und Mitarbeiter bilden daraus jeweils den vollständigen Anmeldenamen mit dem passenden Rollensuffix.

## 2. Service-Worker-Ressourcen

| Ressourcengruppe | Installation                                       | Aktualisierung          | Inhalt                                     |
| ---------------- | -------------------------------------------------- | ----------------------- | ------------------------------------------ |
| `app`            | sofort                                             | sofort                  | `index.html`, Manifest, CSS und JavaScript |
| `fonts`          | sofort                                             | sofort                  | lokale Schriftarten und Material Icons     |
| `assets`         | bei Verwendung                                     | bei neuer Version vorab | Icons und Bilddateien                      |
| Firebase         | nicht durch den Angular Service Worker gespeichert | Serverzugriff           | Auth-, Firestore- und Functions-Anfragen   |

Der Service Worker wird in allen vier PWA-Builds registriert, sobald die Anwendung stabil ist, spätestens jedoch nach
30 Sekunden. Die Benutzerrolle hat keinen Einfluss auf seine Aktivierung.

## 3. Hosting und Deployment

| Hosting-Target | Firebase-Site     | Deployment                       |
| -------------- | ----------------- | -------------------------------- |
| `master`       | `pur-master`      | `npm run deploy:pur-master`      |
| `office`       | `pur-office`      | `npm run deploy:pur-office`      |
| `filiale`      | `pur-filiale`     | `npm run deploy:pur-filiale`     |
| `mitarbeiter`  | `pur-mitarbeiter` | `npm run deploy:pur-mitarbeiter` |
| alle vier      | alle vier Sites   | `npm run deploy:pur-all`         |

Die fünf npm-Deploy-Befehle verwenden gemeinsam `scripts/deploy-hostings.sh`. Das Skript validiert das Hosting-Ziel, verlangt
vor dem Build eine Bestätigung und veröffentlicht ausschließlich die ausgewählten Hosting-Targets. `npm run deploy:pur-all`
erstellt alle vier Produktionsbuilds und veröffentlicht `master`, `office`, `filiale` und `mitarbeiter` gemeinsam. Firestore
Rules und Functions werden durch diese Befehle nicht deployed.

Die Hosting-Adresse bestimmt über den dort veröffentlichten Build die technische Auslieferungsvariante. Die Benutzerrolle
bestimmt davon getrennt Navigation, Berechtigungen und Datenzugriff innerhalb der Anwendung.

Alle Hosting-Varianten liefern HTML- und direkte SPA-Routen ohne Browser-Cache aus. Manifest und Service-Worker-Steuerdateien
bleiben ebenfalls kurzfristig aktualisierbar; gehashte JavaScript- und CSS-Dateien werden langfristig und unveränderlich
gespeichert. Dadurch kann eine neue App-Version erkannt werden, ohne bestehende Versionsdateien unnötig erneut zu laden.
