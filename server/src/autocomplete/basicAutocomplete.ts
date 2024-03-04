import {
    CompletionItem,
    CompletionItemKind,
    InsertTextFormat,
} from 'vscode-languageserver/node';

import {
    Autocomplete,
} from './autocomplete'

export class BasicAutocomplete implements Autocomplete {
    connection: any
    version: string
    constructor(connect: any, version: string) {
        this.connection = connect
        this.version = version
    }
    async GetCompletionItemsComponentList(components: Map<string, Component>): Promise<CompletionItem[]> {
        let completionItems:CompletionItem[] = []
        for (const component of components.values()) {
            completionItems.push({
                label: component.name,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: this.buildInsertTextComponent(component)
            })
        }
        return completionItems
    }

    buildInsertTextComponent(component: Component): string {
        const label = component.hasLabel ? " \"${1:LABEL}\"" : ""
        let autocompleteIdx = label !== "" ? 2 : 1
        let args = this.mapArguments(component.arguments, true, autocompleteIdx, '\t')
        let blocks = this.mapBlocks(component.blocks, true, '\t')
        let optionalArgs = this.mapOptionalArguments(component.arguments, '\t')
        let exports = this.mapExports(component.exports, '\t')
        
        const componentBody = [args, blocks, optionalArgs, exports].filter(part => part !== '').join('\n\n')
        return `${component.name}${label} {\n${componentBody}\n}`
    }

    GetCompletionItemsComponent(component: Component): CompletionItem[] {
        let completionItems:CompletionItem[] = []
        for (const argument of component.arguments) {
            completionItems.push({
                label: argument.name,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: this.mapArguments([argument], false, 1, ""),
                documentation: argument.doc,
                detail: argument.type,
            })
        }
        for (const block of component.blocks) {
            completionItems.push({
                label: block.name,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: this.mapBlocks([block], false, "")
            })
        }
        return completionItems
    }

    mapBlocks(blocks: Block[], filterRequired: boolean, indent: string): string {
        let filteredBlocks = filterRequired? blocks.filter(block => block.required) : blocks
        return filteredBlocks
        .map(block => `${indent}${block.name} {\n${indent}}`)
        .join("\n")
    }

    mapOptionalArguments(args: Argument[], indent: string): string {
        const optionalArgs = args.filter(arg => !arg.required)
        if (optionalArgs.length == 0)
            return ""
        const argumentStr = optionalArgs.length == 1 ? "argument" : "arguments"
        let result = `${indent}// Optional ${argumentStr}:\n${indent}// `;

        optionalArgs.forEach((arg, index) => {
            result += `${arg.name}`;
            if (index !== optionalArgs.length - 1) {
                result += ", ";
                if ((index + 1) % 5 === 0) {
                    result += `\n${indent}// `;
                }
            }
        });
    
        return result;
    }

    mapArguments(args: Argument[], filterRequired: boolean, autocompleteIdx: number, indent: string): string {
        let filteredArgs = filterRequired? args.filter(arg => arg.required) : args
        return filteredArgs
            .map(arg =>
                `${indent}${arg.name} = \${${autocompleteIdx++}:${arg.default}} // ${arg.type}`
            )
            .join('\n')
    }

    mapExports(exports: Export[], indent: string): string {
        if (exports.length == 0) {
            return `${indent}// This component does not have any exported fields.`
        }
        const fieldStr = exports.length == 1 ? "field" : "fields"
        return `${indent}// Exported ${fieldStr}: ` + exports.map(exp => `${exp.name}(${exp.type})`).join(", ")
    }
}