require('./');
require.extensions.preprocess('.rjs', __dirname, reverseJavascript);

function reverseJavascript(module, source) {
  module.filename = module.filename.replace(/\.rjs$/, '.js');
  return source.split('\n').map(reverseLine).join('\n');
}

function reverseLine (line) {
  return line.split('').map(function (c) {
    switch (c) {
      case '(': return ')';
      case ')': return '(';
      case '[': return ']';
      case ']': return '[';
      case '{': return '}';
      case '}': return '{';
      default:  return c;
    }
  }).reverse().join('');
}

require.extensions.preprocess('.md', __dirname, codeFromMarkdown);
require.extensions.preprocess('.markdown', __dirname, codeFromMarkdown);

function codeFromMarkdown (module, source) {
  module.filename = module.filename.split('.').slice(0, -1).join('.');

  return source.split('\n').filter(function (line) {
    return /^    /.test(line);
  }).map(function (line) {
    return line.substr(4);
  }).join('\n');
}

require('./examples/literate.js.md');
