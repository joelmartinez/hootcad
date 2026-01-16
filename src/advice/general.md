# General CAD Advice

**ALWAYS use the math.eval or cad.eval tool to verify all mathematical calculations** instead of depending on your own mental math. This is critical for ensuring accuracy in CAD dimensions and transformations.

**Available advice categories**: general, dfm, jscad-specific

## Breaking Down User Queries into JSCAD Primitives

When planning JSCAD code, decompose the user's requirements into basic primitives:

1. **Start with basic shapes**: cube, sphere, cylinder, cuboid, cylinderElliptic, roundedCuboid, roundedCylinder, geodesicSphere, torus
2. **Combine with boolean operations**: union, subtract, intersect
3. **Apply transformations**: translate, rotate, scale, mirror, center, align
4. **Use hulls for organic shapes**: hull, hullChain
5. **Extrude 2D paths**: extrudeLinear, extrudeRotate, extrudeFromSlices

## Spatial Awareness and Coordinate Systems

- JSCAD uses a **right-handed coordinate system**: X (right), Y (forward/up in 2D), Z (up in 3D)
- **Origin (0,0,0)** is the default center for primitives unless offset
- When combining shapes, track their centers and offsets carefully
- Use `center()` or `align()` to reposition shapes predictably
- **Angles are in radians**, not degrees. Use PI for conversions: `degrees * (Math.PI / 180)`

## Dimensional Planning

- Define dimensions as named constants at the top of your code for clarity
- Use the math.eval tool to compute derived dimensions (clearances, offsets, diagonal distances)
- Consider tolerances and clearances for assemblies (typically 0.1-0.5mm for 3D printing)
- Verify critical dimensions with math.eval before finalizing geometry

## Common JSCAD Patterns

- **Walls/Shells**: Use subtract to remove a smaller interior shape from a larger exterior
- **Holes**: Use subtract with cylinders or other shapes positioned at hole locations
- **Patterns**: Use array methods (map, forEach) to create repeated features
- **Chamfers/Fillets**: Use hull or offset operations for rounded edges
- **Complex curves**: Use Bezier curves, ellipses, or arc functions from @jscad/modeling/curves

## Error Prevention

- Always verify that transformations are applied in the correct order (order matters!)
- Check that union/subtract/intersect operations have compatible geometry types
- Ensure all primitives have positive dimensions
- Validate that angles are in radians when required
- Use descriptive variable names to track which dimensions are which
