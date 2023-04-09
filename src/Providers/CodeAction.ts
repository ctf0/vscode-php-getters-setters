import throttle from 'lodash.throttle';
import * as vscode from 'vscode';
import * as parser from '../Parser';
import * as utils from '../utils';

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

        const list: any = [];

        const _prop = parser.getPropertyAtLine(this.CLASS_AST, range.start, this.PROPS);
        const _arg = parser.getPropPromotionAtLine(this.CLASS_AST, range.start, this.PROMOS);

        if (_prop || _arg) {
            list.push(
                {
                    command : `${utils.CMND_NAME}.insert`,
                    title   : 'Property: Add Getters/Setters',
                },
                {
                    command : `${utils.CMND_NAME}.remove`,
                    title   : 'Property: Remove Getters/Setters',
                },
                {
                    command : `${utils.CMND_NAME}.removeSelfAndMethods`,
                    title   : 'Property: Remove + Getters/Setters',
                },
            );
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
