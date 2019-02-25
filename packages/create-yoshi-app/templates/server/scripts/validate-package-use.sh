#!/usr/bin/env bash

TEMP_DIR=$(mktemp -d)
SOURCE_DIR="$1"

function normalize_package_list() {
  grep -E -v '^\.\.?/' | sort | uniq | perl -pe "s/(@[^\/]+\/)?([^\/]+).*/\1\2/"
}

node -e 'require("module").builtinModules.map(m => console.log(m))' \
  | normalize_package_list > "${TEMP_DIR}/buildins.txt"

npm ls --production --depth=0 --parseable 2>/dev/null \
  | grep node_modules \
  | sed 's#^.*node_modules/\(.*\)$#\1#g' \
  | normalize_package_list > "${TEMP_DIR}/package-json-deps.txt"

grep -E -r 'import\b.*\bfrom\b.*' "$SOURCE_DIR" --include '*.ts' --include '*.js' \
  | perl -pe "s/.+from\b\s+([\"'\`])(.+)\1.*/\2/" \
  | normalize_package_list > "${TEMP_DIR}/code-imports.txt"

grep -E -r 'require\s*\(.+\)' "$SOURCE_DIR" --include '*.ts' --include '*.js' \
  | perl -pe "s/.*require\s*\(\s*([\"'\`])(.+)\1\s*\).*/\2/" \
  | normalize_package_list > "${TEMP_DIR}/code-requires.txt"

cat "${TEMP_DIR}/buildins.txt" "${TEMP_DIR}/package-json-deps.txt" \
  | sort | uniq > "${TEMP_DIR}/available-packages.txt"

cat "${TEMP_DIR}/code-imports.txt" "${TEMP_DIR}/code-requires.txt" \
  | sort | uniq > "${TEMP_DIR}/used-packages.txt"

MISSING_DEPS=$(grep -F -xv -f "${TEMP_DIR}/available-packages.txt" "${TEMP_DIR}/used-packages.txt")

rm -rf "$TEMP_DIR"

if [ -z "$MISSING_DEPS" ]; then
  exit 0;
else
  printf '%s\n' "${MISSING_DEPS[@]}"
  exit 1;
fi
