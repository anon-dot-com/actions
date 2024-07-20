set fallback := true

vault := "local-vault-op-k8s"
item := "apikey-repository-cloudsmith"

install:
  yarn install

build: install
    #!/usr/bin/env nu
    yarn run build

    npx rollup dist/index.js --file dist/index.cjs --format cjs

    # Define the directories to process
    let directories = ["amazon", "linkedin", "instagram", "ipAddressUtil"]

    # Loop through each directory and run rollup
    for dir in $directories {
        let input_file = $"dist/($dir)/index.js"
        let output_file = $"dist/($dir)/index.cjs"
        npx rollup $input_file --file $output_file --format cjs
    }

nix:
  nix build

installDependencies:
 #!/usr/bin/env nu
 source {{justfile_directory()}}/../nu/node.nu
 let $anonDependencies = get_dependencies "package.json"
 build_yarn $anonDependencies

publish:
  #!/usr/bin/env bash
  export CLOUDSMITH_API_KEY=`op read -n "op://{{vault}}/{{item}}/apikey"`

  VERSION=$(jq -r '.version' package.json)
  TARBALL="anon-actions-${VERSION}.tgz"

  nix build '.#dist'
  cloudsmith push npm anon/anon-sdk "./result/tarballs/${TARBALL}"

push target_branch="main":
  #!/usr/bin/env bash
  # we use git subtree here to push the actions library directory to a separate repo 
  # this lets us have a single source of truth while keeping the monorepo private
  # https://github.com/anon-dot-com/actions

  current_branch=$(git branch --show-current)

  if [ "$current_branch" == "development" ] || [ "{{target_branch}}" != "main" ]; then
    echo "Publishing actions library to actions repo"
    # git subtree must be run from project root
    cd {{justfile_directory()}}/../../ && \
    git subtree -P lib/actions push git@github.com:anon-dot-com/actions.git {{target_branch}}
  else
    echo "You must be on the development branch in the monorepo to push to the main branch of actions repo."
  fi