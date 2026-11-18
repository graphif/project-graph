#!/usr/bin/env bash
set -euo pipefail
shopt -s globstar nullglob

linux="$ASSET_DIR/release-ubuntu-22.04"
macos="$ASSET_DIR/release-macos-latest"
windows="$ASSET_DIR/release-windows-latest"
deb=("$linux"/**/*.deb)
rpm=("$linux"/**/*.rpm)
dmg=("$macos"/**/*.dmg)
archive=("$macos"/**/*.app.tar.gz)
exe=("$windows"/**/*.exe)

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

assets=("${deb[@]}" "${rpm[@]}" "${dmg[@]}" "${archive[@]}" "${exe[@]}"
  "$linux"/**/*.sig "$macos"/**/*.sig "$windows"/**/*.sig)
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
