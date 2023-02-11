const portastic = require('portastic');

const log = require('./log.js');

const PORT_MIN = 5550;
const PORT_MAX = 5660;

var _ports = [];
var _nextPortIndex = 0;

var portsPromise = portastic
.find({
    min: PORT_MIN,
    max: PORT_MAX
})
.then(function(ports) {
	_ports = ports;
	log(ports.length + ' ports found');
	return ports;
});

module.exports = {
	load: function() {
		log('Retrieving available ports...');
		return portsPromise;
	},
	get: function _get(number) {
		if (typeof number === 'undefined') {
		    var port = _ports[_nextPortIndex];
		    ++_nextPortIndex;
		    return port;
		}
		else {
			var ports = [];
			while (ports.length !== number) {
				ports.push(_get());
			}
			return ports;
		}
	}
};
