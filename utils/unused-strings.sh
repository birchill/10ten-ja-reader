#!/bin/bash

# This is currently just something we run manually whenever we're doing major
# changes to the strings being used. It would be easy to set up as a GitHub
# action but first we'd need to make it iterate over all the languages in
# _locales.
#
# ... And we'd also need to make it return a suitable error code

errors=0

mapfile -t messages < <(jq -r 'keys[]' ../_locales/en/messages.json)
for message in ${messages[@]}; do
  if [[ $(rg ${message} ../{html,src,css} ../*.src | wc -l) == 0 ]];then
    # content_names_tag_* currently gets a free pass since we programmatically
    # generate those.
    if [[ $message != content_names_tag_* ]]; then
      echo ${message} has no matches!
      ((errors=errors+1))
    fi
  fi
done

echo Done with ${errors} error\(s\).
