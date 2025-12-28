# JSCAD Rendering Implementation Notes

## Overview
This implementation adds end-to-end JSCAD rendering capabilities to HootCAD, enabling users to execute JSCAD scripts and visualize the resulting 3D geometry in a WebGL-based viewer.

## Architecture

### Extension Host (Node.js)
- **src/jscadEngine.ts**: Core JSCAD execution and serialization logic
  - `resolveJscadEntrypoint()`: Implements the entrypoint resolution priority
  - `executeJscadFile()`: Dynamically loads and executes .jscad files
  - `serializeGeometry()`: Converts JSCAD geometry to WebGL-compatible format

- **src/extension.ts**: VS Code extension integration
  - `createOrShowPreview()`: Creates/reveals webview panel
  - `executeAndRender()`: Orchestrates JSCAD execution and rendering
  - File save watcher triggers re-rendering

### Webview (Browser)
- Custom WebGL renderer with basic shaders
- Interactive camera controls (mouse drag to rotate, wheel to zoom)
- Proper buffer cleanup to prevent memory leaks
- Error display and status reporting

## Key Features

### 1. Smart Entrypoint Resolution
Priority order:
1. Workspace `package.json` "main" field (if .jscad)
2. `index.jscad` at workspace root
3. Active editor .jscad file
4. User-friendly error if none found

### 2. JSCAD Execution
- Dynamic module loading with require() cache clearing
- Calls exported main() function with empty params {}
- Validates main() function exists
- Comprehensive error handling

### 3. Geometry Serialization
Supports:
- **geom3**: 3D solid geometry → triangulated mesh (positions + indices)
- **geom2**: 2D geometry → outline points
- **path2**: Path geometry → line points

### 4. WebGL Rendering
- Perspective projection with configurable FOV
- Look-at camera with rotation matrix
- Triangle mesh rendering with simple color shading
- Efficient buffer management with cleanup

### 5. Interactive Controls
- **Mouse drag**: Rotate camera around model
- **Mouse wheel**: Zoom in/out
- **Window resize**: Responsive canvas

## Testing

All acceptance criteria verified:
- ✅ Opens and executes .jscad files
- ✅ Renders geometry in preview webview
- ✅ Handles errors gracefully with logging
- ✅ Re-executes on file save
- ✅ Works with all three entrypoint methods

Example files in `examples/` directory:
- `cube.jscad`: Simple 10x10x10 cube (24 vertices, 12 triangles)
- `sphere.jscad`: Sphere with 32 segments
- `snowman.jscad`: Complex multi-primitive model

## Security

CodeQL scan: 0 vulnerabilities found
- No SQL injection, XSS, or path traversal issues
- Proper input validation
- No secrets in code

## Performance Characteristics

**Current v0.5 scope:**
- Single-file execution only (no multi-file dependencies)
- No optimization for large meshes
- Buffer cleanup on each render (not cached)
- Full re-execution on save (no incremental updates)

**Future optimizations (out of scope):**
- Mesh caching and buffer reuse
- Level-of-detail (LOD) rendering
- Frustum culling
- Shader optimizations

## Known Limitations (Intentional)

Per issue requirements, the following are NOT implemented:
- ❌ Parameter UI (getParameterDefinitions)
- ❌ Multi-file dependency tracking
- ❌ File watching beyond manual save
- ❌ Export formats (STL/OBJ/STEP)
- ❌ Advanced rendering (lighting, materials, shadows)
- ❌ 2D geometry optimized rendering

## Code Quality

- TypeScript strict mode enabled
- ESLint passes with 0 errors
- Webpack compiles successfully
- Code review feedback addressed:
  - Module-level imports for better performance
  - WebGL buffer cleanup for memory management
  - Removed unused dependencies

## Browser Compatibility

WebGL requirements:
- WebGL 1.0 support (fallback to experimental-webgl)
- Float32Array support
- Uint16Array support (mesh indices)

Tested contexts:
- VS Code's built-in webview (Electron/Chromium)

## File Structure

```
src/
├── extension.ts          # Main extension + webview HTML
├── jscadEngine.ts        # JSCAD execution engine
└── test/
    └── extension.test.ts # Basic tests

examples/
├── cube.jscad           # Simple cube demo
├── sphere.jscad         # Sphere demo
├── snowman.jscad        # Complex model demo
└── README.md            # Usage instructions
```

## Usage Flow

1. User opens workspace with .jscad file(s)
2. User runs "HootCAD: Open Preview" command
3. Extension resolves entrypoint using priority rules
4. Extension loads and executes .jscad file
5. JSCAD main() returns geometry
6. Extension serializes geometry to JSON
7. Extension sends geometry to webview via postMessage
8. Webview creates WebGL buffers and renders
9. User interacts with 3D view (rotate, zoom)
10. User saves file → auto re-execution and re-render

## Debugging

- Check "HootCAD" output channel for execution logs
- WebView console logs available in VS Code DevTools
- Status bar shows current state (Ready/Executing/Error)
- Error messages displayed in webview overlay

## Next Steps (Future Issues)

Based on issue description, follow-up work includes:
1. Parameter discovery and UI
2. Multi-file dependency resolution
3. File watchers for auto-refresh
4. Export pipeline (STL, STEP, etc.)
5. Advanced rendering features
6. Performance optimizations
