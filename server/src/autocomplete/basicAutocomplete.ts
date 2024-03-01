import {
    CompletionItem,
    CompletionItemKind,
    InsertTextFormat,
} from 'vscode-languageserver/node';

import {
    Autocomplete,
} from './autocomplete'

export class BasicAutocomplete implements Autocomplete {
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
        const label = component.hasLabel ? " \"${1:LABEL}\"" : "";
        let autocompleteIdx = label !== "" ? 2 : 1
        let args = this.mapArguments(component.arguments, true, autocompleteIdx, '\t');
        let blocks = this.mapBlocks(component.blocks, true, '\t');
        
        const componentBody = [args, blocks].filter(part => part !== '').join('\n\n');
        return `${component.name}${label} {\n${componentBody}\n}`;
    }

    GetCompletionItemsComponent(component: Component): CompletionItem[] {
        let completionItems:CompletionItem[] = []
        for (const argument of component.arguments) {
            completionItems.push({
                label: argument.name,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: this.mapArguments([argument], false, 1, "")
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

    mapArguments(args: Argument[], filterRequired: boolean, autocompleteIdx: number, indent: string): string {
        let filteredArgs = filterRequired? args.filter(arg => arg.required) : args
        return filteredArgs
            .map(arg =>
                `${indent}${arg.name} = \${${autocompleteIdx++}:${arg.default}}`
            )
            .join('\n')
    }
}