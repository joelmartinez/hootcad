/**
 * Converts JSCAD geometries to Three.js BufferGeometry
 * 
 * JSCAD geometries come in two types:
 * - geom3 (3D solids): have `polygons` array with convex faces
 * - geom2 (2D paths): have `sides` array with line segments
 * 
 * This module provides conversion functions that can be used both in Node.js
 * (for preprocessing) and in the webview (for rendering).
 */

/**
 * JSCAD polygon structure (from geom3)
 */
export interface Polygon {
    vertices: number[][]; // Array of [x, y, z] points
}

/**
 * JSCAD geom3 structure (3D solid)
 */
export interface Geom3 {
    polygons: Polygon[];
    transforms?: number[]; // 4x4 matrix as flat array
}

/**
 * JSCAD geom2 structure (2D path)
 */
export interface Geom2 {
    sides: number[][][]; // Array of [[x,y], [x,y]] line segments
    transforms?: number[];
}

/**
 * Geometry data ready for Three.js BufferGeometry
 */
export interface BufferGeometryData {
    positions: Float32Array;
    normals?: Float32Array;
    indices?: Uint16Array | Uint32Array;
    transforms?: number[];
}

/**
 * Triangulates a convex polygon using fan triangulation.
 * Assumes the polygon is convex (safe for JSCAD geometries).
 * 
 * @param vertices Array of [x,y,z] points
 * @returns Array of triangle index triplets relative to the polygon's vertices
 */
export function triangulatePolygon(vertices: number[][]): number[][] {
    if (vertices.length < 3) {
        return [];
    }
    
    const triangles: number[][] = [];
    
    // Fan triangulation: connect vertex 0 to all other edges
    for (let i = 1; i < vertices.length - 1; i++) {
        triangles.push([0, i, i + 1]);
    }
    
    return triangles;
}

/**
 * Converts a JSCAD geom3 (3D solid) to BufferGeometry data.
 * 
 * Process:
 * 1. Walk all polygons and triangulate them
 * 2. Collect all triangle vertices (non-indexed for simplicity)
 * 3. Compute per-face normals
 * 4. Return flat arrays suitable for Three.js
 * 
 * Note: We use non-indexed geometry for simplicity. Three.js can optimize this
 * later if needed, and it avoids complex vertex deduplication logic.
 * 
 * @param geom3 JSCAD 3D geometry
 * @returns BufferGeometry data
 */
export function convertGeom3ToBufferGeometry(geom3: Geom3): BufferGeometryData {
    const positions: number[] = [];
    const normals: number[] = [];
    
    // Process each polygon
    for (const polygon of geom3.polygons) {
        const vertices = polygon.vertices;
        
        if (vertices.length < 3) {
            continue; // Skip degenerate polygons
        }
        
        // Compute face normal using first three vertices
        const v0 = vertices[0];
        const v1 = vertices[1];
        const v2 = vertices[2];
        
        // Edge vectors
        const edge1 = [
            v1[0] - v0[0],
            v1[1] - v0[1],
            v1[2] - v0[2]
        ];
        const edge2 = [
            v2[0] - v0[0],
            v2[1] - v0[1],
            v2[2] - v0[2]
        ];
        
        // Cross product for normal
        const normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ];
        
        // Normalize
        const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        if (length > 0) {
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;
        }
        
        // Triangulate the polygon
        const triangles = triangulatePolygon(vertices);
        
        // Add each triangle
        for (const triangle of triangles) {
            for (const vertexIndex of triangle) {
                const vertex = vertices[vertexIndex];
                
                // Add position
                positions.push(vertex[0], vertex[1], vertex[2]);
                
                // Add normal (same for all vertices in this triangle)
                normals.push(normal[0], normal[1], normal[2]);
            }
        }
    }
    
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        transforms: geom3.transforms
    };
}

/**
 * Converts a JSCAD geom2 (2D path) to line geometry data.
 * 
 * @param geom2 JSCAD 2D geometry
 * @returns BufferGeometry data for lines
 */
export function convertGeom2ToLineGeometry(geom2: Geom2): BufferGeometryData {
    const positions: number[] = [];
    
    // Process each line segment
    for (const side of geom2.sides) {
        if (side.length === 2) {
            // Start point (x, y, z=0)
            positions.push(side[0][0], side[0][1], 0);
            // End point (x, y, z=0)
            positions.push(side[1][0], side[1][1], 0);
        }
    }
    
    return {
        positions: new Float32Array(positions),
        transforms: geom2.transforms
    };
}

/**
 * Type guard to check if a geometry is geom3
 */
export function isGeom3(geom: any): geom is Geom3 {
    return geom && Array.isArray(geom.polygons);
}

/**
 * Type guard to check if a geometry is geom2
 */
export function isGeom2(geom: any): geom is Geom2 {
    return geom && Array.isArray(geom.sides);
}
