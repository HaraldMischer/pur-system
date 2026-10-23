<!-- pur-system/docs/matrizen/oeffnungszeiten.md -->

# Matrix: Öffnungszeiten

## Zweck und Verbindlichkeit

Diese Matrix ist die fachliche Pflegequelle für regelmäßige Öffnungszeiten und besondere Kalendertage, die sich auf den
Spielhallenbetrieb in Nordrhein-Westfalen, die betriebliche Vorbelegung von Öffnungszeiten oder die steuerliche Bewertung
möglicher Zuschläge auswirken. Sie ersetzt keine Rechts- oder Steuerberatung. Vor einer produktiven Änderung werden
Rechtsgrundlage, Gültigkeitszeitraum und fachlicher Prüfstatus kontrolliert.

Die Eigenschaften eines Tages sind unabhängig voneinander. Ein Tag kann gleichzeitig Sonntag, gesetzlicher Feiertag, von
einer Sperr- oder Spielverbotszeit betroffen und für einen steuerlich begünstigten Zuschlag relevant sein. Die Matrix bildet
deshalb keine gegenseitig ausschließenden Tageskategorien.

Ein steuerlich begünstigter Zeitraum beschreibt nur den möglichen steuerfreien Höchstsatz eines tatsächlich zusätzlich zum
Grundlohn gezahlten Zuschlags. Er begründet weder einen Zahlungsanspruch noch legt er die betriebliche Zuschlagshöhe fest.

## Fachliche Quellen

| Kürzel | Quelle | Verwendeter Regelungsbereich | Stand der Prüfung |
| --- | --- | --- | --- |
| `FZG-NRW` | [Feiertagsgesetz Nordrhein-Westfalen](https://recht.nrw.de/lrgv/gesetz/01012000-bekanntmachung-der-neufassung-des-gesetzes-ueber-die-sonn-und-feiertage/) | Gesetzliche Feiertage, Gedenk- und Trauertage sowie zusätzliche Verbote an stillen Tagen | 23.10.2026 |
| `AG-GLUESTV-NRW` | [Ausführungsgesetz NRW Glücksspielstaatsvertrag](https://recht.nrw.de/lrgv/gesetz/01072021-gesetz-zur-ausfuehrung-des-gluecksspielstaatsvertrages-ausfuehrungsgesetz-nrw/) | Tägliche Sperrzeit für Spielhallen und Verweis auf das Feiertagsgesetz NRW | 23.10.2026 |
| `ESTG-3B` | [§ 3b Einkommensteuergesetz](https://www.gesetze-im-internet.de/estg/__3b.html) | Steuerfreiheit tatsächlich gezahlter Zuschläge für Sonntags-, Feiertags- und Nachtarbeit | 23.10.2026 |

## Pflegebegriffe

| Begriff | Bedeutung im System |
| --- | --- |
| Gesetzlicher Feiertagsstatus | Kennzeichnet einen am Ort der Arbeitsstätte geltenden gesetzlichen Feiertag. Er bleibt unabhängig von Öffnungsstatus und Sperrzeit erhalten. |
| Systemdefinierter besonderer Tag | Ein vom System benannter fester oder lokal berechneter Tag, beispielsweise Heiligabend, Silvester, Volkstrauertag oder Totensonntag. |
| Sperr- oder Spielverbotszeit | Rechtlich vorgegebener Zeitraum, in dem die Spielhalle nicht betrieben werden darf. Er begrenzt die betrieblich wählbare Öffnungszeit. |
| Betriebliche Vorbelegung | Ausgangswert für die Filiale. Gesetzliche Feiertage übernehmen grundsätzlich das Sonntagsprofil; besondere Sperrzeiten begrenzen es zusätzlich. |
| Zuschlagsprofil | Zeitraum und Höchstsatz, innerhalb dessen ein tatsächlich zusätzlich gezahlter Zuschlag nach der gepflegten Steuerregel steuerfrei sein kann. |
| Eigene Öffnungsregel | Von der Filiale gewählte Öffnungszeit innerhalb aller verbindlichen Grenzen. Sie verändert keine Kalendereigenschaft. |

## Wochentage und regelmäßige Öffnung

Jede Filiale pflegt für jeden Wochentag eine eigene regelmäßige Öffnungsregel. Die Matrix legt keine einheitlichen konkreten
Öffnungszeiten für alle Filialen fest. Sie beschreibt, welche Regel als betriebliche Grundlage dient und welche gesetzlichen
oder steuerlichen Eigenschaften unabhängig davon gelten.

| Regel-ID | Wochentag | Betriebliche Grundlage | Verbindliche tägliche Grenze für Spielhallen in NRW | Steuerliches Grundprofil |
| --- | --- | --- | --- | --- |
| `wochentag-montag` | Montag | Eigene konfigurierbare Montagsregel | Geschlossen von 01:00 bis 06:00 Uhr | Kein Tageszuschlag; Nachtprofil kann gelten |
| `wochentag-dienstag` | Dienstag | Eigene konfigurierbare Dienstagsregel | Geschlossen von 01:00 bis 06:00 Uhr | Kein Tageszuschlag; Nachtprofil kann gelten |
| `wochentag-mittwoch` | Mittwoch | Eigene konfigurierbare Mittwochsregel | Geschlossen von 01:00 bis 06:00 Uhr | Kein Tageszuschlag; Nachtprofil kann gelten |
| `wochentag-donnerstag` | Donnerstag | Eigene konfigurierbare Donnerstagsregel | Geschlossen von 01:00 bis 06:00 Uhr | Kein Tageszuschlag; Nachtprofil kann gelten |
| `wochentag-freitag` | Freitag | Eigene konfigurierbare Freitagsregel | Geschlossen von 01:00 bis 06:00 Uhr | Kein Tageszuschlag; Nachtprofil kann gelten |
| `wochentag-samstag` | Samstag | Eigene konfigurierbare Samstagsregel | Geschlossen von 01:00 bis 06:00 Uhr | Kein Tageszuschlag; Nachtprofil kann gelten |
| `wochentag-sonntag` | Sonntag | Eigene konfigurierbare Sonntagsregel | Geschlossen von 01:00 bis 06:00 Uhr | Sonntag, 50 %; Nachtprofil kann zusätzlich gelten |

Für die betriebliche Öffnungsregel gilt die Reihenfolge `einmalige Datumsausnahme` vor `aktiver besonderer Tag` vor
`Wochentagsregel`. Gesetzliche Sperr- und Spielverbotszeiten werden anschließend als verbindliche Grenze angewendet und können
durch keine betriebliche Regel erweitert werden. Der gesetzliche Feiertagsstatus und das Zuschlagsprofil werden unabhängig von
dieser Reihenfolge bestimmt.

Das ist das fachliche Zielbild. Soweit die bestehende Implementierung verbindliche Grenzen oder die Vorbelegung gesetzlicher
Feiertage mit dem Sonntagsprofil noch nicht vollständig abbildet, erfolgt die Umsetzung über das zugehörige Todo.

## Kalendertage und fachliche Auswirkungen

`Sonntagsprofil` bezeichnet die für die Filiale gespeicherte Sonntagsöffnung. `Wochentagsprofil` bezeichnet die regelmäßige
Öffnungsregel des konkreten Wochentags. Beide Profile werden durch verbindliche Sperr- und Spielverbotszeiten begrenzt.

| System-ID | Bezeichnung | Lokale Datumsregel | Gesetzlicher Feiertag in NRW | Betriebliche Vorbelegung | Zuschlagsprofil | Prüfstatus |
| --- | --- | --- | --- | --- | --- | --- |
| `neujahr` | Neujahr | `01-01` | Ja | Sonntagsprofil | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `karfreitag` | Karfreitag | Ostersonntag minus 2 Tage | Ja | Geschlossen | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `ostersonntag` | Ostersonntag | Gregorianische Osterberechnung | Nein; Sonntag | Sonntagsprofil | Sonntag, 50 % | Datumsregel umgesetzt; Aufnahme als NRW-Systemtag offen |
| `ostermontag` | Ostermontag | Ostersonntag plus 1 Tag | Ja | Sonntagsprofil | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `tagDerArbeit` | Tag der Arbeit | `05-01` | Ja | Sonntagsprofil | Besonderer Feiertag, 150 % | Quelle geprüft |
| `christiHimmelfahrt` | Christi Himmelfahrt | Ostersonntag plus 39 Tage | Ja | Sonntagsprofil | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `pfingstsonntag` | Pfingstsonntag | Ostersonntag plus 49 Tage | Nein; Sonntag | Sonntagsprofil | Sonntag, 50 % | Datumsregel umgesetzt; Aufnahme als NRW-Systemtag offen |
| `pfingstmontag` | Pfingstmontag | Ostersonntag plus 50 Tage | Ja | Sonntagsprofil | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `fronleichnam` | Fronleichnam | Ostersonntag plus 60 Tage | Ja | Sonntagsprofil | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `tagDerDeutschenEinheit` | Tag der Deutschen Einheit | `10-03` | Ja | Sonntagsprofil | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `allerheiligen` | Allerheiligen | `11-01` | Ja | Sonntagsprofil, frühestens ab 18:00 Uhr | Gesetzlicher Feiertag, 125 % | Quelle geprüft |
| `volkstrauertag` | Volkstrauertag | Zweiter Sonntag vor dem 1. Advent | Nein; Sonntag | Sonntagsprofil, frühestens ab 13:00 Uhr | Sonntag, 50 % | Neu umzusetzen; Quelle geprüft |
| `totensonntag` | Totensonntag | Letzter Sonntag vor dem 1. Advent | Nein; Sonntag | Sonntagsprofil, frühestens ab 18:00 Uhr | Sonntag, 50 % | Neu umzusetzen; Quelle geprüft |
| `heiligabend` | Heiligabend | `12-24` | Nein | Wochentagsprofil, spätestens bis 16:00 Uhr | Ab 14:00 Uhr 150 % | Quelle geprüft |
| `ersterWeihnachtstag` | 1. Weihnachtstag | `12-25` | Ja | Sonntagsprofil | Besonderer Feiertag, 150 % | Quelle geprüft |
| `zweiterWeihnachtstag` | 2. Weihnachtstag | `12-26` | Ja | Sonntagsprofil | Besonderer Feiertag, 150 % | Quelle geprüft |
| `silvester` | Silvester | `12-31` | Nein | Wochentagsprofil | Ab 14:00 Uhr 125 % | Quelle geprüft |

Der Ausdruck `Ostern` wird nicht als eigener Kalendertag gespeichert. Für die fachlichen Wirkungen werden Karfreitag,
Ostersonntag und Ostermontag getrennt betrachtet. Entsprechendes gilt für Pfingstsonntag und Pfingstmontag.

## Sperr- und Spielverbotszeiten für Spielhallen in NRW

Die folgende Matrix beschreibt Spielhallen und Wettvermittlungsstellen. Sie darf nicht ungeprüft auf Spielbanken oder andere
Betriebsarten übertragen werden.

| Regel-ID | Betroffener Zeitraum | Verbindliche Einschränkung | Möglicher betrieblicher Zeitraum bei regulärem Rahmen `06:00–01:00` | Quelle | Prüfstatus |
| --- | --- | --- | --- | --- | --- |
| `sperrzeit-taeglich` | Jeder Kalendertag | Geschlossen von 01:00 bis 06:00 Uhr | 06:00–01:00 Uhr am Folgetag | `AG-GLUESTV-NRW`, § 17 | Quelle geprüft |
| `spielverbot-karfreitag` | Karfreitag | Geschlossen bis 06:00 Uhr des Folgetags | Geschlossen | `FZG-NRW`, § 6 Abs. 3 | Quelle geprüft |
| `spielverbot-allerheiligen` | Allerheiligen | Geschlossen von 05:00 bis 18:00 Uhr | 18:00–01:00 Uhr am Folgetag | `FZG-NRW`, § 6 Abs. 2 | Quelle geprüft |
| `spielverbot-volkstrauertag` | Volkstrauertag | Geschlossen von 05:00 bis 13:00 Uhr | 13:00–01:00 Uhr am Folgetag | `FZG-NRW`, § 6 Abs. 1 | Quelle geprüft |
| `spielverbot-totensonntag` | Totensonntag | Geschlossen von 05:00 bis 18:00 Uhr | 18:00–01:00 Uhr am Folgetag | `FZG-NRW`, § 6 Abs. 2 | Quelle geprüft |
| `spielverbot-heiligabend` | Heiligabend | Geschlossen ab 16:00 Uhr | 06:00–16:00 Uhr | `FZG-NRW`, § 7 Abs. 2 | Quelle geprüft |

Die konkrete betriebliche Öffnung kann kürzer sein als der mögliche Zeitraum. Sie darf ihn nicht überschreiten. Änderungen der
Rechtslage werden mit einem Gültigkeitszeitraum als neue Regelversion erfasst und verändern keine bereits gespeicherten
Dienstplan-Momentaufnahmen.

## Steuerlich begünstigte Zuschlagszeiträume

Die Prozentsätze sind die in § 3b EStG genannten steuerfreien Höchstsätze bezogen auf den dort begrenzten Grundlohn. Tarifliche,
vertragliche oder betriebliche Ansprüche werden getrennt festgelegt.

| Zuschlagsprofil | Zeitraum | Steuerfreier Höchstsatz | Zuordnung |
| --- | --- | ---: | --- |
| `sonntag` | Sonntag 00:00–24:00 Uhr | 50 % | Jeder Sonntag, darunter Ostersonntag, Pfingstsonntag, Volkstrauertag und Totensonntag |
| `gesetzlicher-feiertag` | Gesetzlicher Feiertag am Ort der Arbeitsstätte 00:00–24:00 Uhr | 125 % | Alle gesetzlichen Feiertage, sofern kein besonderes Profil gilt |
| `silvester` | 31. Dezember ab 14:00 Uhr | 125 % | Silvester |
| `besondere-feiertage` | 24. Dezember ab 14:00 Uhr sowie 25. und 26. Dezember und 1. Mai jeweils 00:00–24:00 Uhr | 150 % | Heiligabend, 1. und 2. Weihnachtstag, Tag der Arbeit |
| `nacht` | 20:00–06:00 Uhr | 25 % | Unabhängige zeitliche Eigenschaft tatsächlicher Arbeit |
| `nacht-nach-mitternacht` | 00:00–04:00 Uhr, wenn die Nachtarbeit vor 00:00 Uhr begonnen wurde | 40 % | Unabhängige zeitliche Eigenschaft tatsächlicher Arbeit |

Beginnt die Arbeit vor 00:00 Uhr, zählt die Arbeit von 00:00 bis 04:00 Uhr des Folgetags nach § 3b Abs. 3 EStG weiterhin als
Sonntags- beziehungsweise Feiertagsarbeit. Treffen mehrere Tagesmerkmale zusammen, darf die Anwendung steuerliche Höchstsätze
nicht ungeprüft addieren. Die konkrete Zuschlagsberechnung wird erst in einem eigenen Umsetzungstodo verbindlich festgelegt.

## Offene Entscheidungen

- [ ] Festlegen, ob Ostersonntag und Pfingstsonntag als sichtbare systemdefinierte besondere Tage in NRW geführt werden oder
      ausschließlich über die Sonntagsregel erkennbar bleiben.
- [ ] Festlegen, ob die gesetzlichen Feiertage initial aktiv mit dem Sonntagsprofil verknüpft oder mit einer kopierten
      Sonntagsöffnung vorbelegt werden. Eine spätere Änderung der Sonntagsöffnung darf bestehende eigene Feiertagsregeln nicht
      unbeabsichtigt überschreiben.
- [ ] Festlegen, ob Sperr- und Spielverbotszeiten unveränderliche Grenzen oder nur dokumentierte Vorbelegungen bilden. Vor der
      Umsetzung ist zu klären, welche Abweichungen rechtlich überhaupt zulässig sind.
- [ ] Festlegen, welche Zuschläge das Unternehmen tatsächlich zahlt. Die steuerlichen Höchstsätze allein erzeugen keinen
      Zahlungsanspruch.
- [ ] Prüfen, ob weitere landesrechtlich relevante Tage oder zeitlich begrenzte Sonderregelungen ergänzt werden müssen.

## Pflegeablauf

1. Änderung ausschließlich anhand einer dokumentierten offiziellen Quelle bewerten.
2. Betroffenen Kalendertag, Betriebsregel und Zuschlagsprofil getrennt aktualisieren.
3. Rechtsgrundlage, Gültigkeitszeitraum und Prüfdatum ergänzen.
4. Lokale Datumsberechnung und mehrere Referenzjahre automatisiert testen.
5. Datenübergang bestehender Filialeinstellungen festlegen, ohne eigene Anpassungen zu überschreiben.
6. Sicherstellen, dass bestehende Dienstplan-Momentaufnahmen unverändert bleiben.
7. Fachkonzept, Architektur und Projektstand gemeinsam aktualisieren.
