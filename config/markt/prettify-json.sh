# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
set -euo pipefail

find . -type f -path '**/*.json' | xargs -I % sh -c "jq --sort-keys --indent 4 . % | sponge %"
find . -type f -path '**/*.json' | xargs chmod -x
