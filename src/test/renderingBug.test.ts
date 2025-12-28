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
		
		const entities = await executeJscadFile(fixturePath, mockOutputChannel);
		
		// Should return 2 entities (outer and inner)
		assert.strictEqual(entities.length, 2, 'Should return 2 entities');
		
		entities.forEach((entity, i) => {
			// Check that entity has required properties
			assert.ok(entity.visuals, `Entity ${i} should have visuals`);
			assert.ok(entity.geometry, `Entity ${i} should have geometry`);
			
			const geom = entity.geometry;
			
			// Check that geometry has required arrays
			assert.ok(geom.positions, `Entity ${i} should have positions`);
			assert.ok(geom.normals, `Entity ${i} should have normals`);
			assert.ok(geom.indices, `Entity ${i} should have indices`);
			assert.ok(geom.colors, `Entity ${i} should have colors`);
			
			// All should be arrays (serialized from typed arrays)
			assert.ok(Array.isArray(geom.positions), `Entity ${i} positions should be array`);
			assert.ok(Array.isArray(geom.normals), `Entity ${i} normals should be array`);
			assert.ok(Array.isArray(geom.indices), `Entity ${i} indices should be array`);
			assert.ok(Array.isArray(geom.colors), `Entity ${i} colors should be array`);
			
			// Check that arrays are non-empty
			assert.ok(geom.positions.length > 0, `Entity ${i} should have positions`);
			assert.ok(geom.normals.length > 0, `Entity ${i} should have normals`);
			assert.ok(geom.indices.length > 0, `Entity ${i} should have indices`);
			assert.ok(geom.colors.length > 0, `Entity ${i} should have colors`);
			
			// Check that positions, normals, colors are nested arrays (per-vertex data)
			// After serialization, positions/indices/colors are nested arrays,
			// but normals become objects {0:x, 1:y, 2:z} due to Float32Array serialization
			assert.ok(
				Array.isArray(geom.positions[0]) || typeof geom.positions[0] === 'number',
				`Entity ${i} positions[0] should be array or number`
			);
			
			// Check array lengths are consistent
			// This simulates what the webview validation does
			const posLength = Array.isArray(geom.positions[0]) ? geom.positions.length : geom.positions.length / 3;
			const normLength = Array.isArray(geom.normals[0]) ? geom.normals.length : geom.normals.length / 3;
			const colLength = Array.isArray(geom.colors[0]) ? geom.colors.length : geom.colors.length / 4;
			
			console.log(`Entity ${i}:`, {
				positions: posLength,
				normals: normLength,
				colors: colLength,
				indices: geom.indices.length
			});
			
			// For nested arrays, lengths should match (same vertex count)
			if (Array.isArray(geom.positions[0])) {
				if (Array.isArray(geom.normals[0])) {
					assert.strictEqual(
						posLength,
						normLength,
						`Entity ${i} positions and normals should have same length`
					);
				}
				if (Array.isArray(geom.colors[0])) {
					assert.strictEqual(
						posLength,
						colLength,
						`Entity ${i} positions and colors should have same length`
					);
				}
			}
		});
	});
	
	test('Issue scenario entities have valid colors after processing', async () => {
		const fixturePath = path.resolve(__dirname, '../../src/test/fixtures/rendering-bug.jscad');
		const mockOutputChannel = createMockOutputChannel();
		
		const entities = await executeJscadFile(fixturePath, mockOutputChannel);
		
		// Entity 0 should have purple color [0.65, 0.25, 0.8]
		// Entity 1 should have yellow color [0.7, 0.7, 0.1]
		
		const entity0 = entities[0];
		const entity1 = entities[1];
		
		// Check first color value
		const color0 = entity0.geometry.colors[0];
		const color1 = entity1.geometry.colors[0];
		
		if (Array.isArray(color0)) {
			assert.strictEqual(color0[0], 0.65, 'Entity 0 should have R=0.65');
			assert.strictEqual(color0[1], 0.25, 'Entity 0 should have G=0.25');
			assert.strictEqual(color0[2], 0.8, 'Entity 0 should have B=0.8');
		}
		
		if (Array.isArray(color1)) {
			assert.strictEqual(color1[0], 0.7, 'Entity 1 should have R=0.7');
			assert.strictEqual(color1[1], 0.7, 'Entity 1 should have G=0.7');
			assert.strictEqual(color1[2], 0.1, 'Entity 1 should have B=0.1');
		}
	});
});
