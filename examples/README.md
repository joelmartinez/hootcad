# HootCAD Examples

This directory contains example JSCAD files to demonstrate HootCAD's rendering capabilities.

## Files

- **cube.jscad** - Simple 10x10x10 cube
- **sphere.jscad** - Sphere with radius 8
- **snowman.jscad** - More complex model combining multiple primitives
- **parametric-cube.jscad** - Interactive parametric model with adjustable parameters

## Usage

1. Open one of these files in VS Code
2. Run the command: **HootCAD: Open Preview** (Ctrl+Shift+P / Cmd+Shift+P)
3. The 3D preview will appear in a side panel
4. Use mouse to interact:
   - **Left click + drag**: Rotate the camera
   - **Mouse wheel**: Zoom in/out

## Parametric Models

The `parametric-cube.jscad` example demonstrates HootCAD's parameter UI feature:

1. Open `parametric-cube.jscad`
2. Run **HootCAD: Open Preview**
3. A floating parameter panel will appear on the right side
4. Adjust parameters using the controls:
   - **Shape**: Choose between cube, sphere, or cylinder
   - **Size**: Adjust the size of the shape
   - **Height**: Set cylinder height (when cylinder is selected)
   - **Center**: Toggle centering at origin
   - **Segments**: Adjust smoothness of sphere/cylinder
5. Changes are applied instantly and automatically re-render the geometry
6. Parameter values are saved and persist even when you close and reopen the preview

## Creating Your Own JSCAD Files

A basic JSCAD file must:
1. Import required functions from `@jscad/modeling`
2. Export a `main()` function that returns geometry
3. Have a `.jscad` file extension

### Basic Example:
```javascript
const { cube } = require('@jscad/modeling').primitives

const main = () => cube({ size: 10 })

module.exports = { main }
```

### Parametric Example:
```javascript
const { cube } = require('@jscad/modeling').primitives

const getParameterDefinitions = () => {
  return [
    { name: 'size', type: 'number', initial: 10, min: 1, max: 50, step: 1, caption: 'Size' },
    { name: 'center', type: 'checkbox', checked: true, caption: 'Center' }
  ]
}

const main = (params) => {
  return cube({ 
    size: params.size || 10, 
    center: params.center !== undefined ? params.center : true 
  })
}

module.exports = { main, getParameterDefinitions }
```

## Supported Parameter Types

- **number/int**: Numeric input field
- **slider**: Range slider (requires min/max)
- **text**: Text input field
- **checkbox**: Boolean toggle
- **choice**: Dropdown selection
- **color**: Color picker
- **date**: Date picker
- **email**: Email input
- **password**: Password input
- **url**: URL input

