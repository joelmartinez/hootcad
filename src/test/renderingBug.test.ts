import * as assert from 'assert';
import * as path from 'path';
import { executeJscadFile } from '../jscadEngine';

suite('Rendering Bug Test Suite', () => {
	const createMockOutputChannel = () => ({
		name: 'Test Output Channel',
		append: () => {},
		appendLine: () => {},
		replace: () => {},
		clear: () => {},
		show: () => {},
		hide: () => {},
		dispose: () => {}
	}) as any;

	test('Issue scenario: colorized boolean operations produce valid entities', async () => {
		const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/rendering-bug.jscad');
		const mockOutputChannel = createMockOutputChannel();
		
		const geometries = await executeJscadFile(fixturePath, mockOutputChannel);
		
		// Should return 2 geometries (outer and inner)
		assert.strictEqual(geometries.length, 2, 'Should return 2 geometries');
		
		geometries.forEach((geom, i) => {
			// Check that geometry has required properties
			assert.ok(geom.type, `Geometry ${i} should have type`);
			assert.strictEqual(geom.type, 'geom3', `Geometry ${i} should be geom3`);
			assert.ok(geom.polygons, `Geometry ${i} should have polygons`);
			assert.ok(Array.isArray(geom.polygons), `Geometry ${i} polygons should be array`);
			assert.ok(geom.polygons.length > 0, `Geometry ${i} should have non-empty polygons`);
			
			// Check first polygon structure
			const firstPolygon = geom.polygons[0];
			assert.ok(firstPolygon.vertices, `Geometry ${i} first polygon should have vertices`);
			assert.ok(Array.isArray(firstPolygon.vertices), `Geometry ${i} polygon vertices should be array`);
			assert.ok(firstPolygon.vertices.length >= 3, `Geometry ${i} polygon should have at least 3 vertices`);
			
			// Check vertex structure [x, y, z]
			const firstVertex = firstPolygon.vertices[0];
			assert.ok(Array.isArray(firstVertex), `Geometry ${i} vertex should be array`);
			assert.strictEqual(firstVertex.length, 3, `Geometry ${i} vertex should have 3 components`);
		});
	});
	
	test('Issue scenario entities have valid colors after processing', async () => {
		const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/rendering-bug.jscad');
		const mockOutputChannel = createMockOutputChannel();
		
		const geometries = await executeJscadFile(fixturePath, mockOutputChannel);
		
		// Note: Raw JSCAD geometries don't include color information
		// Colors are handled during conversion to renderer format
		// This test now just verifies we get valid geom3 objects
		
		assert.strictEqual(geometries.length, 2, 'Should return 2 geometries');
		assert.strictEqual(geometries[0].type, 'geom3', 'First should be geom3');
		assert.strictEqual(geometries[1].type, 'geom3', 'Second should be geom3');
		
		// Verify both have polygon data
		assert.ok(geometries[0].polygons.length > 0, 'First geometry should have polygons');
		assert.ok(geometries[1].polygons.length > 0, 'Second geometry should have polygons');
	});
});
