# pur-system/scripts/deploy-hostings.sh

set -euo pipefail

projekt_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$projekt_root"

ziel="${1:-}"
build_befehle=()
hosting_ziele=''
deploy_beschreibung=''

case "$ziel" in
  master)
    build_befehle=('build:master')
    hosting_ziele='hosting:master'
    deploy_beschreibung='Pur Master | Hosting: pur-master.web.app'
    ;;
  office)
    build_befehle=('build:office')
    hosting_ziele='hosting:office'
    deploy_beschreibung='Pur Office | Hosting: pur-office.web.app'
    ;;
  filiale)
    build_befehle=('build:filiale')
    hosting_ziele='hosting:filiale'
    deploy_beschreibung='Pur Filiale | Hosting: pur-filiale.web.app'
    ;;
  mitarbeiter)
    build_befehle=('build:mitarbeiter')
    hosting_ziele='hosting:mitarbeiter'
    deploy_beschreibung='Pur Mitarbeiter | Hosting: pur-mitarbeiter.web.app'
    ;;
  all)
    build_befehle=('build:master' 'build:office' 'build:filiale' 'build:mitarbeiter')
    hosting_ziele='hosting:master,hosting:office,hosting:filiale,hosting:mitarbeiter'
    deploy_beschreibung='Alle Pur-Hostings | Ziele: Master, Office, Filiale und Mitarbeiter'
    ;;
  *)
    echo 'Ungültiges Hosting-Ziel. Erlaubt sind: master, office, filiale, mitarbeiter und all.' >&2
    exit 2
    ;;
esac

printf '%s' "$deploy_beschreibung deployen? Firebase-Projekt: pur-system | Mit Service Worker | Fortfahren? (j/N) "
read -r bestaetigung

if [[ "$bestaetigung" != "j" ]]; then
  echo 'Deploy abgebrochen.'
  exit 0
fi

for build_befehl in "${build_befehle[@]}"; do
  npm run "$build_befehl"
done

firebase deploy --project pur-system --only "$hosting_ziele"
