# Literate JavaScript example

This is a markdown file, but you can require it in node.js. Code that is
indented will be treated as the content of the module.

    module.exports = shout;
    function shout (message) {
      return message + '!';
    }

We just write regular node.js code and it all works, and we can even require files in random other languages:

    var repeat = require('./repeat.rjs');
    shout.alot = function (times, message) {
      return repeat(times, shout, message).join(' ');
    };

(`.rjs` above is "reverse javascript", [take a look at the source](repeat.rjs))
