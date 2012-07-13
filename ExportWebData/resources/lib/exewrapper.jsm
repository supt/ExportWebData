'use strict';
var EXPORTED_SYMBOLS = ['swcExeWrapper'];

function swcExeWrapper(){
	/**
	* Wraps an exe file 
	*
	* path: Path to exe file
	* execFunction: Reference to a function
	*					returns: String error msg
	*					paramters: process, args
	*/
	this.path = '';
	this.exeProcess = null;
	this.execFunction = null;
	return this;
};

swcExeWrapper.prototype.init = function(path) {
	var msg = '';

	try {
		var result = this._start(path);
		msg = result.msg;
		this.exeProcess = result.process;
	}
	catch(ex) {
		msg = 'Failed to initialed with path\n' + path +'\n' + ex;
        Components.utils.reportError(ex);
	}

	if (msg) {
        Components.utils.reportError(msg);
	}

	this.path = path;
	return result.msg;
};

swcExeWrapper.prototype._start = function(path) {

	var process = swcExeWrapper.processes[path];	

	if (!process) {
		var exeFile = Components.classes['@mozilla.org/file/local;1'].getService(Components.interfaces.nsILocalFile);
		exeFile.initWithPath(path);

		var process = Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess);
		try {
	        process.init(exeFile);
	        //swcExeWrapper.processes[path] = process;
	    }
	    catch(e){
	        Components.utils.reportError(e);
	        return { msg:e.message, process:null };
	    }
	}

    return { msg:'', process:process };
};

swcExeWrapper.prototype.invoke = function(args) {
	return this.execFunction(this.exeProcess, args);
};

swcExeWrapper.processes = new Array();
