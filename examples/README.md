# HootCAD Examples

This directory contains example JSCAD files to demonstrate HootCAD's rendering capabilities.

## Files

- **cube.jscad** - Simple 10x10x10 cube
- **sphere.jscad** - Sphere with radius 8
- **snowman.jscad** - More complex model combining multiple primitives

## Usage

1. Open one of these files in VS Code
2. Run the command: **HootCAD: Open Preview** (Ctrl+Shift+P / Cmd+Shift+P)
3. The 3D preview will appear in a side panel
4. Use mouse to interact:
   - **Left click + drag**: Rotate the camera
   - **Mouse wheel**: Zoom in/out

## Creating Your Own JSCAD Files

A basic JSCAD file must:
1. Import required functions from `@jscad/modeling`
2. Export a `main()` function that returns geometry
3. Have a `.jscad` file extension

Example:
```javascript
const { cube } = require('@jscad/modeling').primitives

const main = () => cube({ size: 10 })

module.exports = { main }
```
