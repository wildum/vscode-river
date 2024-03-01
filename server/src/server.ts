import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server. The connection uses Node's IPC as a transport.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The TextDocuments class is a generic container that supports full text synchronization.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  connection.console.log("River Language Server is initializing...");

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
  (textDocumentPosition: { textDocument: { uri: string; }, position: any }): any => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
      return []; // No document found
    }

    const text = document.getText({
      start: { line: 0, character: 0 },
      end: textDocumentPosition.position,
    });

    let context = getContext(text)

    connection.console.log("context: "+context)

    if (context == "prometheus.scrape") {5
      return [
        {
          label: 'blabla', // Display name of the completion item
          kind: 1, // CompletionItemKind: Use an integer or the CompletionItemKind enum if available
          data: 1, // An arbitrary data identifier that can be used in onCompletionResolve if resolveProvider is true
        },
        {
          label: 'nonono',
          kind: 1,
          data: 2,
        }]
    } else if (context == "prometheus.remote_write") {
      return [
        {
          label: 'yyyyyyyyy', // Display name of the completion item
          kind: 1, // CompletionItemKind: Use an integer or the CompletionItemKind enum if available
          data: 1, // An arbitrary data identifier that can be used in onCompletionResolve if resolveProvider is true
        },
        {
          label: 'remeo',
          kind: 1,
          data: 2,
        }]
    } else if (context == "") {
      return [
        {
          label: 'prometheus.scrape', // Display name of the completion item
          kind: 1, // CompletionItemKind: Use an integer or the CompletionItemKind enum if available
          data: 1, // An arbitrary data identifier that can be used in onCompletionResolve if resolveProvider is true
        },
        {
          label: 'prometheus.remote_write',
          kind: 1,
          data: 2,
        },
        {
          label: 'otel.receiver.prometheus',
          kind: 1,
          data: 3,
        },
      ];
    }

   return []
    
  }
);

connection.onCompletionResolve(
  (item: any): any => {
    // if (item.data === 1) {
    //   item.detail = 'scrape'; // Additional details about the completion item
    //   item.documentation = 'scrape documentation'; // Documentation for the completion item
    // } else if (item.data === 2) {
    //   item.detail = 'remote_write details';
    //   item.documentation = 'remote_write documentation';
    // } else if (item.data === 3) {
    //   item.detail = 'otel receiver prom details';
    //   item.documentation = 'otel receiver prom documentation';
    // }
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

function getContext(text: string) {
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
  let context = raw_context?.trim().split(/[ \n\r\t]+/)[0]
  return context
}