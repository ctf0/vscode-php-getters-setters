import * as PhpParser from 'php-parser';
import * as vscode from 'vscode';

const _set = require('lodash.set');
const DocParser = require('doc-parser');
const DocReader = new DocParser();
const Parser = new PhpParser.Engine({
    parser: {
        extractDoc: true,
        suppressErrors: true,
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
    return AST?.children?.find((item: any) => ['class', 'interface', 'trait'].includes(item.kind));
}

export function getConstructor(_classAST: any, getArgsOnly = false) {
    const _const = getAllMethods(_classAST)?.find((item: any) => item.name.name == '__construct');

    if (getArgsOnly) {
        return _const?.arguments.map((item: PhpParser.Parameter) =>
            Object.assign(item, {
                leadingComments: _const.leadingComments,
                visibility: flagsToVisibility(item.flags),
            }),
        );
    }

    return _const;
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
        ranges: list,
        methods: methodsFound,
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
    if (withoutCommentRange) {
        return getRangeFromLoc(item.loc.start, item.loc.end);
    }

    let __commentsStart = item.leadingComments;
    let __annotationStart = item.properties

    if (__commentsStart?.length) {
        __commentsStart = __commentsStart[0].loc.start
    }
    if (__annotationStart?.length) {
        __annotationStart = __annotationStart[0].attrGroups[0].loc.start
    } else {
        __annotationStart = item.attrGroups.length ? item.attrGroups[0].loc.start : undefined
    }

    const __itemStart = item.loc.start
    const __infoStart = __commentsStart?.line < __annotationStart?.line ? __commentsStart : __annotationStart
    const startPosition = __infoStart?.line < __itemStart.line ? __infoStart : __itemStart;

    return getRangeFromLoc(startPosition, item.loc.end);
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
    switch (flags) {
        case 1:
            return 'public';
        case 2:
            return 'protected';
        case 4:
            return 'private';
        default:
            return '';
    }
}
