'use babel'

export function activate() {
  // Fill something here, optional
  console.log('activating LGTM linter!!!');
}

export function deactivate() {
  // Fill something here, optional
}

export function provideLinter() {
  return {
    name: 'linter-lgtm',
    scope: 'file', // or 'project'
    lintsOnChange: false,
    grammarScopes: ['source.js'],
    lint (textEditor) {
      const editorPath = textEditor.getPath();
      // const text = textEditor.getText();
      const token = atom.config.get('linter-lgtm.token');

      return new Promise(function(resolve) {
        resolve([{
          severity: 'info', // error|warning
          location: {
            file: editorPath,
            position: [[0, 0], [0, 1]],
          },
          excerpt: `A random value is ${Math.random()}; token: ${token}`,
          description: `### What is this?\nThis is a randomly generated value`

          /*
          solutions?: Array<{
            title?: string,
            position: Range,
            priority?: number,
            currentText?: string,
            replaceWith: string,
          } | {
            title?: string,
            position: Range,
            priority?: number,
            apply: (() => any),
          }>,
          reference: {file: absolute path, position: Point} elsewhere in file, e.g., class def.
          url: explanation URL
          icon: octicon for gutter
          linterName: override default name
           */
        }])
      })
    }
  }
}
