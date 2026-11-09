#!/bin/sh
# Goku HUD: assemble the regular installer bundle using this car's existing SDK.
# No SDK is downloaded, published or copied off the head unit.
set -eu
BASE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE=${NODE:-/usr/bin/node}
PAYLOAD=${1:-$BASE/dragon_super@0.4.2.goku-update.tgz}
OAP=${GOKU_OAP_ROOT:-/var/opt/public/oap}
INSTALLER=${GOKU_INSTALLER:-$BASE/mgu-app-install.sh}
CHECK_ONLY=${GOKU_CHECK_ONLY:-0}
if [ "$CHECK_ONLY" != 1 ]; then
    [ "$(id -u)" = 0 ] || { echo 'Run this script as root on the head unit.' >&2; exit 1; }
fi
[ -x "$NODE" ] || { echo 'Node.js is missing.' >&2; exit 1; }
[ -f "$PAYLOAD" ] && [ -f "$INSTALLER" ] || { echo 'Keep the payload and mgu-app-install.sh beside install-goku.sh.' >&2; exit 1; }
SDK=
for d in "$OAP"/oap_*/source/node_modules/oap-sdk; do
    if [ -f "$d/index.js" ] && [ -f "$d/package.json" ]; then SDK=$d; break; fi
done
[ -n "$SDK" ] || { echo 'No installed oap-sdk found. Install/update through your existing MGU Store repository, or build with the SDK extracted from this car.' >&2; exit 1; }
WORK=$(mktemp -d "${TMPDIR:-/var/tmp}/goku-hud.XXXXXX")
trap 'rm -rf "$WORK"' EXIT HUP INT TERM
mkdir "$WORK/app"
tar -xzf "$PAYLOAD" -C "$WORK/app"
"$NODE" - "$WORK/app" <<'JS'
var fs=require('fs'),p=process.argv[2],m=JSON.parse(fs.readFileSync(p+'/meta.json','utf8'));
if(m.id!=='dragon_super'||m.version!=='0.4.2'||m.requiresInstalledSDK!==true)throw Error('Wrong Goku HUD payload');
delete m.requiresInstalledSDK;fs.writeFileSync(p+'/meta.json',JSON.stringify(m));
JS
mkdir -p "$WORK/app/source/node_modules/oap-sdk"
cp -a "$SDK/." "$WORK/app/source/node_modules/oap-sdk/"
tar -czf "$WORK/Goku-HUD.mgu" -C "$WORK/app" meta.json source rhmiData oapgen
if [ "$CHECK_ONLY" = 1 ]; then
    echo 'PASS: payload identity, original SDK reuse and complete MGU bundle assembly. No installation requested.'
    exit 0
fi
sh "$INSTALLER" verify "$WORK/Goku-HUD.mgu"
sh "$INSTALLER" install "$WORK/Goku-HUD.mgu"
echo 'Goku HUD 0.4.2 installed. Open Apps > Goku HUD. Select Mode > Off to return the screens to BMW.'
