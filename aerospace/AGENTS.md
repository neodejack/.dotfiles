# AeroSpace instructions

## tldraw offline focus workaround

- Match tldraw by bundle ID `com.tldraw.desktop`, not app name. Its rule in `.aerospace.toml` floats it and moves it to `ai_dev`.

### Symptom

When tldraw is focused in `ai_dev`, switching to another workspace such as `terminal` briefly displays the destination, then immediately flickers back to tldraw and `ai_dev`. Other applications do not exhibit this behavior.

### Root cause

- AeroSpace emulates hidden workspaces by moving their windows off-screen.
- tldraw offline 1.11.0 bundled this macOS handler in `Contents/Resources/app.asar`:

  ```js
  window2.on("moved", () => window2.webContents.focus())
  ```

- AeroSpace moving tldraw off-screen emitted `moved`; the handler then called `webContents.focus()`, causing Electron/macOS to reactivate tldraw. AeroSpace observed that native focus change and followed it back to tldraw's `ai_dev` workspace.

## Installed patch

- The patched app is `~/Applications/tldraw offline patched.app`; the old `/Applications/tldraw offline.app` has been deleted.
- The original vendor-signed 1.11.0 app is backed up under `~/Library/Application Support/tldraw-patch-backups/`; restore it from there if a clean copy is needed.
- The patch removes the complete macOS `moved` handler from `out/main/index.js` inside `app.asar`.
- Repacking must keep both `node_modules/@parcel/watcher-darwin-*` directories unpacked, update the `ElectronAsarIntegrity` ASAR-header SHA-256 in `Info.plist`, and ad-hoc sign nested Mach-O files/frameworks from the inside out.
- The outer app and Electron helper apps require `com.apple.security.cs.disable-library-validation = true` after local signing, in addition to their existing JIT, unsigned-executable-memory, audio, and camera entitlements.
- tldraw updates may overwrite the patch. Reinspect the packaged main process before reapplying it; do not assume line numbers remain stable.

## Verification

Confirm AeroSpace is managing the patched executable:

```bash
aerospace list-windows --monitor all --app-bundle-id com.tldraw.desktop \
  --format '%{app-exec-path}\t%{workspace}\t%{window-layout}'
```

The executable should come from `~/Applications/tldraw offline patched.app`, with workspace `ai_dev` and layout `floating`. Focus tldraw, run `aerospace workspace terminal`, and confirm `aerospace list-workspaces --focused` remains `terminal`; this was the regression test used after patching.
