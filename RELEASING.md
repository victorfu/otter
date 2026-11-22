# Releasing Otter

Set the version with `npm run version:set -- 1.2.3`. The root package version is synchronized with the desktop package, native crate, Tauri configuration and lockfiles. Run `npm run sync -- --check` to verify.

## Local builds

Run `npm run init` before building for the current platform.

- `npm run build` produces the release executable and its sidecars in `target/release/`.
- `npm run bundle` produces native installers under `target/release/bundle/`. The local launcher disables updater artifacts for this command.
- `npm run release:collect` copies packaged artifacts and checksums to `release/<version>/<platform>/`.

## GitHub releases

Pushing a tag matching the package version (for example `v1.2.3`) starts the [release workflow](.github/workflows/release.yml). The workflow builds platform installers and attaches them to a draft release.

Configure `TAURI_SIGNING_PRIVATE_KEY` and its password in repository secrets for signed updater artifacts. The matching public key is stored in `desktop/src-tauri/tauri.conf.json`. Keep the existing private key backed up. Replacing it breaks update verification for installed copies. For a new signing identity, `npm run updater:keygen` creates a key outside the repository.

The same workflow accepts Apple certificate and notarization credentials and a Windows signing certificate. Review the workflow for the expected secret names and unsigned-build behavior. Review the generated draft and its assets before publishing.
