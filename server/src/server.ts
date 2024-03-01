import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BasicAutocomplete } from './autocomplete/basicAutocomplete';
import { FixtureComponentDataSource } from './datasource/fixture';

// Create a connection for the server. The connection uses Node's IPC as a transport.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The TextDocuments class is a generic container that supports full text synchronization.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const dataSource = new FixtureComponentDataSource();
let components = new Map<string, Component>();

const autocomplete = new BasicAutocomplete();
let completionItemsComponentList: CompletionItem[] = []

connection.onInitialize((params: InitializeParams) => {
  connection.console.log("River Language Server is initializing...");

  dataSource.getComponents().then(data => {
    components = data
    connection.console.log("components loaded: " + components.size)
    autocomplete.GetCompletionItemsComponentList(components).then(data => {
      completionItemsComponentList = data
      connection.console.log("autocompletion items loaded " + completionItemsComponentList.length)
    })
  })

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true
      },
    },
  };
});

connection.onCompletion(
  (textDocumentPosition: { textDocument: { uri: string; }, position: any }): CompletionItem[] => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
      return []; // No document found
    }

    if (completionItemsComponentList.length == 0) {
      return []; // Autocomplete is not ready yet
    }

    const text = document.getText({
      start: { line: 0, character: 0 },
      end: textDocumentPosition.position,
    });

    let componentName = getComponentName(text)

    if (componentName == "" || componentName == "declare") {
      return completionItemsComponentList
    }

    let component = components.get(componentName)
    if (component) {
      return autocomplete.GetCompletionItemsComponent(component)
    }

    // no match, no autocomplete
    return []

  }
);

connection.onCompletionResolve(
  // use the doc from the components map
  (item: any): any => {
    if (item.data === 1) {
      item.detail = 'scrape'; // Additional details about the completion item
      item.documentation = 'scrape documentation'; // Documentation for the completion item
    } else if (item.data === 2) {
      item.detail = 'remote_write details';
      item.documentation = 'remote_write documentation';
    } else if (item.data === 3) {
      item.detail = 'otel receiver prom details';
      item.documentation = 'otel receiver prom documentation';
    }
    return item;
  }
);

// Example of handling didChangeConfigurationNotification
connection.onDidChangeConfiguration((change) => {
  // Here you can handle configuration changes
  // This is useful if your language server has settings in VS Code that users can set
});

// Example of a simple text document content change event
documents.onDidChangeContent((change) => {
  // React to content changes in text documents managed by this server
  // This is where you might trigger linting, compilation, or other analyses
});

// Make the text document manager listen on the connection
// for open, change, and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

function getComponentName(text: string): string {
  let blockText = '';
  let stack: string[] = []
  for (const c of text) {
    if (c == "{") {
      stack.push(blockText)
    } else if (c == "}") {
      stack.pop();
      blockText = ""
    } else {
      blockText += c
    }
  }
  if (stack.length == 0) {
    return ''
  }

  let raw_context = stack.pop()
  let componentName = raw_context?.trim().split(/[ \n\r\t]+/)[0]
  return componentName ? componentName : ""
}