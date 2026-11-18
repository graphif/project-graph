#!/usr/bin/env bash
set -eo pipefail
: "${ASSET_DIR:?}" "${RELEASE_TAG:?}" "${GITHUB_SHA:?}" "${RELEASE_NAME:?}"

linux="$ASSET_DIR/release-ubuntu-22.04"
macos="$ASSET_DIR/release-macos-latest"
windows="$ASSET_DIR/release-windows-latest"
declare -a deb=() rpm=() dmg=() archive=() exe=() signatures=()

file_list=$(mktemp)
trap 'rm -f -- "$file_list"' EXIT
for directory in "$linux" "$macos" "$windows"; do
  if [[ -d "$directory" ]]; then
    find "$directory" -type f -print0
  fi
done > "$file_list"
while IFS= read -r -d '' file; do
  case "$file" in
    "$linux/"*.deb) deb+=("$file") ;;
    "$linux/"*.rpm) rpm+=("$file") ;;
    "$macos/"*.dmg) dmg+=("$file") ;;
    "$macos/"*.app.tar.gz) archive+=("$file") ;;
    "$windows/"*.exe) exe+=("$file") ;;
    *.sig) signatures+=("$file") ;;
  esac
done < "$file_list"

if (( ! ${#deb[@]} || ! ${#rpm[@]} || ! ${#dmg[@]} || ! ${#archive[@]} || ! ${#exe[@]} )); then
  echo "::error::Release requires Linux DEB and RPM, macOS DMG and app archive, and Windows installer"
  exit 1
fi
for file in "${rpm[@]}" "${archive[@]}" "${exe[@]}"; do
  if [[ ! -s "$file.sig" ]]; then
    echo "::error::Missing updater signature for $file"
    exit 1
  fi
done

assets=("${deb[@]}" "${rpm[@]}" "${dmg[@]}" "${archive[@]}" "${exe[@]}" "${signatures[@]}")
for file in "${assets[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "::error::Empty release asset: $file"
    exit 1
  fi
done

notes=$(node .github/scripts/generate-changelog.mjs)
options=()
if [[ "$PRERELEASE" == true ]]; then
  options+=(--prerelease --latest=false)
fi

# gh stages the supplied assets in a draft before publishing.
gh release create "$RELEASE_TAG" "${assets[@]}" --target "$GITHUB_SHA" --title "$RELEASE_NAME" --notes "$notes" "${options[@]}"
