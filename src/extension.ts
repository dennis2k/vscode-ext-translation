'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { readFileSync, writeFileSync } from 'fs';
import { OverviewRulerLane } from "vscode";

let translationObject = {};
const decorators = [];

const config = vscode.workspace.getConfiguration("labeldictionary");
const configPath = config.get("primaryLanguageRelativeFilePath");
const primaryLanguageFilePath = vscode.workspace.rootPath + (configPath || "/en.json");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Extension started successfully!');
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    let subscriptions: vscode.Disposable[] = [];
    translationObject = getTranslationObject();
    
    // Show translated labels
    vscode.window.onDidChangeTextEditorSelection((e) => {
        decorators.forEach(d => d.dispose());
        onUpdate(statusBarItem);
    }, this, subscriptions);


    // Create label code
    let disposable = vscode.commands.registerCommand('extension.createLabel', () => {
        let keys = getKeys();
        keys.forEach((key) => {
            key = key.replace(/"/g, '').replace(/'/g, '');
            vscode.window.showInputBox({placeHolder: key}).then((result) => {
                if(result) {
                    translationObject[key] = result;
                    saveJSONToFile();
                    onUpdate(statusBarItem);
                }
            });
        });
        
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
    });

    context.subscriptions.push(disposable);

    context.subscriptions.push(...subscriptions);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function createMissingLabels() {
    let keys = getKeys();
        

    if(keys.length > 0) {
        
        let translatedTexts = [];
        keys.forEach(key => {
            key = key.replace(/"/g, '').replace(/'/g, '');
            if(translationObject[key]) {
                translatedTexts.push(translationObject[key]);
            } else {
                translatedTexts.push("Not found");
            }        
        });

    }
}

function onUpdate(statusBarItem: vscode.StatusBarItem) {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        statusBarItem.hide();
        return;
    }

    let doc = editor.document;
    console.log(doc.languageId);
    if(doc.languageId === "html" || doc.languageId === "vue" || doc.languageId === "Vue" || doc.languageId === "typescript") {
        let keys = getKeys();
        

        if(keys.length > 0) {
            
            let translatedTexts = [];
            keys.forEach(key => {
                key = key.replace(/"/g, '').replace(/'/g, '');
                if(translationObject[key]) {
                    translatedTexts.push(translationObject[key]);
                } else {
                    translatedTexts.push("Not found");
                }        
            });

            if(translatedTexts.length > 0) {
                const newText = translatedTexts.join(", ");
                statusBarItem.tooltip = newText;
                statusBarItem.text = "$(globe) " + newText;    
                createDecorator(newText);
                statusBarItem.show();
            }
        } else {
            statusBarItem.hide();
            statusBarItem.text = "";
        }
    } else {
        statusBarItem.hide();
    }
}

function saveJSONToFile() {
    writeFileSync(primaryLanguageFilePath, JSON.stringify(translationObject, null, 4),{encoding: 'utf8'});
}

function getTranslationObject() {
    
    const fileContent = readFileSync(primaryLanguageFilePath, 'utf8');
    const translationObject = JSON.parse(fileContent);
    return translationObject;
}

function getKeys() {
    let lineText = getLineText();
    const keys = [];
    let hasTranslation = true;
    while(hasTranslation) {

        hasTranslation = lineText.indexOf("'app.") !== -1 || lineText.indexOf("\"app.") !== -1;
        if(hasTranslation) {
            const normalizeText = lineText.replace(/'/g, "\"");
            const startIndex = normalizeText.indexOf("\"app.");
            const part = normalizeText.substr(startIndex + 1);
            const endIndex = part.indexOf("\"");
            const final = part.slice(0, endIndex);
            lineText = part.slice(0);
            console.log(final, normalizeText, startIndex, part, endIndex);
            keys.push(final);
        }
    }
    return keys;
}
    

function getLineText() {
    const activeEditor = vscode.window.activeTextEditor;
    const selection = activeEditor.selection;
    const text = activeEditor.document.getText(new vscode.Range(new vscode.Position(selection.start.line, 0), new vscode.Position(selection.start.line, 300)));
    return text;
}

function createDecorator(text) {
    const dec = vscode.window.createTextEditorDecorationType({
        after: {
            margin: "10px",
            contentText: "" + text,
            border: "1px solid white",
            color: "#FFFFFF"

        }
    });
    const selection = vscode.window.activeTextEditor.selection;
    const range = new vscode.Range(new vscode.Position(selection.start.line, 0), new vscode.Position(selection.start.line, 300));
    vscode.window.activeTextEditor.setDecorations(dec, [range]);
    decorators.push(dec);
}