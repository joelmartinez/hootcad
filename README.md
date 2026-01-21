# HootCAD 🦉

**Design CAD models with code. Preview in real-time. Export to production.**

HootCAD brings scriptable CAD workflows to VS Code and Cursor. Write JSCAD scripts, see instant 3D previews, and export to formats ready for manufacturing.

> Works seamlessly in both VS Code and Cursor IDE

## Why HootCAD?

Traditional CAD tools treat designs as opaque binary files. HootCAD embraces a different philosophy: **design is code, code is design.** This means:

- ✅ **Version control** your designs with meaningful diffs
- ✅ **Parametric designs** that adapt to your specifications
- ✅ **Code review** CAD models like software
- ✅ **Collaborate** with teammates using standard dev workflows
- ✅ **AI-assisted** design with MCP integration for coding agents

## Core Features

🎨 **Live 3D Preview** - Instant WebGL rendering of JSCAD scripts with interactive camera controls

📦 **Multi-Format Export** - Export to STL, OBJ, AMF, DXF, SVG, and more for 3D printing or manufacturing

🤖 **MCP Server** - Optional Model Context Protocol server for AI coding agents (safe math evaluation, CAD guidance)

⚡ **Smart Resolution** - Automatically finds your JSCAD entrypoint (package.json, index.jscad, or active file)

## Installation

### From Releases (Recommended)

1. Download the latest `.vsix` file from [Releases](https://github.com/joelmartinez/hootcad/releases)
2. Open VS Code or Cursor
3. Press `Ctrl+Shift+P` (`Cmd+Shift+P` on Mac)
4. Type "Extensions: Install from VSIX..."
5. Select the downloaded file

*Publishing to VS Code Marketplace and OpenVSX coming soon.*

## Quick Start

**Create your first CAD model in 60 seconds:**

1. Create a new file `cube.jscad`:
   ```javascript
   const { cube } = require('@jscad/modeling').primitives
   
   const main = () => cube({ size: 10 })
   
   module.exports = { main }
   ```

2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

3. Run **HootCAD: Open Preview**

4. Interact with your 3D model:
   - **Drag** to rotate
   - **Scroll** to zoom

5. Export to STL, OBJ, or other formats via **HootCAD: Export**

💡 Check the `examples/` directory for more sample models.

## Available Commands

| Command | Description |
|---------|-------------|
| **HootCAD: Open Preview** | Opens a live 3D preview of your JSCAD model |
| **HootCAD: Export** | Export to STL, OBJ, AMF, DXF, SVG, JSON, or X3D |
| **HootCAD: Enable MCP Server** | Enable AI agent integration (optional) |

## AI Agent Integration (Optional)

HootCAD includes an optional **Model Context Protocol (MCP) server** for AI coding agents like GitHub Copilot and Cursor:

**🤖 CAD Guidance** - Get expert design advice for JSCAD, manufacturability, and spatial reasoning

**🧮 Safe Math** - Evaluate dimensional calculations without arbitrary code execution

**🔒 Security-First** - No filesystem access, no eval, no code execution - just safe math operations

Enable via **HootCAD: Enable MCP Server** command when prompted. The extension provides setup instructions for your coding agent.

## Contributing

We welcome contributions! HootCAD is gearing up for its first major release.

**To contribute:**

1. Check [existing issues](https://github.com/joelmartinez/hootcad/issues) or open a new one
2. Fork the repository and create a feature branch
3. See [ARCHITECTURE.md](./ARCHITECTURE.md) for codebase structure
4. Submit a pull request

**Development setup:**
```bash
git clone https://github.com/joelmartinez/hootcad
cd hootcad
npm install
```

Press `F5` in VS Code to launch the Extension Development Host. See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed development information.

## Roadmap

HootCAD's vision is to bring professional software engineering workflows to CAD:

- ✅ **Phase 1-2**: Core rendering and parametric UI (Complete)
- 🔄 **Phase 3**: Enhanced rendering quality
- 🔄 **Phase 4**: Production export workflows and automation
- 🔄 **Phase 5**: TypeScript CAD (`.tscad`) support
- 🔄 **Future**: OpenCascade integration, advanced AI workflows

See [ROADMAP.md](./ROADMAP.md) for details.

## License

MIT License - see LICENSE file for details

## Links

- **Repository**: [github.com/joelmartinez/hootcad](https://github.com/joelmartinez/hootcad)
- **Issues**: [Report bugs or request features](https://github.com/joelmartinez/hootcad/issues)
- **Releases**: [Download latest version](https://github.com/joelmartinez/hootcad/releases)
