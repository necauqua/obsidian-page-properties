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
          npmDepsHash = "sha256-NCFDrIkGLsrA4mdAznnXeIKpQASkFOXG7qIxk8YomxM=";
          installPhase = ''
            runHook preInstall
            mkdir -p $out/share/obsidian/plugins/page-properties
            mv main.js styles.css manifest.json $out/share/obsidian/plugins/page-properties
            runHook postInstall
          '';
        };
      }
    );
}
