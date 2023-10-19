import * as vscode from 'vscode';
import Configuration from './Contracts/Configuration';
import Property from './Contracts/Property';
import TemplatesManager from './Contracts/TemplatesManager';
import * as parser from './Parser';

const getterTemplateFile = 'getter.js';
const setterTemplateFile = 'setter.js';

export default class Resolver {
    config: Configuration;
    templatesManager: TemplatesManager;
    CLASS_AST: any;
    EDITOR: any;
    DEFAULT_INDENT: string;

    /**
     * Types that won't be recognized as valid type hints
     */
    pseudoTypes = ['mixed', 'number', 'callback', 'object', 'void'];

    public constructor() {
        this.config = new Configuration();
        this.templatesManager = new TemplatesManager();

        const config = vscode.workspace.getConfiguration('editor');
        // @ts-ignore
        this.DEFAULT_INDENT = ' '.repeat(parseInt(config.get('tabSize')));
    }

    setEditorAndAST() {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            const err = 'Error editor not available';
            this.showMessage(err);
            throw new Error(err);
        }

        this.EDITOR = editor;
        this.CLASS_AST = parser.buildClassASTFromContent(editor.document.getText());
    }

    getClassClosingLine() {
        if (this.CLASS_AST) {
            return this.CLASS_AST.loc.end.line - 1;
        }

        return undefined;
    }

    isRedirectEnabled(): boolean {
        return this.config.get('redirect') === true;
    }

    showMessage(message: string, error = true) {
        message = 'PhpGettersSetters: ' + message.replace(/\$\(.+?\)\s\s/, '');

        error
            ? vscode.window.showErrorMessage(message)
            : vscode.window.showInformationMessage(message);
    }

    insertGetterAndSetter(addGetter = false, addSetter = false) {
        const { selections } = this.EDITOR;
        let content = '';

        for (const selection of selections) {
            let property: any;

            try {
                property = Property.fromEditorPosition(this.CLASS_AST, selection.active);
            } catch (error: any) {
                return this.showMessage(error.message);
            }

            const { methods } = this.checkIfExists(property, addGetter, addSetter);

            if (addGetter && !methods?.includes(property.getterName())) {
                content += this.buildContentFromTemplate(property, getterTemplateFile);
            }

            if (addSetter && !methods?.includes(property.setterName())) {
                content += this.buildContentFromTemplate(property, setterTemplateFile);
            }
        }

        if (!content) {
            return this.showMessage('getter/setter already exists');
        }

        this.renderTemplate(content);
    }

    insertAllGetterAndSetter(addGetter = false, addSetter = false) {
        try {
            const content = this.getContentForProperty(addGetter, addSetter) + this.getContentForArgument(addGetter, addSetter);

            if (!content) {
                return this.showMessage('No properties found to add.');
            }

            this.renderTemplate(content);
        } catch (error) {
            // console.error(error);
        }
    }

    getContentForProperty(addGetter = false, addSetter = false): string {
        let content = '';

        for (const prop of parser.getAllProperties(this.CLASS_AST)) {
            let property: any;

            try {
                property = Property.parse(prop);
            } catch (error: any) {
                continue;
            }

            if (!property) {
                continue;
            }

            const { methods } = this.checkIfExists(property, addGetter, addSetter);

            if (addGetter && !methods?.includes(property.getterName())) {
                content += this.buildContentFromTemplate(property, getterTemplateFile);
            }

            if (addSetter && !methods?.includes(property.setterName())) {
                content += this.buildContentFromTemplate(property, setterTemplateFile);
            }
        }

        return content;
    }

    getContentForArgument(addGetter = false, addSetter = false): string {
        let content = '';

        for (const prop of parser.getAllPropertyPromotions(this.CLASS_AST) || []) {
            let property: any;

            try {
                property = Property.parsePromotion(prop);
            } catch (error: any) {
                continue;
            }

            if (!property) {
                continue;
            }

            const { methods } = this.checkIfExists(property, addGetter, addSetter);

            if (addGetter && !methods?.includes(property.getterName())) {
                content += this.buildContentFromTemplate(property, getterTemplateFile);
            }

            if (addSetter && !methods?.includes(property.setterName())) {
                content += this.buildContentFromTemplate(property, setterTemplateFile);
            }
        }

        return content;
    }

    buildContentFromTemplate(prop: Property, templateFile: string) {
        const template = require(this.templatesManager.path(templateFile) || `../templates/${templateFile}`);

        return template(prop);
    }

    async renderTemplate(template: string) {
        if (!template) {
            return this.showMessage('Missing template to render.');
        }

        const insertLine = this.getClassClosingLine();

        if (!insertLine) {
            return this.showMessage('Unable to detect insert line for template.');
        }

        const editor = this.EDITOR;

        try {
            await editor.edit(
                (edit: vscode.TextEditorEdit) => edit.replace(new vscode.Position(insertLine, 0), template),
                { undoStopBefore: false, undoStopAfter: false },
            );

            await this.jumpToLine(insertLine + (template.split('\n').length - 2));
        } catch (error) {
            this.showMessage(`Error generating functions: ${error}`);
        }
    }

    async removeGetterAndSetter(removeGetter = false, removeSetter = false) {
        const { selections } = this.EDITOR;
        const _class = this.CLASS_AST;
        let rangesToRemove = [];

        for (const selection of selections) {
            let property: any;

            try {
                property = Property.fromEditorPosition(_class, selection.active);
            } catch (error: any) {
                return this.showMessage(error.message);
            }

            const listToRemove = [];

            if (removeGetter) {
                listToRemove.push(property.getterName());
            }

            if (removeSetter) {
                listToRemove.push(property.setterName());
            }

            rangesToRemove.push(...parser.getPropertyMethodsRange(_class, listToRemove).ranges);
        }

        rangesToRemove = rangesToRemove.filter((e) => e);

        if (!rangesToRemove.length) {
            return this.showMessage('no setter/getter found to remove');
        }

        for (const range of this.sortAndReverseRanges(rangesToRemove)) {
            await this.removeRange(range);
        }

        await this.removeEmptyLines();
    }

    async removeEmptyLines() {
        await vscode.commands.executeCommand('blankLine.process');
    }

    async removeAllGetterAndSetter(getters = false, setters = false) {
        const _class = this.CLASS_AST;

        let rangesToRemove = [];
        const list = [
            ...parser.getAllProperties(_class),
            ...parser.getAllPropertyPromotions(_class),
        ];

        for (const prop of list) {
            let property: any;

            try {
                property = Property.parse(prop);
            } catch (error: any) {
                property = Property.parsePromotion(prop);
            }

            if (!property) {
                continue;
            }

            const listToRemove = [];

            if (getters) {
                listToRemove.push(property.getterName());
            }

            if (setters) {
                listToRemove.push(property.setterName());
            }

            rangesToRemove.push(...parser.getPropertyMethodsRange(_class, listToRemove).ranges);
        }

        rangesToRemove = rangesToRemove.filter((e) => e);

        if (!rangesToRemove.length) {
            return this.showMessage('No properties found to remove.');
        }

        for (const range of this.sortAndReverseRanges(rangesToRemove)) {
            await this.removeRange(range, false);
        }

        await this.removeEmptyLines();
    }

    checkIfExists(property: Property, getters: boolean, setters: boolean) {
        const propList = [];

        if (getters) {
            propList.push(property.getterName());
        }

        if (setters) {
            propList.push(property.setterName());
        }

        return parser.getPropertyMethodsRange(this.CLASS_AST, propList);
    }

    sortAndReverseRanges(ranges: any) {
        // make sure we delete from bottom up
        return ranges
            .sort((a: any, b: any) => {
                if (a.start.line > b.start.line) return 1;

                if (b.start.line > a.start.line) return -1;

                return 0;
            })
            .reverse();
    }

    async removeRange(range: vscode.Range, goToLine = true) {
        const editor = this.EDITOR;

        try {
            await editor.edit(
                (edit: vscode.TextEditorEdit) => edit.delete(range),
                { undoStopBefore: false, undoStopAfter: false },
            );

            if (goToLine) {
                await this.jumpToLine(range.start.line - 1);
            }
        } catch (error) {
            this.showMessage(`Error removing functions: ${error}`);
        }
    }

    async jumpToLine(lineNumber: number) {
        if (this.isRedirectEnabled()) {
            const editor = this.EDITOR;
            const { document } = editor;
            const range = document.lineAt(lineNumber).range;

            editor.selection = new vscode.Selection(range.end, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

            await vscode.window.showTextDocument(document);
        }
    }

    async showMultiSelect() {
        const types: any = await vscode.window.showQuickPick(
            [
                'getter',
                'setter',
            ],
            {
                placeHolder: 'choose what to add/remove',
                canPickMany: true,
            },
        );

        if (!types) {
            return this.showMessage('you have to select at least one type', false);
        }

        this.setEditorAndAST();

        const list = {
            getter: false,
            setter: false,
        };

        for (const select of types) {
            Object.assign(list, {
                [select]: true,
            });
        }

        return list;
    }

    /* Main --------------------------------------------------------------------- */

    async insert() {
        const types: any = await this.showMultiSelect();

        if (types) {
            this.insertGetterAndSetter(types.getter, types.setter);
        }
    }

    async insertAll() {
        const types: any = await this.showMultiSelect();

        if (types) {
            this.insertAllGetterAndSetter(types.getter, types.setter);
        }
    }

    async remove() {
        const types: any = await this.showMultiSelect();

        if (types) {
            this.removeGetterAndSetter(types.getter, types.setter);
        }
    }

    async removeAll() {
        const types: any = await this.showMultiSelect();

        if (types) {
            this.removeAllGetterAndSetter(types.getter, types.setter);
        }
    }

    async removeSelfAndMethods() {
        this.setEditorAndAST();

        const editor = this.EDITOR;
        const { selections, document } = editor;
        const _class = this.CLASS_AST;
        let rangesToRemove: any = [];
        const txtToRemove: any = [];

        for (const selection of selections) {
            let isPropPromotion = false;
            let property: any = parser.getPropertyAtLine(_class, selection.active);

            if (!property) {
                isPropPromotion = true;
                property = parser.getPropPromotionAtLine(_class, selection.active);
            }

            if (!property) {
                return this.showMessage('Invalid property line');
            }

            /* Comment ------------------------------------------------------------------ */
            if (isPropPromotion && property.leadingComments.length) {
                const _propName = property.name.name;
                const _propComment = parser.getCommentBlockFor(property.leadingComments, _propName);
                const _commentValue = _propComment.value;

                // multiline doc block with single item
                // or one line
                if (_commentValue.split('\n').length <= 3) {
                    rangesToRemove.push(parser.getRangeFromLoc(_propComment.loc.start, _propComment.loc.end));
                } else {
                    const replaceWith = _commentValue.replace(
                        new RegExp(`^[/* ]+@param.*\\$${_propName}(?!\w).*$`, 'm'), '',
                    );

                    txtToRemove.push({
                        find: _commentValue,
                        replaceWith: replaceWith,
                    });
                }
            }

            /* Property ----------------------------------------------------------------- */
            rangesToRemove.push(parser.buildRangeIncludingComments(property, isPropPromotion));

            /* Methods ------------------------------------------------------------------ */
            property = isPropPromotion ? Property.parsePromotion(property) : Property.parse(property);

            const listToRemove = [property.getterName(), property.setterName()];

            for (const method of listToRemove) {
                rangesToRemove.push(parser.getMethodRange(_class, method));
            }
        }

        rangesToRemove = rangesToRemove.filter((e) => e);

        for (const range of this.sortAndReverseRanges(rangesToRemove)) {
            await this.removeRange(range, false);
        }

        if (txtToRemove.length) {
            let txt = document.getText();

            for (const item of txtToRemove) {
                txt = txt.replace(item.find, item.replaceWith);
            }

            await editor.edit(
                (edit: vscode.TextEditorEdit) => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), txt),
                { undoStopBefore: false, undoStopAfter: false },
            );
        }

        await this.removeEmptyLines();
    }
}
