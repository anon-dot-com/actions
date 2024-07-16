{
  # flake inputs
  inputs
  # nix packages
, lib
, pkgs
, mkYarnPackage
, typescript
, # flags
  doDist ? false
, ...
}:

# makes all flake inputs available, e.g. nix-filter
with inputs;

let
  libanon = import ../../nix/lib { inherit pkgs; };
  pkgJSON = lib.importJSON ./package.json;
in
mkYarnPackage rec {
  pname = pkgJSON.name;
  version = pkgJSON.version;

  yarnFlags = [
    "--offline"
    "--frozen-lockfile"
    "--ignore-engines"
    "--ignore-scripts"
  ];

  src = nix-filter.lib {
    root = ./.;
    include = [
      "src"
      ./package.json
      ./yarn.lock
      ./tsconfig.json
      (nix-filter.lib.matchExt "ts")
      (nix-filter.lib.matchExt "cjs")
      (nix-filter.lib.matchExt "js")
      (nix-filter.lib.matchExt "json")
    ];
  };

  workspaceDependencies = [ ];

  nativeBuildInputs = [ typescript ];

  buildPhase = ''
    export HOME=$(mktemp -d)
    yarn --offline --frozen-lockfile --production=true build
    npx rollup deps/${pname}/${pkgJSON.main} --file deps/${pname}/${pkgJSON.exports.require} --format cjs
  '';

  postFixup = lib.optionals doDist (libanon.fixupPublishedVersions {
    inherit pkgJSON pname workspaceDependencies;
  });
}
