# Cursor IDE Compatibility

This document details HootCAD's compatibility with Cursor IDE and provides guidance for users and developers.

## Overview

**HootCAD is fully compatible with both VS Code and Cursor IDE** using the same extension package (`.vsix` file).

Cursor is a fork of VS Code that maintains high compatibility with VS Code extensions while adding AI-powered features. Since HootCAD uses only standard VS Code APIs, it works seamlessly in both editors.

## Why One Package Works for Both

### Shared Architecture
- **Cursor is a VS Code fork**: Cursor is built on the VS Code codebase, inheriting its extension API and architecture
- **Same extension format**: Both use `.vsix` packages with identical structure
- **Compatible APIs**: HootCAD uses VS Code API `^1.107.0`, which is supported by Cursor

### No Cursor-Specific Code Needed
HootCAD works in Cursor without any modifications because:
- It uses only standard VS Code extension APIs
- No editor-specific APIs or features are used
- The extension is self-contained with bundled dependencies
- WebGL rendering works identically in both editors

## Installation in Cursor

### Option 1: Install from VSIX (Recommended)

1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/joelmartinez/hootcad/releases)
2. Open Cursor
3. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. Type "Extensions: Install from VSIX..."
5. Select the downloaded `.vsix` file

### Option 2: Drag and Drop

1. Download the `.vsix` file
2. Open Cursor
3. Open Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Drag and drop the `.vsix` file into the Extensions view

### Option 3: Command Line

```bash
cursor --install-extension /path/to/hootcad-<version>.vsix
```

## Publishing Considerations

### Single Package for Both Editors
- **One `.vsix` package**: The same package works for both VS Code and Cursor
- **No separate builds**: No need to maintain separate packages or build processes
- **Unified versioning**: Same version number for both platforms

### Marketplace Distribution

#### VS Code Marketplace
- Extensions can be published to the official VS Code Marketplace
- Used by VS Code users by default
- Requires Microsoft publisher account

#### OpenVSX Registry (Cursor's Default)
- Cursor uses OpenVSX as its default extension registry (since 2024)
- Open-source, community-driven alternative to VS Code Marketplace
- Publishing to OpenVSX makes the extension discoverable in Cursor's extension marketplace
- Free to publish, no licensing restrictions

#### Recommendation
For maximum reach:
1. Publish to VS Code Marketplace (for VS Code users)
2. Publish to OpenVSX (for Cursor users and open-source distribution)
3. Both can use the same `.vsix` package

## Validation and Testing

### Compatibility Verification

HootCAD has been verified to work in Cursor IDE with the following:

✅ **Core Functionality**
- JSCAD file execution and rendering
- 3D preview panel with WebGL rendering
- Interactive camera controls (rotate, zoom)
- Export to multiple formats (STL, OBJ, AMF, DXF, SVG, JSON, X3D)

✅ **Extension Features**
- Command registration (`hootcad.openPreview`, `hootcad.export`)
- Language support for `.jscad` files
- Syntax highlighting
- Status bar integration
- Output channel logging
- File watchers and auto-refresh

✅ **User Interface**
- Webview panel rendering
- Parameter UI for interactive parameters
- Export format selection dialogs
- Progress notifications

### Manual Testing Checklist

When testing in Cursor:

- [ ] Extension activates when opening a `.jscad` file
- [ ] Command "HootCAD: Open Preview" is available
- [ ] Command "HootCAD: Export" is available
- [ ] Preview panel opens and displays 3D geometry
- [ ] Camera controls work (mouse drag to rotate, wheel to zoom)
- [ ] Status bar shows current file name
- [ ] Output channel shows logs
- [ ] File save triggers auto-refresh of preview
- [ ] Export dialog works and generates files
- [ ] Parameter UI displays for files with `getParameterDefinitions`

## Technical Details

### API Compatibility

| Feature | VS Code API | Cursor Support |
|---------|-------------|----------------|
| Extension activation | ✅ `^1.107.0` | ✅ Compatible |
| Commands | ✅ `vscode.commands` | ✅ Compatible |
| Webview | ✅ `vscode.window.createWebviewPanel` | ✅ Compatible |
| File watchers | ✅ `vscode.workspace.onDidSaveTextDocument` | ✅ Compatible |
| Status bar | ✅ `vscode.window.createStatusBarItem` | ✅ Compatible |
| Output channel | ✅ `vscode.window.createOutputChannel` | ✅ Compatible |
| Language support | ✅ `contributes.languages` | ✅ Compatible |
| File dialogs | ✅ `vscode.window.showSaveDialog` | ✅ Compatible |

### Dependencies

All dependencies are bundled in the extension:
- `@jscad/modeling` - JSCAD modeling library
- `three` - Three.js for 3D rendering
- JSCAD serializers (STL, OBJ, AMF, etc.)

No external dependencies are required from the editor.

### Build Process

The build process is identical for both VS Code and Cursor:

```bash
npm install          # Install dependencies
npm run lint         # Lint TypeScript code
npm run package      # Build with webpack
npm run package:vsix # Create .vsix package
```

The resulting `.vsix` file works in both editors.

## Frequently Asked Questions

### Q: Do I need to build separate packages for VS Code and Cursor?
**A:** No! The same `.vsix` package works for both editors.

### Q: Will future updates work in Cursor?
**A:** Yes, as long as HootCAD continues to use standard VS Code APIs (which is the plan), all updates will work in both editors.

### Q: Can I publish to both VS Code Marketplace and OpenVSX?
**A:** Yes! The same package can be published to both registries. This is recommended for maximum reach.

### Q: Are there any features that won't work in Cursor?
**A:** No. HootCAD uses only standard APIs that are supported by both editors.

### Q: What if Cursor and VS Code APIs diverge in the future?
**A:** HootCAD's modular architecture (see `ARCHITECTURE.md`) makes it easy to add editor-specific adapters if needed. The core functionality (JSCAD engine, rendering, export) is editor-agnostic.

### Q: Can I test the extension in both editors during development?
**A:** Yes! You can run the extension in VS Code's Extension Development Host (F5), and separately install the packaged `.vsix` in Cursor for testing.

## Architecture for Multi-Editor Support

HootCAD's architecture naturally supports multiple editors:

```
Core (Editor-agnostic)
├── jscadEngine.ts      - JSCAD execution
├── threeJsConverter.ts - Geometry conversion
├── exportCommand.ts    - Export functionality
└── exportFormatRegistry.ts - Format serializers

Editor Integration (VS Code/Cursor compatible)
├── extension.ts        - Entry point
├── extensionLifecycle.ts - Commands and watchers
├── webviewManager.ts   - Webview lifecycle
└── errorReporter.ts    - Logging

UI Layer (WebGL, editor-agnostic)
└── webview/            - Three.js rendering
```

The separation ensures that:
- Core functionality is editor-agnostic
- Editor-specific code is minimal and isolated
- Future editor support can be added easily

## Maintenance Notes

### For Developers

When adding new features:
1. Use only standard VS Code APIs listed in `package.json` engines
2. Test in both VS Code and Cursor before releasing
3. Avoid editor-specific hacks or workarounds
4. Keep core logic separate from editor integration

### For Publishers

When releasing new versions:
1. Build once: `npm run package:vsix`
2. Test the `.vsix` in both VS Code and Cursor
3. Publish to VS Code Marketplace (optional)
4. Publish to OpenVSX (recommended for Cursor users)
5. Attach `.vsix` to GitHub release (for manual installation)

## Resources

- [Cursor Documentation](https://cursor.com/docs)
- [Cursor Extension Guide](https://cursor.com/docs/configuration/extensions)
- [OpenVSX Registry](https://open-vsx.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [HootCAD Architecture](./ARCHITECTURE.md)

## Conclusion

HootCAD's use of standard VS Code APIs and modular architecture ensures seamless compatibility with both VS Code and Cursor IDE. No separate packages or builds are needed - one `.vsix` package works for both editors, now and in the future.
