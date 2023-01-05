import * as vscode from 'vscode';
import * as parser from '../Parser';
import * as utils from '../utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const throttle = require('lodash.throttle');

export default class CodeAction implements vscode.CodeActionProvider {
    CLASS_AST: any;
    PROPS: any;
    PROMOS: any;

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        if (!range.isEmpty || !document) {
            return;
        }

        this.setEditorAndAST(document);

        if (!this.CLASS_AST) {
            return;
        }

        const list = [
            {
                command : `${utils.CMND_NAME}.addNewProperty`,
                title   : 'Add New Property',
            },
        ];

        const _prop = parser.getPropertyAtLine(this.CLASS_AST, range.start, this.PROPS);
        const _arg = parser.getPropPromotionAtLine(this.CLASS_AST, range.start, this.PROMOS);

        if (_prop || _arg) {
            list.push(
                {
                    command : `${utils.CMND_NAME}.insert`,
                    title   : 'Add Getters/Setters',
                },
                {
                    command : `${utils.CMND_NAME}.remove`,
                    title   : 'Remove Getters/Setters',
                },
                {
                    command : `${utils.CMND_NAME}.removeSelfAndMethods`,
                    title   : 'Remove Property + Getters/Setters',
                },
            );
        }

        if (this.CLASS_AST.kind == 'class') {
            const _constructor = parser.getConstructor(this.CLASS_AST);

            if (!_constructor) {
                list.push(
                    {
                        command : `${utils.CMND_NAME}.addConstructor`,
                        title   : 'Add Constructor',
                    },
                );
            }
        }

        return list.map((item) => this.createCommand(item));
    }

    private createCommand(cmnd: { command: string; title: string; }): vscode.CodeAction {
        const action = new vscode.CodeAction(cmnd.title, vscode.CodeActionKind.Refactor);
        action.command = { command: cmnd.command, title: cmnd.title };

        return action;
    }

    setEditorAndAST = throttle((document: vscode.TextDocument) => {
        if (document) {
            this.CLASS_AST = parser.buildClassASTFromContent(document.getText());

            this.PROPS = parser.getAllProperties(this.CLASS_AST);
            this.PROMOS = parser.getAllPropertyPromotions(this.CLASS_AST);
        }
    }, 2000);
}
