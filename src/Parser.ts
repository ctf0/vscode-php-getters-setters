import * as PhpParser from 'php-parser';
import * as vscode from 'vscode';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const _set = require('lodash.set');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DocParser = require('doc-parser');
const DocReader = new DocParser();
const Parser = new PhpParser.Engine({
    parser: {
        extractDoc: true,
    },
    ast: {
        withPositions: true,
    },
});

export function buildClassASTFromContent(content: string) {
    try {
        const AST = Parser.parseCode(content, '*.php');

        return getClass(
            AST?.children?.find((item: any) => item.kind == 'namespace') ||
            AST,
        );
    } catch (error) {
        // console.error(error);
    }
}

function getClass(AST: any) {
    return AST?.children?.find((item: any) => item.kind == 'class' || item.kind == 'interface');
}

export function getConstructor(_classAST: any, getArgsOnly = false) {
    const _const = getAllMethods(_classAST)?.find((item: any) => item.name.name == '__construct');

    if (getArgsOnly) {
        return _const?.arguments.map((item: PhpParser.Parameter) =>
            Object.assign(item, {
                leadingComments : _const.leadingComments,
                visibility      : flagsToVisibility(item.flags),
            }),
        );
    }

    return _const;
}

export function getClassScopeInsertLine(_classAST: any) {
    let position: any = null;

    // get last prop
    const _properties = getAllProperties(_classAST);

    if (_properties && _properties.length) {
        position = _properties[_properties.length - 1];

        return {
            line   : position.loc.end.line - 1,
            column : position.loc.end.column,
        };
    }

    // get first method
    // ~first method comment if found
    const methods = getAllMethods(_classAST);

    if (methods && methods.length) {
        position = methods[0];

        const _comments = position.leadingComments;

        if (_comments) {
            position = _comments[0];
        }

        return {
            line   : position.loc.start.line - 1,
            column : position.loc.start.column,
        };
    }

    // or class start
    // if non found
    position = _classAST;

    return {
        line   : position.loc.end.line - 1,
        column : 0,
    };
}

export function getAllProperties(_classAST: any) {
    return _classAST?.body
        .filter((item: any) => item.kind == 'propertystatement')
        .map((item: any) => { // because the parser doesnt return correct column
            const start = item.loc.start;
            let extraLength = start.column - (item.visibility.length + 1);

            if (item.isStatic) {
                extraLength -= 'static '.length;
            }

            _set(item, 'loc.start.column', extraLength);
            _set(item, 'loc.end.column', item.loc.end.column + 1); // include the ;
            _set(item, 'loc.start.offset', start.offset - extraLength);

            return item;
        });
}

export function getAllPropertyPromotions(_classAST: any) {
    return getConstructor(_classAST, true);
}

export function getAllMethods(_classAST: any): any[] | undefined {
    return _classAST?.body.filter((item: any) => item.kind == 'method');
}

export function getPropertyAtLine(_classAST: any, position: vscode.Position, _properties: any[] | undefined = undefined) {
    _properties = _properties || getAllProperties(_classAST);

    return _properties?.find((item: any) => item.loc.start.line === position.line + 1);
}

export function getPropPromotionAtLine(_classAST: any, position: vscode.Position, _arguments: any[] | undefined = undefined) {
    _arguments = _arguments || getAllPropertyPromotions(_classAST);

    return _arguments?.find((item: any) => {
        const loc = item.loc;

        return loc.start.line === position.line + 1 &&
            loc.start.column <= position.character &&
            loc.end.column >= position.character;
    });
}

export function getPropertyMethodsRange(_classAST: any, methodNames: string[]): { ranges: any; methods: string[]; } {
    const list: any = [];
    const methodsFound = [];

    for (const name of methodNames) {
        const range = getMethodRange(_classAST, name);

        if (range) {
            methodsFound.push(name);
            list.push(range);
        }
    }

    return {
        ranges  : list,
        methods : methodsFound,
    };
}

export function getMethodRange(_classAST: any, methodName: string): vscode.Range | undefined {
    const _method = getAllMethods(_classAST)?.find((item: any) => item.name.name == methodName);

    if (!_method) {
        return undefined;
    }

    return buildRangeIncludingComments(_method);
}

export function getCommentBlockFor(_comments: any[], name: string): any {
    return _comments.find((com: any) => com.value.match(new RegExp(`@.*\\$${name}`, 'gm')));
}

export function buildRangeIncludingComments(item: any, withoutCommentRange = false) {
    const __comments = item.leadingComments;
    const startPosition = withoutCommentRange
        ? item
        : ((__comments && __comments.length) ? __comments[0] : item);

    return getRangeFromLoc(startPosition.loc.start, item.loc.end);
}

export function getRangeFromLoc(start: { line: number; column: number; }, end: { line: number; column: number; }): vscode.Range {
    return new vscode.Range(
        new vscode.Position(start.line - 1, start.column),
        new vscode.Position(end.line - 1, end.column),
    );
}

export function parseDocBlock(comment: string) {
    return DocReader.parse(comment);
}

function flagsToVisibility(flags: number): string {
    let type = '';

    switch (flags) {
        case 1:
            type = 'public';
        case 2:
            type = 'protected';
        case 4:
            type = 'private';
    }

    return type;
}
