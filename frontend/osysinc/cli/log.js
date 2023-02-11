const string_decoder = require('string_decoder');
const utf8Decoder = new string_decoder.StringDecoder('utf8');

function _log(str, prefix) {
	prefix = prefix || '---';
	
    console.log(prefix, str);
}
_log.prefixChunk = function (chunk, prefix) { // used to prefix fork process streams
    return utf8Decoder.write(chunk)
        .split('\n')
        .map(function(line) {
            return prefix + line;
        })
        .join('\n');
};

module.exports = _log;