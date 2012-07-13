'use strict';
var EXPORTED_SYMBOLS = ['ExportWebDataManager'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function ExportWebDataManager(logf) {
	Cu.import('resource://exportwebdata/lib/sunil-shared.jsm', ExportWebDataManager);
	Cu.import('resource://gre/modules/NetUtil.jsm'); 	
	Cu.import('resource://gre/modules/FileUtils.jsm'); 
	Cu.import('resource://exportwebdata/lib/swccommon.jsm', this);

	ExportWebDataManager.utils.initializeLog();

	this.log = ExportWebDataManager.utils.log;

	//	EmailEntity = { id: int, e:string }
	this.entityEmails = new Entity('email.json');
	//	FtpEntity = { id: int, url:string, path:string, username:string, pass:string, isAnon:boolean }
	this.entityFtpLogins = new Entity('ftp.json');
	//	TagEntity = { id: int, url:string, tag:string, emails:int[], ftps:int[] }
	this.entityTags = new Entity('tags.json');
	this._loadData();
}

function Entity(fileName) {
	this.fName = fileName;
	this.listData = [];
	this._wTimer = ExportWebDataManager._newTimer();
	this.maxId = 1;
}

Entity.prototype.notify = function(timer) {
	var dup = this.listData.concat([this.maxId]);

	var content = JSON.stringify(dup);
	var file = ExportWebDataManager._getDataDir();
	file.append(this.fName);
	ExportWebDataManager.utils.writeDataToFile(content, file,
		function(inputStream, status) {
			if (!Components.isSuccessCode(status)) {  
				// Handle error!
				ExportWebDataManager.utils._getWindow().alert('Export Web Data: Failed to update file: ' + status);
			}
		});
};

Entity.prototype.addAll = function(arrObj) { 
	for (var i=0 ; i<arrObj.length; i++) {
		var o = arrObj[i];
		o.id = '' + this.maxId++;
		this.listData.push(o);
	}
};

Entity.prototype._writeAsync = function() {
	this._wTimer.cancel();
	this._wTimer.initWithCallback(this, 300, Ci.nsITimer.TYPE_ONE_SHOT);
};

Entity.prototype._readAsync = function() {
	var file = ExportWebDataManager._getDataDir();
	file.append(this.fName);

	if (file.exists()) {
		var self = this;
		// read and populate lists
		NetUtil.asyncFetch(file, function(inputStream, status) { self._handleFetch(inputStream, status); });
	}
};

ExportWebDataManager.prototype.findTags = function(url) {
	var tags = this.entityTags.listData.filter(function(tag) {
			return tag.url == url;
		});

	return tags;
};

ExportWebDataManager.prototype.findEmails = function(ids) {
	var source = this.entityEmails.listData;
	var emails = ExportWebDataManager.utils.getItemsFromPropsString(ids, source, 'id', null);
	return emails;
};

ExportWebDataManager.prototype.findFtpLogins = function(ids) {
	var source = this.entityFtpLogins.listData;
	var ftpLogins = ExportWebDataManager.utils.getItemsFromPropsString(ids, source, 'id', null);
	return ftpLogins;
};


ExportWebDataManager.prototype.writeEmails = function() {
	this.entityEmails._writeAsync();
};
ExportWebDataManager.prototype.writeFtpLogins = function() {
	this.entityFtpLogins._writeAsync();
};
ExportWebDataManager.prototype.writeTags = function() {
	this.entityTags._writeAsync();
};


// ExportWebDataManager instance functions
ExportWebDataManager.prototype._loadData = function() {
	this.log('_loadData');

	var dir = ExportWebDataManager._getDataDir();

	var created = false;
	if( !dir.exists() || !dir.isDirectory() ) {
		// if it doesn't exist, create   
		dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0x1FF);   // 0x1FF = 0777
		created = true;
	}

	var entities = [this.entityEmails, this.entityFtpLogins, this.entityTags];

	this.log('created ' + created);
	// first time setup
	if (created) {
		for (var i=0 ; i<entities.length; i++) {
			var file = ExportWebDataManager._getDataDir();
			file.append(entities[i].fName);
			file.create(Ci.nsIFile.FILE_TYPE, 0x1FF);   // 0x1FF = 0777
		}
	}
	else {
		for (var i=0 ; i<entities.length; i++) {
			var file = ExportWebDataManager._getDataDir();
			var entity = entities[i];
			entity._readAsync();
		}
	}
};

Entity.prototype._handleFetch = function(inputStream, status) {
	var utils = ExportWebDataManager.utils;
	if (!Components.isSuccessCode(status)) {
		// Handle error!
		utils.getWindow().alert('Export Web Data: Error reading file.\n.' + status);
		return;
	}

	// The file data is contained within inputStream.
	var data = '';
	
	try {
		data = utils.readStream(inputStream);
	}
	catch(ex) {
		Cu.reportError('Export Web Data: ' + ex);
		utils.getWindow().alert('Export Web Data: Error reading file.\n' + ex); // TODO: localize it
	}

	utils.log('Data read: ' + data);
	if (data) {
		var lstSource = JSON.parse(data);
		utils.log(lstSource);
		for (var i=0 ; i<lstSource.length-1; i++)
			this.listData.push(lstSource[i]);
		this.maxId = lstSource[lstSource.length-1];
	}

};

// ExportWebDataManager static functions
ExportWebDataManager._getDataDir = function() {
	// get profile directory  
	var file = ExportWebDataManager.utils.getProfileDir();
	
	file.append('exportwebdata');
	return file;
};

ExportWebDataManager._newTimer = function() {
	return Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
};
