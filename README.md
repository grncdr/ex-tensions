# ex-tensions

Extensible and scoped `require.extensions`. 

## Synopsis

Require the `'ex-tensions'` module very early on in your source, like the first line:

```javascript
require('ex-tensions');
```

This patches `require.extensions` with a new method named `preprocess`.

Let's imagine we've written a totally awesome compile-to-JS language that's
"Just JavaScript", we'll call it JJScript, and it looks like this:

```
val CHEESE <- "brie 4 lyfe".
val BEVERAGE <- "Weißbier".
console!log["I want", BEVERAGE, "and", CHEESE, "!"].
```

(In case you're the type who doesn't like silly examples,  ¯\\\_(ツ)\_/¯).

Here's our "compiler":

```javascript
function compileJJScript (module, content) {
  // transform assignments
  content = content.replace(/val ([A-Z]+) <- (.+)\/g, "var $1 = $2")
  // transform brackets
  content = content.replace(/\[/g, '(').replace(/\]/g, ')');
  // transform statement terminators
  content = content.replace(/\./, ';');
  // transform property accessors
  content = content.replace(/!/g, '.');

  // replace file extension
  module.filename = module.filename.replace(/\.jjs$/, '.js');

  // return transformed source
  return content;
}
```

We hook that up to require.extensions like so:

```
require.extensions.preprocess('.jjs', __dirname, compileJJScript);
```

... and JJScript is now a legit language! when we require the .jjs source above we will run this javascript:

```javascript
var CHEESE = "brie 4 lyfe";
var BEVERAGE = "Weißbier";
console.log("I want", BEVERAGE, "and", CHEESE, "!");
```

## But... `require.extensions` already does that?

Mostly, but notice how we're passing `__dirname` up there? That defines the "scope" for the extension we've just registered. What this means is the preprocessor will only be run for `.jjs` files that are in the same directory (or one of it's subdirectories) as the current file. _However_ files in `__dirname + '/node_modules'` will *not* be processed. This ability to scope preprocessors is one of two big features that `ex-tensions` brings, the next is...

## Stacking Preprocessors

Beyond silly party tricks, we can hook up useful compilers like [sweet.js](http://sweetjs.org/) or [regenerator](http://facebook.github.io/regenerator/), in fact we can stack them both:

```javascript
require.extensions.preprocess('.js', __dirname, regenerator);
require.extensions.preprocess('.js', __dirname, compileSweetJS);
```

Multiple preprocessors are run in LIFO order: the above first compiles out macros with Sweet.js, then generators with regenerator. These transformations are scoped to our module, and run using the versions of each preprocessor we have installed locally.

## Switching extensions

The JJS compiler replaced the '.jjs' extension of `module.filename` with '.js'. What this does is signal `ex-tensions` that the source should now be processed by the '.js' preprocessor stack, so if our compiler produced e.g. valid generators, those would get compiled by regenerator.

Another place this can be used is in generic transforms, such as reading code out of Markdown files:

```
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
```

The preprocessor above will work for filenames like "blah.jjs.md", "blah.coffee.markdown", or any other file extension we have a preprocessor for.

## License

MIT
