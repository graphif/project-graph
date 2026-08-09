#!/bin/sh

if ! which bindgen &> /dev/null; then
  >&2 echo "Please install bindgen!"
  exit 1
fi

bindgen -o src/bindings.rs src/ffi/sentencepiece.h
