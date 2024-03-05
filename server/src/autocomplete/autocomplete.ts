import {
    CompletionItem,
  } from 'vscode-languageserver/node';

import { Verbosity } from '../enum/verbosity'

export interface Autocomplete {
    GetCompletionItemsComponentList(components: Map<string, Component>): Promise<CompletionItem[]>
    GetCompletionItemsComponent(component: Component): CompletionItem[]
    GetCompletionItemsBlock(component: Component, context: string[]): CompletionItem[]
    setVersion(version: string): void
    setVerbosity(verbosity: Verbosity): void
}