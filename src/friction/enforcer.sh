// ============================================================================
// FILE 7: lowercase-enforcer.sh
// ============================================================================
// #!/bin/bash
// # veil-v2.3 — Flat Lowercase Filename & Import Enforcer
// # Run from project root: bash lowercase-enforcer.sh
// # Dry run first:         bash lowercase-enforcer.sh --dry
//
// set -e
//
// DRY_RUN=false
// [[ "$1" == "--dry" ]] && DRY_RUN=true
//
// to_flat_lower() {
//   echo "$1" | tr '[:upper:]' '[:lower:]'
// }
//
// echo "=== PHASE 1: Collect renames ==="
// rm -f /tmp/lc-renames.txt
//
// find src/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.js' -o -name '*.css' \) | while read -r file; do
//   dir=$(dirname "$file")
//   base=$(basename "$file")
//   lower=$(to_flat_lower "$base")
//   if [ "$base" != "$lower" ]; then
//     echo "$base|$lower|$dir" >> /tmp/lc-renames.txt
//   fi
// done
//
// if [ ! -f /tmp/lc-renames.txt ]; then
//   echo "All filenames already lowercase. Nothing to do."
//   exit 0
// fi
//
// echo "=== PHASE 2: Update import references ==="
// while IFS='|' read -r old new dir; do
//   old_no_ext="${old%.*}"
//   new_no_ext="${new%.*}"
//   find src/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.js' \) | while read -r srcfile; do
//     if grep -q "$old_no_ext" "$srcfile" 2>/dev/null; then
//       if $DRY_RUN; then
//         echo "[DRY] Would update imports in $srcfile: $old_no_ext → $new_no_ext"
//       else
//         sed -i.bak "s|${old_no_ext}|${new_no_ext}|g" "$srcfile"
//         rm -f "${srcfile}.bak"
//         echo "[UPDATED] $srcfile: $old_no_ext → $new_no_ext"
//       fi
//     fi
//   done
// done < /tmp/lc-renames.txt
//
// echo "=== PHASE 3: Rename files ==="
// while IFS='|' read -r old new dir; do
//   if $DRY_RUN; then
//     echo "[DRY] $dir/$old → $dir/$new"
//   else
//     mv "$dir/$old" "$dir/_tmp_${new}" 2>/dev/null
//     mv "$dir/_tmp_${new}" "$dir/$new"
//     echo "[RENAMED] $dir/$old → $dir/$new"
//   fi
// done < /tmp/lc-renames.txt
//
// rm -f /tmp/lc-renames.txt
// echo "Done. All filenames and imports are flat lowercase."