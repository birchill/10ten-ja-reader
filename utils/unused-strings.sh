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
    # Skip groups for which we programmatically generate the keys.
    if [[ $message != content_kanji_meta_* && \
          $message != content_names_tag_* && \
          $message != content_hint_switch_dict_keys_* && \
          $message != dial_label_* && \
          $message != field_label_* && \
          $message != gloss_type_label_* && \
          $message != head_info_label_* && \
          $message != lang_label_* && \
          $message != measure_expl_* && \
          $message != misc_label_* && \
          $message != pos_label_* && \
          $message != tabs_*_label ]]; then
      echo ${message} has no matches!
      ((errors=errors+1))
    fi
  fi
done

echo Done with ${errors} error\(s\).
