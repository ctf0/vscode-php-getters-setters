'use strict';

import * as vscode from 'vscode';
import CodeAction from './Providers/CodeAction';
import Resolver from './Resolver';
import * as utils from './utils';

export function activate(context: vscode.ExtensionContext) {
    const resolver = new Resolver();

    context.subscriptions.push(
        vscode.commands.registerCommand(`${utils.CMND_NAME}.addNewProperty`, async () => await resolver.addNewProperty()),
        vscode.commands.registerCommand(`${utils.CMND_NAME}.addConstructor`, async () => await resolver.addConstructor()),

        vscode.commands.registerCommand(`${utils.CMND_NAME}.insert`, async () => await resolver.insert()),
        vscode.commands.registerCommand(`${utils.CMND_NAME}.remove`, async () => await resolver.remove()),
        vscode.commands.registerCommand(`${utils.CMND_NAME}.insertAll`, async () => await resolver.insertAll()),
        vscode.commands.registerCommand(`${utils.CMND_NAME}.removeAll`, async () => await resolver.removeAll()),
        vscode.commands.registerCommand(`${utils.CMND_NAME}.removeSelfAndMethods`, async () => await resolver.removeSelfAndMethods()),

        vscode.languages.registerCodeActionsProvider('php', new CodeAction(), {
            providedCodeActionKinds: [vscode.CodeActionKind.Refactor],
        }),
    );
}

export function deactivate() {
}
