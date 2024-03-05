import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { BasicAutocomplete } from './autocomplete/basicAutocomplete'
import { MarkdownComponentDataSource } from './datasource/markdown'

// Create a connection for the server. The connection uses Node's IPC as a transport.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The TextDocuments class is a generic container that supports full text synchronization.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let version = 'release-v0.40';

const dataSource = new MarkdownComponentDataSource(connection, version);
let components = new Map<string, Component>();

const autocomplete = new BasicAutocomplete(connection, version);
let completionItemsComponentList: CompletionItem[] = []

connection.onInitialize((params: InitializeParams) => {

  const config = params.initializationOptions?.config;
  if (config.agentVersion) {
    version = config.agentVersion;
  } else {
    connection.console.log("use default version: " + version)
  }

  loadData()

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
    const document = documents.get(textDocumentPosition.textDocument.uri)
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

    let context = getContext(text)
    connection.console.log("context: " + context.join(", "))

    // root level or in a declare
    if (context.length == 0 || context[0] == "declare") {
      return completionItemsComponentList
    }

    // component level
    let component = components.get(context[0])
    if (component) {
      return autocomplete.GetCompletionItemsComponent(component)
    }

    // block level
    let it = 1
    while (it < context.length) {
      let component = components.get(context[it])
      if (component) {
        return autocomplete.GetCompletionItemsBlock(component, context.slice(0, it))
      }
      it++
    }

    // no match, no autocomplete
    return []

  }
);

connection.onCompletionResolve(
  // use the doc from the components map
  (item: CompletionItem): CompletionItem => {
    let component = components.get(item.label)
    if (component) {
      item.documentation = component.doc
    }
    return item;
  }
);

connection.onDidChangeConfiguration((change) => {
  let newVersion = change.settings.riverLanguageServer?.agentVersion
  if (newVersion != version) {
    version = change.settings.riverLanguageServer.agentVersion
    // Update the dataSource and autocomplete with the new version
    dataSource.setVersion(version)
    autocomplete.setVersion(version)
    // TODO: cancel all pending requests
    loadData()
  }
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

// returns the open blocks, starting from the most nested to the root
function getContext(text: string): string[] {
  let blockText = '';
  let stack: string[] = []
  for (const c of text) {
    if (c == "{") {
      stack.push(blockText)
      blockText = ""
    } else if (c == "}") {
      stack.pop();
      blockText = ""
    } else {
      blockText += c
    }
  }
  if (stack.length == 0) {
    return []
  }

  let context = []
  for (const c of stack) {
    let arr = c!.trim().split(/[ \n\r\t]+/)
    // ignore label if there is any
    context.push(arr[arr.length - 1].includes("\"") ? arr[arr.length - 2] : arr[arr.length - 1])
  }
  return context.reverse()
}

function loadData() {
  connection.console.log("River Language Server is initializing with version " + version)
  dataSource.getComponents().then(data => {
    components = data
    connection.console.log("Components loaded: " + components.size)
    autocomplete.GetCompletionItemsComponentList(components).then(data => {
      completionItemsComponentList = data
      connection.console.log("Autocompletion items loaded: " + completionItemsComponentList.length)
    });
  });
}