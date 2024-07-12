{
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.nix-filter.url = "github:numtide/nix-filter";

  outputs = { nixpkgs, flake-utils, nix-filter, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      rec {
        packages.default = packages.actions;
        packages.dist = packages.actions-dist;
        packages.actions-dist = pkgs.callPackage ./default.nix {
          inherit inputs;
          doDist = true;
        };
        packages.actions = pkgs.callPackage ./default.nix {
          inherit inputs;
        };
      }
    );
}
