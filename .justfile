set fallback := true

vault := "local-vault-op-k8s"
item := "apikey-repository-cloudsmith"

install:
  yarn install

build: install
  yarn run build
  npx rollup dist/index.js --file dist/index.cjs --format cjs

nix:
  nix build

installDependencies:
 #!/usr/bin/env nu
 source {{justfile_directory()}}/../nu/node.nu
 let $anonDependencies = get_dependencies "package.json"
 build_yarn $anonDependencies

publish:
  #!/usr/bin/env nix-shell
  #!nix-shell -i bash -p cloudsmith-cli -I nixpkgs=https://github.com/NixOS/nixpkgs/archive/9957cd48326fe8dbd52fdc50dd2502307f188b0d.tar.gz
  export CLOUDSMITH_API_KEY=`op read -n "op://{{vault}}/{{item}}/apikey"`

  VERSION=$(jq -r '.version' package.json)
  TARBALL="anon-actions-${VERSION}.tgz"

  nix build '.#dist'
  cloudsmith push npm anon/actions "./result/tarballs/${TARBALL}"
