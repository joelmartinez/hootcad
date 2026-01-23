/**
 * Generates a procedural roughness map for CAD surface texturing
 * 
 * This creates a subtle noise-based roughness texture that adds realism
 * to 3D CAD models by simulating slight surface variations.
 * 
 * Output: src/webview/roughness-map.png
 */

const fs = require('fs');
const path = require('path');

// Simple PNG encoder (no external dependencies)
function createPNG(width, height, pixelData) {
	return createPNGInternal(width, height, pixelData, 0); // Grayscale
}

function createPNGRGB(width, height, pixelData) {
	return createPNGInternal(width, height, pixelData, 2); // RGB
}

function createPNGInternal(width, height, pixelData, colorType) {
	const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	
	function createChunk(type, data) {
		const length = Buffer.alloc(4);
		length.writeUInt32BE(data.length, 0);
		
		const chunk = Buffer.concat([
			Buffer.from(type, 'ascii'),
			data
		]);
		
		const crc = crc32(chunk);
		const crcBuf = Buffer.alloc(4);
		crcBuf.writeUInt32BE(crc, 0);
		
		return Buffer.concat([length, chunk, crcBuf]);
	}
	
	function crc32(buf) {
		let crc = 0xFFFFFFFF;
		for (let i = 0; i < buf.length; i++) {
			crc ^= buf[i];
			for (let j = 0; j < 8; j++) {
				crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
			}
		}
		return (crc ^ 0xFFFFFFFF) >>> 0;
	}
	
	// IHDR chunk
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr.writeUInt8(8, 8);  // bit depth
	ihdr.writeUInt8(colorType, 9);  // 0=grayscale, 2=RGB
	ihdr.writeUInt8(0, 10); // compression
	ihdr.writeUInt8(0, 11); // filter
	ihdr.writeUInt8(0, 12); // interlace
	
	// Prepare image data with filter bytes
	const bytesPerPixel = colorType === 0 ? 1 : 3;
	const scanlineLength = width * bytesPerPixel + 1; // +1 for filter byte
	const imageData = Buffer.alloc(height * scanlineLength);
	
	for (let y = 0; y < height; y++) {
		imageData[y * scanlineLength] = 0; // no filter
		for (let x = 0; x < width; x++) {
			if (colorType === 0) {
				// Grayscale
				imageData[y * scanlineLength + x + 1] = pixelData[y * width + x];
			} else {
				// RGB
				const srcIdx = (y * width + x) * 3;
				const dstIdx = y * scanlineLength + x * 3 + 1;
				imageData[dstIdx] = pixelData[srcIdx];
				imageData[dstIdx + 1] = pixelData[srcIdx + 1];
				imageData[dstIdx + 2] = pixelData[srcIdx + 2];
			}
		}
	}
	
	// Compress using basic deflate
	const zlib = require('zlib');
	const compressed = zlib.deflateSync(imageData, { level: 9 });
	
	// Build PNG
	return Buffer.concat([
		PNG_SIGNATURE,
		createChunk('IHDR', ihdr),
		createChunk('IDAT', compressed),
		createChunk('IEND', Buffer.alloc(0))
	]);
}

// Perlin noise generator (gradient-based)
class NoiseGenerator {
	constructor(seed = 12345) {
		this.seed = seed;
		// Pre-compute gradient vectors
		this.gradients = [];
		for (let i = 0; i < 256; i++) {
			const angle = (this.hash1D(i + seed) / 4294967296) * Math.PI * 2;
			this.gradients[i] = {
				x: Math.cos(angle),
				y: Math.sin(angle)
			};
		}
	}
	
	// Simple hash function for gradient selection
	hash1D(n) {
		n = (n << 13) ^ n;
		return (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
	}
	
	// Hash for 2D grid point
	hash2D(x, y) {
		return this.hash1D(x + this.hash1D(y + this.seed)) & 255;
	}
	
	// Smooth interpolation (quintic for smoother Perlin)
	fade(t) {
		return t * t * t * (t * (t * 6 - 15) + 10);
	}
	
	// Linear interpolation
	lerp(a, b, t) {
		return a + t * (b - a);
	}
	
	// Dot product for gradient
	grad(hash, x, y) {
		const g = this.gradients[hash];
		return g.x * x + g.y * y;
	}
	
	// 2D Perlin noise
	noise(x, y) {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const xf = x - xi;
		const yf = y - yi;
		
		// Get gradient indices for corners
		const aa = this.hash2D(xi, yi);
		const ab = this.hash2D(xi, yi + 1);
		const ba = this.hash2D(xi + 1, yi);
		const bb = this.hash2D(xi + 1, yi + 1);
		
		// Compute dot products
		const u = this.fade(xf);
		const v = this.fade(yf);
		
		// Interpolate
		const x1 = this.lerp(
			this.grad(aa, xf, yf),
			this.grad(ba, xf - 1, yf),
			u
		);
		const x2 = this.lerp(
			this.grad(ab, xf, yf - 1),
			this.grad(bb, xf - 1, yf - 1),
			u
		);
		
		return (this.lerp(x1, x2, v) + 1) * 0.5; // Map from [-1,1] to [0,1]
	}
	
	// Fractal Brownian Motion (layered Perlin noise)
	fbm(x, y, octaves = 4) {
		let value = 0;
		let amplitude = 1;
		let frequency = 1;
		let maxValue = 0;
		
		for (let i = 0; i < octaves; i++) {
			value += this.noise(x * frequency, y * frequency) * amplitude;
			maxValue += amplitude;
			amplitude *= 0.5;
			frequency *= 2;
		}
		
		return value / maxValue;
	}
}

function generateRoughnessMap(width = 512, height = 512) {
	console.log(`Generating ${width}x${height} roughness map...`);
	
	const noise = new NoiseGenerator(42);
	const pixelData = Buffer.alloc(width * height);
	
	// Generate seamless roughness values with layered noise
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			// Seamless tiling using wrapped coordinates
			const wx = x / width;
			const wy = y / height;
			
			// Sample noise at wrapped coordinates for seamless tiling
			const s = wx * Math.PI * 2;
			const t = wy * Math.PI * 2;
			
			// Map to torus in 4D to get seamless 2D noise
			const nx = Math.cos(s);
			const nz = Math.sin(s);
			const ny = Math.cos(t);
			const nw = Math.sin(t);
			
			// Multi-scale noise for realistic surface variation
			const scale1 = noise.fbm(nx * 2 + 100, ny * 2 + 100, 3) * 0.6;
			const scale2 = noise.fbm(nx * 8 + 200, ny * 8 + 200, 2) * 0.25;
			const scale3 = noise.fbm(nx * 16 + 300, ny * 16 + 300, 1) * 0.15;
			
			const combined = scale1 + scale2 + scale3;
			
			// Map to 180-255 range (keeping it subtle - mostly rough with slight variation)
			const value = Math.floor(180 + combined * 75);
			
			pixelData[y * width + x] = Math.max(0, Math.min(255, value));
		}
	}
	
	return pixelData;
}

function generateNormalMap(width = 512, height = 512) {
	console.log(`Generating ${width}x${height} normal map...`);
	
	const noise = new NoiseGenerator(123);
	const noise2 = new NoiseGenerator(456);
	const heightMap = [];
	
	// First generate a seamless height map
	for (let y = 0; y < height; y++) {
		heightMap[y] = [];
		for (let x = 0; x < width; x++) {
			const wx = x / width;
			const wy = y / height;
			
			const s = wx * Math.PI * 2;
			const t = wy * Math.PI * 2;
			
			const nx = Math.cos(s);
			const nz = Math.sin(s);
			const ny = Math.cos(t);
			const nw = Math.sin(t);
			
			// Multi-scale noise with different frequencies for more randomness
			// Large-scale variation
			const large = noise.fbm(nx * 3 + 50, ny * 3 + 50, 3) * 0.5;
			// Medium-scale detail
			const medium = noise.fbm(nx * 8 + 100, ny * 8 + 100, 4) * 0.3;
			// Fine detail with different seed
			const fine = noise2.fbm(nx * 20 + 200, ny * 20 + 200, 3) * 0.2;
			
			const detail = large + medium + fine;
			heightMap[y][x] = detail;
		}
	}
	
	// Convert height map to normal map
	const pixelData = Buffer.alloc(width * height * 3); // RGB
	const strength = 1.5; // Normal map strength
	
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			// Sample neighbors with wrapping for seamless edges
			const xp = (x + 1) % width;
			const xm = (x - 1 + width) % width;
			const yp = (y + 1) % height;
			const ym = (y - 1 + height) % height;
			
			const dX = (heightMap[y][xm] - heightMap[y][xp]) * strength;
			const dY = (heightMap[ym][x] - heightMap[yp][x]) * strength;
			
			// Calculate normal
			const len = Math.sqrt(dX * dX + dY * dY + 1);
			const nx = (dX / len + 1) * 0.5;
			const ny = (dY / len + 1) * 0.5;
			const nz = (1 / len + 1) * 0.5;
			
			const idx = (y * width + x) * 3;
			pixelData[idx] = Math.floor(nx * 255);
			pixelData[idx + 1] = Math.floor(ny * 255);
			pixelData[idx + 2] = Math.floor(nz * 255);
		}
	}
	
	return pixelData;
}

// Main execution
const width = 512;
const height = 512;

console.log('='.repeat(60));
console.log('Surface Texture Generator');
console.log('='.repeat(60));

// Generate roughness map
const roughnessData = generateRoughnessMap(width, height);
const roughnessPNG = createPNG(width, height, roughnessData);
const roughnessPath = path.join(__dirname, '..', 'src', 'webview', 'roughness-map.png');
fs.writeFileSync(roughnessPath, roughnessPNG);

console.log(`✓ Roughness map generated successfully`);
console.log(`  Output: ${roughnessPath}`);
console.log(`  Size: ${width}x${height} pixels`);
console.log(`  File size: ${(roughnessPNG.length / 1024).toFixed(2)} KB`);
console.log('');

// Generate normal map
const normalData = generateNormalMap(width, height);
const normalPNG = createPNGRGB(width, height, normalData);
const normalPath = path.join(__dirname, '..', 'src', 'webview', 'normal-map.png');
fs.writeFileSync(normalPath, normalPNG);

console.log(`✓ Normal map generated successfully`);
console.log(`  Output: ${normalPath}`);
console.log(`  Size: ${width}x${height} pixels`);
console.log(`  File size: ${(normalPNG.length / 1024).toFixed(2)} KB`);
console.log('='.repeat(60));
console.log('Both texture maps are seamless and ready to use.');
console.log('The normal map will show surface detail in all lighting conditions.');
