/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.KLVReader
 */
(function(module) {

	function KLVReader(binary) {
	    this._binary = binary;
		this._dataview = new DataView(this._binary);

		this._keys = {} // for each key: pointer to binary address
		this._parseFile();
	}

	KLVReader.prototype.getUInt = function(key) {
		var binary = this._keys[key];
		var dataView = new DataView(binary.buffer);
		if (dataView.byteLength === 1) {
			return dataView.getUint8(0, false);
		}
		else if (dataView.byteLength === 2) {
			return dataView.getUint16(0, false);
		}
		else if (dataView.byteLength === 4) {
			return dataView.getUint32(0, false);
		}
		else {
			// @todo throw exception
			return this._keys[key];
		}
	};

	KLVReader.prototype.getInt = function(key) {
		var binary = this._keys[key];
		var dataView = new DataView(binary.buffer);
		if (dataView.byteLength === 1) {
			return dataView.getInt8(0, false);
		}
		else if (dataView.byteLength === 2) {
			return dataView.getInt16(0, false);
		}
		else if (dataView.byteLength === 4) {
			return dataView.getInt32(0, false);
		}
		else {
			// @todo throw exception
			return this._keys[key];
		}
	};

	KLVReader.prototype.getFloat = function(key) {
		var binary = this._keys[key];
		var dataView = new DataView(binary.buffer);
		return dataView.getFloat32(0, false);
	};

	KLVReader.prototype.getBinary = function(key) {
		return this._keys[key];
	};

	KLVReader.prototype.getString = function(key) {
	    var binary = this._keys[key];
	    var str = String.fromCharCode.apply(String, binary);
	    return str;
	};

	KLVReader.prototype.getJSON = function(key) {
	    var str = this.getString(key);
	    var json = JSON.parse(str);
		return json;
	};

	KLVReader.prototype._parseFile = function() {
		this._keys = {}

		// parse the file
		for (var offset = 0; offset < this._dataview.byteLength - 1;) {
			var key = this._dataview.getUint32(offset, false);
			offset += 4;

			var length = this._dataview.getUint32(offset, false);
			offset += 4;

			var value = new Uint8Array(this._binary.slice(offset, offset + length));
			offset += length;

			this._keys[key] = value;
		}
	}

	module.KLVReader = KLVReader;

})(typeof WorkerGlobalScope !== 'undefined' ? WorkerGlobalScope : window);