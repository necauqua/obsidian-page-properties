{
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages."${system}";
      in {
        devShell = pkgs.mkShell {
          buildInputs = [ pkgs.nodejs ];
        };
        packages.default = pkgs.buildNpmPackage {
          name = "obsidian-page-properties";
          src = ./.;
          packageJson = ./package.json;
          packageLockJson = ./package-lock.json;
          npmDepsHash = "sha256-bMzD0478ysBjLB97CRdM9cBHonHTVrlONR+X3h47p4c=";
          installPhase = ''
            mkdir -p $out/share/obsidian/plugins/page-properties
            npm run build
            cp main.js styles.css manifest.json $out/share/obsidian/plugins/page-properties
          '';
        };
      }
    );
}
