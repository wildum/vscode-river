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
        let optionalBlocks = this.mapOptionalBlocks(component.blocks, '\t')
        let exports = this.mapExports(component.exports, '\t')
        
        const componentBody = [args, blocks, optionalArgs, optionalBlocks, exports].filter(part => part !== '').join('\n\n')
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

    GetCompletionItemsBlock(component: Component, context: string[]): CompletionItem[] {
        let completionItems:CompletionItem[] = []
        let blocks = component.blocks
        let block = null
        let revContext = context.reverse() // reverse to start from the component level
        for (let i = 0; i < revContext.length; i++) {
            const found = blocks.find(b => b.name == revContext[i])
            if (!found) {
                this.connection.console.log("broken blocks hierarchy " + component.name)
                return completionItems
            }
            blocks = found.blocks
            block = found
        }
        if (!block) {
            this.connection.console.log("super broken blocks hierarchy " + component.name)
            return completionItems
        }
        for (const argument of block.arguments) {
            completionItems.push({
                label: argument.name,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: this.mapArguments([argument], false, 1, ""),
                documentation: argument.doc,
                detail: argument.type,
            })
        }
        for (const b of block.blocks) {
            completionItems.push({
                label: b.name,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: this.mapBlocks([b], false, "")
            })
        }
        return completionItems
    }

    mapBlocks(blocks: Block[], filterRequired: boolean, indent: string): string {
        let filteredBlocks = filterRequired? blocks.filter(block => block.required) : blocks
        return filteredBlocks
        .map(block => {
            let args = this.mapArguments(block.arguments, true, 30, '\t')
            let nestedBlocks = this.mapBlocks(block.blocks, true, '\t')
            let optionalArgs = this.mapOptionalArguments(block.arguments, '\t')
            let optionalNestedBlocks = this.mapOptionalBlocks(block.blocks, '\t')
            
            const blockBody = [args, nestedBlocks, optionalArgs, optionalNestedBlocks].filter(part => part !== '').join('\n\n')
            return `${indent}${block.name} {\n${indent}${blockBody}\n}`
        })
        .join("\n")
    }

    mapOptionalBlocks(blocks: Block[], indent: string): string {
        const optionalBlocks = blocks.filter(block => !block.required)
        if (optionalBlocks.length == 0)
            return ""
        const blockStr = optionalBlocks.length == 1 ? "block" : "blocks"
        return `${indent}// Optional ${blockStr}:` + optionalBlocks.map(block => `${block.name}`).join(", ")
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