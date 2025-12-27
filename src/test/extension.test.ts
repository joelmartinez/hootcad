import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('HootCAD extension should be present', () => {
		const extension = vscode.extensions.getExtension('hootcad.hootcad');
		assert.ok(extension, 'Extension should be present');
	});

	test('HootCAD: Open Preview command should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('hootcad.openPreview'), 'Open Preview command should be registered');
	});

	test('Extension should activate successfully', async () => {
		const extension = vscode.extensions.getExtension('hootcad.hootcad');
		assert.ok(extension, 'Extension should exist');
		
		await extension.activate();
		assert.strictEqual(extension.isActive, true, 'Extension should be active');
	});

	test('JSCAD language should be registered', () => {
		const languages = vscode.languages.getLanguages();
		return languages.then((langs) => {
			assert.ok(langs.includes('jscad'), 'JSCAD language should be registered');
		});
	});
});
