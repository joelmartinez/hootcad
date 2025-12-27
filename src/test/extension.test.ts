import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('HootCAD extension should be present', () => {
		const extension = vscode.extensions.getExtension('undefined_publisher.hootcad');
		assert.ok(extension);
	});

	test('HootCAD: Open Preview command should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('hootcad.openPreview'));
	});
});
