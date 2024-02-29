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
  console.log("River Language Server is initializing...");

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', ':']
      },
    },
  };
});

connection.onCompletion(
  (textDocumentPosition: { textDocument: { uri: string; }, position: any }): any => {
    // Use the textDocumentPosition parameter to determine the current position in the document and provide relevant completions

    // Example: Return a static list of completion items
    return [
      {
        label: 'Type1', // Display name of the completion item
        kind: 1, // CompletionItemKind: Use an integer or the CompletionItemKind enum if available
        data: 1, // An arbitrary data identifier that can be used in onCompletionResolve if resolveProvider is true
      },
      {
        label: 'Type2',
        kind: 1,
        data: 2,
      },
    ];
  }
);

connection.onCompletionResolve(
  (item: any): any => {
    if (item.data === 1) {
      item.detail = 'Type1 details'; // Additional details about the completion item
      item.documentation = 'Type1 documentation'; // Documentation for the completion item
    } else if (item.data === 2) {
      item.detail = 'Type2 details';
      item.documentation = 'Type2 documentation';
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
