import * as vscode from 'vscode';
import * as parser from '../Parser';

export default class Property {
    private description: null | string = null;
    private indentation: null | string = null;
    private name: string;
    private type: null | string = null;
    private typeHint: null | string = null;
    private nullable = false;

    public constructor(name: string) {
        this.name = name;
    }

    static parse(_prop: any): Property {
        if (!_prop || _prop.flags) {
            throw new Error('Invalid property line');
        }

        const activeLineNumber = _prop.loc.start.line - 1;
        const activeLine = vscode.window.activeTextEditor?.document.lineAt(activeLineNumber);

        if (!activeLine) {
            throw new Error();
        }

        const _comments = _prop.leadingComments;
        let _propCommentValue = '';
        let _propTypeValue = '';
        let _propNameValue = '';
        const _propVisibility: string = _prop.visibility;

        if (_comments) {
            _propCommentValue = _comments.find((item: any) => item.value.includes('@'))?.value;
        }

        if (_prop.properties) {
            const _property = _prop.properties[0];
            _propTypeValue = _property.type?.name;
            _propNameValue = _property.name?.name;
        }

        const property = new Property(_propNameValue);

        property.indentation = activeLine.text.substring(0, activeLine.firstNonWhitespaceCharacterIndex);

        if (_propTypeValue) {
            property.setType(_propTypeValue);
        }

        if (_propCommentValue) {
            const typeMatch = _propCommentValue.match(
                new RegExp('(?<=@var).*'),
            );

            if (typeMatch) {
                property.setType(typeMatch[0].trim());
            }

            property.description = parser.parseDocBlock(_propCommentValue)?.summary;
        }

        return property;
    }

    static parsePromotion(_prop: any): Property {
        if (!_prop || !_prop.flags) {
            throw new Error('Invalid argument line');
        }

        const activeLineNumber = _prop.loc.start.line - 1;
        const activeLine = vscode.window.activeTextEditor?.document.lineAt(activeLineNumber);

        if (!activeLine) {
            throw new Error();
        }

        const _comments = _prop.leadingComments;
        const _propNameValue: string = _prop.name.name;
        let _propCommentValue = '';
        const _propTypeValue: string = _prop.type?.name;
        const _propVisibility: string = _prop.visibility;

        if (_comments) {
            _propCommentValue = parser.getCommentBlockFor(_comments, _propNameValue)?.value;
        }

        const property = new Property(_propNameValue);

        property.indentation = activeLine.text.substring(0, activeLine.firstNonWhitespaceCharacterIndex);

        if (_propTypeValue) {
            property.setType(_propTypeValue);
        }

        if (_propCommentValue) {
            const typeMatch = _propCommentValue.match(
                new RegExp(`(?<=@param).*(?=\\$${_propNameValue})`),
            );

            if (typeMatch) {
                property.setType(typeMatch[0].trim());
            }

            property.description = parser.parseDocBlock(_propCommentValue)?.summary;
        }

        return property;
    }

    static fromEditorPosition(_classAST: any, activePosition: vscode.Position): Property {
        try {
            return this.parsePromotion(
                parser.getPropPromotionAtLine(_classAST, activePosition),
            );
        } catch (error) {
            return this.parse(
                parser.getPropertyAtLine(_classAST, activePosition),
            );
        }
    }

    generateMethodDescription(prefix: string): string {
        if (this.description) {
            return prefix + this.description.charAt(0).toLowerCase() + this.description.substring(1);
        }

        return `${prefix}the value of ${this.name}`;
    }

    generateMethodName(prefix: string): string {
        const name = this.name.split('_')
            .map((str) => str.charAt(0).toLocaleUpperCase() + str.slice(1))
            .join('');

        return prefix + name;
    }

    getDescription(): null | string {
        return this.description;
    }

    getIndentation(): null | string {
        return this.indentation;
    }

    getName(): string {
        return this.name;
    }

    getterDescription(): string {
        return this.generateMethodDescription('Get ');
    }

    getterName(): string {
        return this.generateMethodName(this.type === 'bool' ? 'is' : 'get');
    }

    getType(): null | string {
        return this.type;
    }

    getTypeHint(): null | string {
        return this.typeHint;
    }

    isNullable(): boolean {
        return this.nullable;
    }

    setterDescription(): string {
        return this.generateMethodDescription('Set ');
    }

    setterName(): string {
        return this.generateMethodName('set');
    }

    setType(type: string) {
        this.type = type;

        if (/^\?/.test(type)) {
            this.nullable = true;
            this.type = type.replace(/\?/, '');
        } else if (/\|?null\|?/.test(type)) {
            this.nullable = true;
            this.type = type.replace(/\|?null\|?/, '');
        }

        if (this.type.indexOf('[]') > 0) {
            this.type = 'array';
        }

        this.typeHint = this.type;
    }
}
