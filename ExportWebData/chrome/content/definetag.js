'use strict';
var exportWebDataTagDefiner = {

	manager: Application.storage.get('exportwebdata-manager', null),

	handleLoad: function(evt) {
		window.removeEventListener('load', exportWebDataTagDefiner.handleLoad);
		setTimeout(function() { exportWebDataTagDefiner.populate(); }, 50 );
	},

	populate: function() {

		Components.utils.import('resource://exportwebdata/lib/swcutils.jsm', this);

		var url = '';
		var tag = '';

		if (window.arguments) {
			url = window.arguments[0];
			tag = window.arguments[1];
		}

		document.getElementById('swc-dt-contenturl').value = url;
		document.getElementById('swc-dt-contenttag').value = tag;

		var lsbEmails = document.getElementById('swc-dt-lsbEmail');
		lsbEmails.sourceList = this.manager.entityEmails.listData;

		this.emailListboxAdapter(lsbEmails, true);
		lsbEmails.loadModel();

		var treeFtp = document.getElementById('swc-ftp-recipients-tree');
		treeFtp.sourceList = this.manager.entityFtpLogins.listData;

		this.ftpTreeAdapter(treeFtp, false);

		treeFtp.loadModel();

		this.sourceList = this.manager.entityTags.listData
		this.tagValidatorAdapter(this);

	},

	handleChkClicked: function(target, listId) {
		document.getElementById(listId).disabled = target.checked;
	},

	handleAccept: function() {

		var txtUrl = document.getElementById('swc-dt-contenturl');
		var txtXpath = document.getElementById('swc-dt-contenttag');
		var lsbEmails = document.getElementById('swc-dt-lsbEmail');
		var treeFtps = document.getElementById('swc-ftp-recipients-tree');


		var emails = (document.getElementById('swc-dt-chkEmail').checked? lsbEmails.getCheckedObjects(): []);
		var ftps = (document.getElementById('swc-dt-chkFtp').checked? treeFtps.getCheckedObjects(): []);

		var tagTemp = {
			id: -this.manager.entityTags.maxId,
			url: {value: txtUrl.value, ctrl: txtUrl}, 
			tag: {value: txtXpath.value, ctrl: txtXpath}, 
			emails: {value: emails, ctrl: lsbEmails}, 
			ftps: {value: ftps, ctrl: treeFtps} 
		};

		try
		{

		var result = null;
		result = this.validateItemToAdd(tagTemp);
		if (result) {
			this._showError(result.ctrl, result.msg);
			return false;
		}

		var contentTag = { 
			url: tagTemp.url.value,
			tag: tagTemp.tag.value,
			emails: this.utils.getPropsAsString(emails, 'id'),
			ftps: this.utils.getPropsAsString(ftps, 'id'),
		};

		/*
		var contentTag = {
			url: document.getElementById('swc-dt-contenturl').value,
			tag: document.getElementById('swc-dt-contenttag').value,
			emails: this.utils.getPropsAsString(emails, 'id'),
			ftps: this.utils.getPropsAsString(ftps, 'id'),
		};
		*/

		this.manager.entityTags.addAll([contentTag]);
		this.manager.writeTags();
	}
	catch(e) {
		Components.utils.reportError(e);
	}

		return true;

	},

	_showError: function(ctrl, msg) {
		ctrl.focus();
		alert(msg);
	},

};

window.addEventListener('load', exportWebDataTagDefiner.handleLoad, false);
