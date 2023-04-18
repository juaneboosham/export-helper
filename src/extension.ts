// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const exportCodeActionKind = vscode.CodeActionKind.Empty.append('exportVariable');
const exportDefaultCodeActionKind = vscode.CodeActionKind.Empty.append('exportDefaultVariable');

const exportActionProvider = {
	provideCodeActions: (document: vscode.TextDocument, range: vscode.Range) => {
		const line = document.lineAt(range.start.line);
		const variable = getVariableName(line.text);
		if (variable && isValidFunctionOrVariableName(variable)) {
			const exportAction = new vscode.CodeAction(`Export variable "${variable}"`, exportCodeActionKind);
			exportAction.command = {
				command: 'exportVariable',
				arguments: [variable],
				title: 'Export it?',
			};
			const exportDefaultAction = new vscode.CodeAction(`Export default "${variable}"`, exportDefaultCodeActionKind);
			exportDefaultAction.command = {
				command: 'exportDefaultVariable',
				arguments: [variable],
				title: 'Export default it?',
			};
			return [exportAction, exportDefaultAction];
		}
	},
};

const hoverProvider = {
	provideHover(document: { lineAt: (arg0: any) => any; }, position: any) {
		const line = document.lineAt(position);
		const variable = getVariableName(line.text);
		if (variable && isValidFunctionOrVariableName(variable)) {
			// Create a MarkdownString with links to export the variable
			const content = new vscode.MarkdownString();
			content.appendMarkdown(`🎉 **Hooray! Export this variable:** \n\n[👉 Export]`);
			content.appendMarkdown(`(command:exportVariable?${encodeURIComponent(JSON.stringify([variable]))})\n\n`);
			content.appendMarkdown(`🚀 **Blast off! Export this variable as default:** \n\n[👉 Export Default]`);
			content.appendMarkdown(`(command:exportDefaultVariable?${encodeURIComponent(JSON.stringify([variable]))})`);

			// Allow the MarkdownString to be trusted
			content.isTrusted = true;

			let hover = new vscode.Hover(content);
			return hover;
		}
	}
};

const disposableHoverProvider1 = vscode.languages.registerHoverProvider({ language: 'typescript', scheme: 'file' }, hoverProvider);
const disposableHoverProvider2 = vscode.languages.registerHoverProvider({ language: 'javascript', scheme: 'file' }, hoverProvider);
const disposableCodeActionsProvider1 = vscode.languages.registerCodeActionsProvider({ language: 'javascript', scheme: 'file' }, exportActionProvider);
const disposableCodeActionsProvider2 = vscode.languages.registerCodeActionsProvider({ language: 'typescript', scheme: 'file' }, exportActionProvider);

function exportVariable(variableName: string) {
	// Get the active text editor
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('No active text editor found');
		return;
	}

	// Get the document and check if the variable has already been exported
	const document = editor.document;
	let exportRange: vscode.Range | null = null;
	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i);
		const exportRegExp = /export\s*\{\s*([^{}]*?)\s*\}\s*;?\s*$/;
		const exportMatch = line.text.match(exportRegExp);
		if (exportMatch) {
			const variables = exportMatch[1].split(',').map(v => v.trim());
			if (!variables.includes(variableName)) {
				variables.push(variableName);
				const exportLine = `export { ${variables.join(', ')} };`;
				const edit = new vscode.WorkspaceEdit();
				edit.replace(document.uri, line.range, exportLine);
				vscode.workspace.applyEdit(edit).then(() => { });
			}
			return;
		}
	}

	// If the variable has not been exported, add a new export statement at the end of the document
	const lastLine = document.lineAt(document.lineCount - 1);
	const exportLine = `\nexport { ${variableName} };`;
	const edit = new vscode.WorkspaceEdit();
	edit.insert(document.uri, new vscode.Position(document.lineCount - 1, lastLine.range.end.character), exportLine);
	vscode.workspace.applyEdit(edit).then(() => { });
}


function exportDefaultVariable(variableName: string) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('No active text editor found');
		return;
	}
	const edit = new vscode.WorkspaceEdit();
	const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
	if (variableName) {
		const exportLine = `\nexport default ${variableName};`;
		edit.insert(editor.document.uri, new vscode.Position(lastLine.range.end.line, lastLine.range.end.character), exportLine);
		vscode.workspace.applyEdit(edit).then(() => {
			vscode.commands.executeCommand('editor.action.escapeFocusHover');
		});
	}
};

const disposableExportVariable = vscode.commands.registerCommand('exportVariable', exportVariable);
const disposableExportDefaultVariable = vscode.commands.registerCommand('exportDefaultVariable', exportDefaultVariable);


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(disposableHoverProvider1, disposableHoverProvider2, disposableCodeActionsProvider1, disposableCodeActionsProvider2, disposableExportVariable, disposableExportDefaultVariable);
}

export function deactivate() { }

function isValidFunctionOrVariableName(word: string): boolean {
	// Regular expression to match variable declaration keywords
	const declarationRegex = /^(const|class|let|var|function)$/;

	// Check if the word is a variable declaration keyword
	if (declarationRegex.test(word)) {
		return false;
	}

	// Check if the word starts with a number
	if (/^[0-9]/.test(word)) {
		return false;
	}

	// Check if the word contains any invalid characters
	if (/[^a-zA-Z0-9_$]/.test(word)) {
		return false;
	}

	// If the word passes all checks, it is considered a valid function or variable name
	return true;
}

function getVariableName(text: string): string | null {
	// Use a regular expression to match variable declarations
	const declarationRegex = /^(const|class|let|var|function)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;

	// Match the variable name in the text using the regular expression
	const match = text.match(declarationRegex);

	// If a match is found, return the variable name from the second capture group
	if (match) {
		return match[2];
	}

	// If no match is found, return null
	return null;
}