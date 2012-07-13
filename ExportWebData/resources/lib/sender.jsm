'use strict';
var EXPORTED_SYMBOLS = ['swcSender'];

function swcSender (logFunction) {
	this.batches = [];
	this.batchIndex = 0;
	this.itemName = 'item';
	this.state = 'idle';
	this.senderFunction =  null;
	this.log =  logFunction? logFunction: function(msg) {};
	return this;
}


swcSender.prototype.queue = function(batch) {
	this.batches.push(batch);
	this._sendNext();
};

swcSender.prototype._sendNext = function() {
	if (this.state != 'idle')
		return;

	if (this.batches.length == 0) 
		return;

	var batch = this.batches[0];

	this.log('ExportWebData: Sending next ' + this.itemName);
	this.state = 'sending';


	this._notifyObservers('starting');
	var msg = this.senderFunction(batch[this.batchIndex], this);
	if (msg) {
		// The process did not initiate successfully
		this._notifyObservers('start-failed', msg);
		this._removeCurrentAndSendNext();
	}

	this.state = 'waiting';
};

swcSender.prototype.observe = function(aSubject, aTopic, aData ) {
	// subject is nsIProcess instance
	// topic is one of  "process-finished" or "process-failed"
	aSubject.QueryInterface(Components.interfaces.nsIProcess);
	this.log('ExportWebData: received notification from ' + this.itemName + ' process: ' + aTopic + ', exitValue: ' + aSubject.exitValue);

	var status = 'finished'; 
	var msg = '';
	if (aTopic == 'process-failed') {
		status = 'failed'; 
		msg = 'Return Code: ' + aSubject.exitValue;
	}

	this._notifyObservers(status, msg);
	this._removeCurrentAndSendNext();
};

swcSender.prototype._notifyObservers = function(status, msg) {

	var observerService = Components.classes['@mozilla.org/observer-service;1']
                  .getService(Components.interfaces.nsIObserverService);

    var data = {
    	status: status,
    	item: this.batches[0][this.batchIndex],
    	itemName: this.itemName,
    	msg: msg,
    }

    observerService.notifyObservers(null, 'exportwebdata-send', JSON.stringify(data));
}

swcSender.prototype._removeCurrentAndSendNext = function() {

	var batch = this.batches[0];
	if (this.batchIndex == batch.length-1) {
		// batch processed completely
		this.batches.splice(0, 1);
		this.batchIndex = 0;
	}
	else {
		this.batchIndex++;
	}

	this.log('ExportWebData: remaining ' + this.itemName + ' batches: ' + this.batches.length);
	this.state = 'idle';
	this._sendNext();
};
