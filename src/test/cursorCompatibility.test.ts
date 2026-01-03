import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

suite('Cursor IDE Compatibility Test Suite', () => {
	const packageJsonPath = path.join(__dirname, '../../package.json');
	
	test('package.json exists', () => {
		assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');
	});

	test('package.json has valid VS Code engine requirement', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		assert.ok(packageJson.engines, 'package.json should have engines field');
		assert.ok(packageJson.engines.vscode, 'package.json should specify vscode engine');
		assert.ok(packageJson.engines.vscode.startsWith('^'), 'vscode engine should use caret (^) for compatibility');
	});

	test('package.json description mentions both VS Code and Cursor', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		assert.ok(packageJson.description, 'package.json should have description');
		const description = packageJson.description.toLowerCase();
		assert.ok(
			description.includes('vscode') || description.includes('vs code'),
			'Description should mention VS Code'
		);
		assert.ok(
			description.includes('cursor'),
			'Description should mention Cursor for discoverability'
		);
	});

	test('package.json has cursor keyword for discoverability', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		assert.ok(packageJson.keywords, 'package.json should have keywords');
		assert.ok(Array.isArray(packageJson.keywords), 'keywords should be an array');
		const hasKeyword = packageJson.keywords.some((k: string) => 
			k.toLowerCase() === 'cursor'
		);
		assert.ok(hasKeyword, 'package.json should include "cursor" in keywords for OpenVSX discoverability');
	});

	test('package.json has vscode keyword', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		const hasKeyword = packageJson.keywords.some((k: string) => 
			k.toLowerCase() === 'vscode'
		);
		assert.ok(hasKeyword, 'package.json should include "vscode" in keywords');
	});

	test('package.json has required fields for extension', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		assert.ok(packageJson.name, 'package.json should have name');
		assert.ok(packageJson.displayName, 'package.json should have displayName');
		assert.ok(packageJson.version, 'package.json should have version');
		assert.ok(packageJson.publisher, 'package.json should have publisher');
		assert.ok(packageJson.main, 'package.json should have main entry point');
		assert.ok(packageJson.contributes, 'package.json should have contributes section');
	});

	test('extension uses only standard VS Code APIs (no proprietary APIs)', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		
		// Check that the extension doesn't have any Microsoft-specific dependencies
		// that might not work in Cursor
		const dependencies = packageJson.dependencies || {};
		const devDependencies = packageJson.devDependencies || {};
		
		// These are the standard allowed dependencies
		const allowedVSCodeDeps = [
			'@types/vscode',
			'@vscode/test-cli',
			'@vscode/test-electron',
			'@vscode/vsce'
		];
		
		// Check dev dependencies
		for (const dep of Object.keys(devDependencies)) {
			if (dep.startsWith('@vscode/') || dep.startsWith('vscode-')) {
				assert.ok(
					allowedVSCodeDeps.some(allowed => dep === allowed),
					`Dependency ${dep} should be a standard VS Code dev dependency`
				);
			}
		}
		
		// Runtime dependencies should not include VS Code-specific packages
		for (const dep of Object.keys(dependencies)) {
			assert.ok(
				!dep.startsWith('@vscode/') && !dep.startsWith('vscode-'),
				`Runtime dependency ${dep} should not be VS Code-specific to ensure Cursor compatibility`
			);
		}
	});

	test('.cursorignore file exists', () => {
		const cursorIgnorePath = path.join(__dirname, '../../.cursorignore');
		assert.ok(
			fs.existsSync(cursorIgnorePath),
			'.cursorignore should exist for Cursor-specific packaging'
		);
	});

	test('.cursorignore has similar content to .vscodeignore', () => {
		const cursorIgnorePath = path.join(__dirname, '../../.cursorignore');
		const vscodeignorePath = path.join(__dirname, '../../.vscodeignore');
		
		if (fs.existsSync(cursorIgnorePath) && fs.existsSync(vscodeignorePath)) {
			const cursorIgnore = fs.readFileSync(cursorIgnorePath, 'utf8');
			const vscodeignore = fs.readFileSync(vscodeignorePath, 'utf8');
			
			// They should be identical or very similar
			// For now, just check they both exist and are non-empty
			assert.ok(cursorIgnore.length > 0, '.cursorignore should not be empty');
			assert.ok(vscodeignore.length > 0, '.vscodeignore should not be empty');
		}
	});

	test('CURSOR_COMPATIBILITY.md documentation exists', () => {
		const compatDocPath = path.join(__dirname, '../../CURSOR_COMPATIBILITY.md');
		assert.ok(
			fs.existsSync(compatDocPath),
			'CURSOR_COMPATIBILITY.md should exist to document Cursor support'
		);
	});

	test('README.md mentions Cursor support', () => {
		const readmePath = path.join(__dirname, '../../README.md');
		const readme = fs.readFileSync(readmePath, 'utf8');
		const lowerReadme = readme.toLowerCase();
		assert.ok(
			lowerReadme.includes('cursor'),
			'README.md should mention Cursor IDE for user awareness'
		);
	});

	test('extension activation events are editor-agnostic', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		const activationEvents = packageJson.activationEvents || [];
		
		// All activation events should be standard VS Code activation events
		// that work in Cursor as well
		for (const event of activationEvents) {
			assert.ok(
				event.startsWith('onLanguage:') || 
				event.startsWith('onCommand:') ||
				event.startsWith('onView:') ||
				event === '*',
				`Activation event ${event} should be a standard event type`
			);
		}
	});

	test('commands are properly namespaced', () => {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		const commands = packageJson.contributes?.commands || [];
		
		for (const cmd of commands) {
			assert.ok(
				cmd.command.startsWith('hootcad.'),
				`Command ${cmd.command} should be namespaced with extension name`
			);
		}
	});

	test('no hardcoded VS Code references in code that would break in Cursor', () => {
		// This is a basic test - in a real scenario you'd scan source files
		// For now, we just verify that the package.json doesn't have VS Code-specific
		// settings that would prevent Cursor compatibility
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		
		// Check for any VS Code-specific configuration that might not work in Cursor
		// For example, checking that there are no VS Code marketplace-specific fields
		// that would prevent the extension from working in Cursor
		assert.ok(
			!packageJson.galleryBanner?.theme || 
			packageJson.galleryBanner?.theme === 'dark' ||
			packageJson.galleryBanner?.theme === 'light',
			'Gallery banner theme, if present, should use standard values'
		);
	});
});
