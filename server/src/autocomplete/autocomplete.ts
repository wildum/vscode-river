import {
    CompletionItem,
  } from 'vscode-languageserver/node';

export interface Autocomplete {
    GetCompletionItemsComponentList(components: Map<string, Component>): Promise<CompletionItem[]>;
    GetCompletionItemsComponent(component: Component): CompletionItem[];
}