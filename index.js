var debug = require('debug')('ex-tensions');
var fs = require('fs');
var path = require('path');

var VERY_SECRET = '  super magic happy fun times  ';

// Sentinel value that signifies a global preprocessor. This can only be used
// within this module, so ignore it.
var GLOBAL_SCOPE = {};

// already patched? return early
if (require.extensions[VERY_SECRET]) {
  return false;
}

Object.defineProperty(require.extensions, 'preprocess', {
  value: addPreprocessor
});

function addPreprocessor (ext, scope, processor) {
  var loader = this[ext] || initLoader(this, ext);
  if (!this[ext].unshift) {
    throw new Error(
      'Refusing to clobber existing require extension for ' + ext
    );
  }
  loader.unshift(scope, processor);
}

function initLoader (extensions, ext) {
  var stages = [];

  var extRegexp = new RegExp(ext + '$');

  Object.defineProperty(extensions, ext, {
    enumerable: true,
    get: function () {
      return loader;
    },
    set: function () {
      throw new TypeError('"Deprecated", use require.extensions["' +
                          ext + '"].unshift(scope, contentProcessor)');
    }
  });

  function loader (module, filename) {
    var content = loader.preprocess(module, fs.readFileSync(filename, 'utf8'));
    module._compile(content, filename);
  }

  loader.unshift = function (scope, processor) {
    if (scope !== GLOBAL_SCOPE && typeof scope !== 'string') {
      throw new TypeError('scope must be a string path, prefer __dirname');
    }
    if (typeof processor !== 'function') {
      throw new TypeError('processor must be a function');
    }
    debug('added preprocessor %s for %s in %s',
          processor.name || '<anonymous>', ext, scope);
    if (scope === GLOBAL_SCOPE) {
      stages.unshift(processor);
    } else {
      stages.unshift(scoped(scope, processor));
    }
  }

  loader.preprocess = function (module, content) {
    for (var i = 0, len = stages.length; i < len; i++) {
      content = stages[i](module, content);
      if (!extRegexp.test(module.filename)) {
        // Previous stage changed extension of module.filename
        // call the new loader.
        debug('extension changed %s', module.filename);
        return chooseLoader(module.filename).preprocess(module, content);
      }
    }
    return content
  };

  function chooseLoader (filename) {
    var ext = '.' + filename.split('.').slice(1).pop();
    if (require.extensions.hasOwnProperty(ext)) {
      return require.extensions[ext];
    }
    throw new TypeError('No loader for extension ' + ext);
  }

  return loader;
}

/** Wrap a processor function so it will only be applied to the given scope */
function scoped (scope, processor) {
  var basedir = new RegExp('^' + path.resolve(scope));
  var nm = new RegExp('/node_modules/');
  return function (module, content) {
    if (basedir.test(module.filename) &&
        !nm.test(module.filename.replace(basedir, ''))
    ) {
      return processor(module, content);
    } else {
      return content;
    }
  }
}

Object.defineProperty(require.extensions, VERY_SECRET,
                      { enumerable: false, value: true });

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 * because the buffer-to-string conversion in `fs.readFileSync()`
 * translates it to FEFF, the UTF-16 BOM.
 *
 * Copied directly from joyent/node's lib/module.js
 *
 * @api private
 */
function stripBOM (module, content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

// strip the shebang if present, again copied from joyent/node/lib/module.js
function stripShebang (module, content) {
  return content.replace(/^\#\!.*/, '');
}

function jsonToJavaScript (module, content) {
  module.filename = module.filename.replace(/\.json$/, '.js');
  try {
    JSON.parse(content)
  } catch (e) {
    throw new Error(module.filename + ' is not valid JSON');
  }
  return 'module.exports=' + content + ';';
}

['.js', '.json'].forEach(function (ext) {
  delete require.extensions[ext];
  initLoader(require.extensions, ext);
});

require.extensions.preprocess('.js', GLOBAL_SCOPE, stripBOM);
require.extensions.preprocess('.js', GLOBAL_SCOPE, stripShebang);
require.extensions.preprocess('.json', GLOBAL_SCOPE, jsonToJavaScript);
