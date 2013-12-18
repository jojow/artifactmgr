#!/bin/bash

# Some helper functions
echoerr() { echo "$@" 1>&2; }

# Expect env var
if [ "$TestProp" != "got it" ]; then
  echoerr "Error: env var TestProp not correct!"

  exit 1
fi

# Expect first input param
if [ "$1" != "foo" ]; then
  echoerr "Error: first param not correct!"

  exit 1
fi

# Expect second input param
if [ "$2" != "bar" ]; then
  echoerr "Error: second param not correct!"

  exit 1
fi

# Put prefixed second param to stdout
echo "here we go, this is the second param printed to stdout: $2"

exit 0
