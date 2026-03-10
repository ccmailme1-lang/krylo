#!/bin/bash
# convert-signalmap-to-jsx.sh

SRC_PATH="./src/spine/signalmap.tsx"
DST_PATH="./src/spine/signalmap.jsx"

if [ -f "$SRC_PATH" ]; then
    mv "$SRC_PATH" "$DST_PATH"
    echo "[OK] Renamed signalmap.tsx → signalmap.jsx"
else
    echo "[ERROR] $SRC_PATH does not exist!"
    exit 1
fi

if [ -f "$DST_PATH" ]; then
    echo "[OK] Verified: $DST_PATH exists"
else
    echo "[ERROR] Rename failed: $DST_PATH missing"
    exit 2
fi