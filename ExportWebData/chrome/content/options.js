'use strict';
var exportWebDataOptions = {
	manager: null,

	txtEmail: null,
	lsbEmail:null,

	treeTags:null,
	
	treeFtpLogins: null,

	_showError: function(ctrl, msg) {
		ctrl.focus();
		alert(msg);
	},

	_updateButtonsOnSelection: function(prefix, selCount) {
		var btnUpdate = document.getElementById(prefix + '-update');

		if (!btnUpdate.disabled) {
			return;
		}

		var btnEdit = document.getElementById(prefix + '-edit');
		var btnDel = document.getElementById(prefix + '-delete');

		if (selCount == 0) {
			btnEdit.disabled = btnDel.disabled = true;
		}
		else if (selCount == 1) {
			btnEdit.disabled = btnDel.disabled = false;
		}
		else if (selCount > 1) {
			btnEdit.disabled = true;
			btnDel.disabled = false;
		}
	},

	_updateButtonsForEditMode: function(prefix, editStart) {
		var btnAdd = document.getElementById(prefix + '-add');
		var btnDel = document.getElementById(prefix + '-delete');
		var btnEdit = document.getElementById(prefix + '-edit');
		var btnUpdate = document.getElementById(prefix + '-update');
		var btnCancel = document.getElementById(prefix + '-editcancel');
		
		btnEdit.hidden = btnDel.hidden = btnAdd.hidden = editStart;
		btnEdit.disabled = btnDel.disabled = btnAdd.disabled = editStart;

		btnUpdate.hidden = btnCancel.hidden = btnUpdate.disabled = btnCancel.disabled = !editStart;

		return btnUpdate;
	},

	_updateTreeButtonsForEdit: function(prefix, editStart, tree) {
		var btnUpdate = this._updateButtonsForEditMode(prefix, editStart)

		if (editStart) {
			btnUpdate.swcTargetIndex = tree.currentIndex;
		}
		else {
			btnUpdate.swcTargetIndex = '';
		}
	},

	handleLoad: function(evt) {
		window.removeEventListener('load', exportWebDataOptions.handleLoad, false); 
		window.setTimeout( function() {exportWebDataOptions.init();}, 400 );
	},

	_deepClone: function(source) {
		var strSource = JSON.stringify(source);
		var clone = JSON.parse(strSource);
		return clone;
	}, 

	_getExePath: function(){
		var firstDefault;
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
		fp.init(window, null, nsIFilePicker.modeOpen);

		fp.appendFilters(nsIFilePicker.filterApps);

		var emailProgramPath = null;

		var result = fp.show();
		if (result == nsIFilePicker.returnOK) {
			emailProgramPath = fp.file.path;
		}

		return emailProgramPath;
	},

	browseForFile: function(textboxId, filenamehint) {
		var path = this._getExePath();

		if (path == null) {
			// user press cancelled on file selection dialog
			return;
		}

		if (path.toLowerCase().indexOf(filenamehint) == -1) {
			alert('Must select ' + filenamehint + '.exe.');
		}
		else {
			document.getElementById(textboxId).value = path;
		}
	},

	init: function() {
		Components.utils.import('resource://exportwebdata/lib/swcutils.jsm', this);

		this.manager = Application.storage.get('exportwebdata-manager', null);


		var prefs = this.utils._getPrefService('extensions.exportwebdata.');

		// First update the preferences to store the path of exe file
		document.getElementById('swc-mailclient-txtpath').value = prefs.getCharPref('mailsendexe');

		document.getElementById('swc-mailclient-txthost').value = prefs.getCharPref('smtpserver');

		var username = prefs.getCharPref('smtpuser');
		document.getElementById('swc-mailclient-txtuser').value = username;
		
		document.getElementById('swc-mailclient-txtname').value = prefs.getCharPref('smtpname');

		var password = this.manager.getSmtpPassword();
		document.getElementById('swc-mailclient-txtpass').value = password;

		document.getElementById('swc-mailclient-txtport').value = prefs.getCharPref('smtpport');

		var security = prefs.getCharPref('smtpsecurity');
		if (security != 'starttls') {
			// non-default
			document.getElementById('swc-mailclient-rgsecurity').selectedItem = document.getElementById('swc-mailclient-rbssl');
		}

		document.getElementById('swc-ftpclient-txtpath').value = prefs.getCharPref('ftpexe');

		/* Setup emails */
		this.txtEmail = document.getElementById('swc-email-recipients-textbox');
		this.lsbEmail = document.getElementById('swc-email-recipients-listbox');

		var original = this.manager.entityEmails.listData;

		this.lsbEmail.sourceList = this._deepClone(original);


		/* Setup FTP logins */
		this.treeFtpLogins = document.getElementById('swc-ftp-recipients-tree');

		original = this.manager.entityFtpLogins.listData;
		this.treeFtpLogins.sourceList = this._deepClone(original);

		/* Setup user defined content */
		this.treeTags = document.getElementById('swc-content-setup-tree');
		var txtEmails = document.getElementById('swc-content-setup-txtemails');
		txtEmails.sourceList = [];

		var txtFtps = document.getElementById('swc-content-setup-txtftps');
		txtFtps.sourceList = [];


		original = this.manager.entityTags.listData;
		this.treeTags.sourceList = this._deepClone(original);
		this.treeTags.sourceEmails = this.lsbEmail.sourceList;
		this.treeTags.sourceFtpLogins = this.treeFtpLogins.sourceList;

		this.ftpTreeAdapter(this.treeFtpLogins, true);
		this.tagTreeAdapter(this.treeTags);
		this.emailListboxAdapter(this.lsbEmail, false);


		this.lsbEmail.loadModel();
		this.treeFtpLogins.loadModel();
		this.treeTags.loadModel();


		window.addEventListener('unload', this.handleUnload, false); 
		this.lsbEmail.addEventListener('select', this.handleEmailItemSelect, false);
		this.treeFtpLogins.addEventListener('select', this.handleFtpLoginItemSelect, false);
		this.treeTags.addEventListener('select', this.handleTagItemSelect, false);

		var btn = null;

		btn = document.getElementById('swc-content-setup-btnemails');
		btn.addEventListener('click', this.handleAddEmailButtonClick,false);

		btn = document.getElementById('swc-content-setup-btnftps');
		btn.addEventListener('click', this.handleAddFtpLoginButtonClick,false);

		btn = document.getElementById('swc-ftp-recipients-chkanonymous');
		btn.addEventListener('click', this.handleChkAnonClicked,false);

	},


	handleUnload: function(evt) {
		var self = exportWebDataOptions;
		
		window.removeEventListener('unload', self.handleUnload); 
		
		self.lsbEmail.removeEventListener('select', self.handleEmailItemSelect);
		self.treeFtpLogins.removeEventListener('select', self.handleFtpLoginItemSelect);
		self.treeTags.removeEventListener('select', self.handleTagItemSelect);

		var btn = null;

		btn = document.getElementById('swc-content-setup-btnemails');
		btn.removeEventListener('click', self.handleAddEmailButtonClick);

		btn = document.getElementById('swc-content-setup-btnftps');
		btn.removeEventListener('click', self.handleAddFtpLoginButtonClick);

		btn = document.getElementById('swc-ftp-recipients-chkanonymous');
		btn.removeEventListener('click', self.handleChkAnonClicked);

	},

	handleAddEmailButtonClick: function(evt) {
		var self = exportWebDataOptions;
		var url = 'chrome://exportwebdata/content/edittagemailrecipients.xul';

		var txtEmails = document.getElementById('swc-content-setup-txtemails');
		var args = { master: self.lsbEmail.sourceList, checked:txtEmails.sourceList};

		var acceptArgs = {textbox: txtEmails, propName: 'e'};

		self.openWindowDelayed(url, 'w1', args, acceptArgs);
	},

	handleAddFtpLoginButtonClick: function(evt) {
		var self = exportWebDataOptions;
		var url = 'chrome://exportwebdata/content/edittagftprecipients.xul';

		var txtFtps = document.getElementById('swc-content-setup-txtftps');
		var args = { master: self.treeFtpLogins.sourceList, checked: txtFtps.sourceList };

		var acceptArgs = {textbox: txtFtps, propName: 'url'};

		self.openWindowDelayed(url, 'w2', args, acceptArgs);
	},

	openWindowDelayed: function(url, name, args, acceptArgs) {
		args.returnValue = null;

		window.setTimeout(function() {
			window.openDialog(url, name, 'chrome,resizable,modal, centerscreen', args);
			if (args.returnValue) {

				var ids = [x.id for each(x in args.returnValue)];

				exportWebDataOptions.populateTextboxWithList(acceptArgs.textbox, ids, args.master, acceptArgs.propName);
			}
		}, 50);
	},

	populateTextboxWithList: function(textbox, lstIds, masterList, objPropName) {

		var emails = this.utils.getItemsFromPropsString(lstIds, masterList, 'id', objPropName);

		textbox.value =  emails;
		textbox.sourceList = lstIds;

	},

	handleEmailItemSelect: function(evt) {
		var selCount = exportWebDataOptions.lsbEmail.selectedItems.length;
		exportWebDataOptions._updateButtonsOnSelection('email-recipients', selCount);
	},

	handleFtpLoginItemSelect: function(evt) {
		var selCount = exportWebDataOptions.treeFtpLogins.getSelectedIndices().length;
		exportWebDataOptions._updateButtonsOnSelection('ftp-recipients', selCount);
	},

	handleTagItemSelect: function(evt) {
		var selCount = exportWebDataOptions.treeTags.getSelectedIndices().length;
		exportWebDataOptions._updateButtonsOnSelection('content-setup', selCount);
	},

	processEmail: function(targetIndex) {
		var email = this.txtEmail.value.trim();

		var id = -this.manager.entityEmails.maxId;
		var existingItem = null 

		if (targetIndex >= 0) {
			var btnUpdate = document.getElementById('email-recipients-update');
			var selIndex = btnUpdate.swcTargetIndex;

			existingItem = this.lsbEmail.getItemAtIndex(selIndex);
			id = existingItem.swcEmail.id;
		}

		var objToValidate = {
			id: id,
			e: { value: email, ctrl: this.txtEmail }
		};

		var msg = this.lsbEmail.validateItemToAdd(objToValidate);

		if (msg) {
			this._showError(this.txtEmail, msg);
			this.txtEmail.focus();
			return;
		}

		var item = null;
		if (existingItem == null) {
			// Add new item
			var data = {id:this.manager.entityEmails.maxId++, e:email};
			this.lsbEmail.sourceList.push(data);
			
			item = this.lsbEmail.addEmailToListBox(data);
		}
		else {
			// Update existing item
			item = existingItem;
			item.swcEmail.e = email;
			item.label = email;
			this.updateEmailButtonsForEdit(false);
		}

		this.lsbEmail.selectItem(item);
		this.lsbEmail.ensureElementIsVisible(item);

		this.txtEmail.value = '';

		this.txtEmail.focus();
	},

	delEmail: function() {
		var itemsToDel = this.lsbEmail.selectedItems;
		var selCount = itemsToDel.length;

		var msg = 'Are you sure you want to delete ' + ( selCount>1? selCount + ' items?': '\'' + itemsToDel[0].swcEmail.e+ '\'?');

		if (!confirm(msg)) return;

		var indices = [this.lsbEmail.getIndexOfItem(x) for each(x in itemsToDel)];
		indices.sort();

		var removed = new Array(indices.length);

		// remove from end
		for(var i=indices.length-1 ; i>=0; i--) {
			var c = indices[i];
			this.lsbEmail.removeItemAt(c);
			removed.push(this.lsbEmail.sourceList.splice(c, 1)[0]);
		}

		var ids = this._getIds(removed);

		this._updateTagsForRemoval('emails', ids);
	},

	_getIds: function (objects) {
		return [x.id for each(x in objects)];
	},

	_updateTagsForRemoval: function(itemPropName, removed) {
		for (var t=0 ; t<this.treeTags.sourceList.length ; t++ ) {
			var tag = this.treeTags.sourceList[t];
			var lstTarget = tag[itemPropName];

			for(var i=0 ; i<removed.length; i++) {
				var pos = lstTarget.indexOf(removed[i]);
				if (pos >= 0) 
					lstTarget.splice(pos, 1);
			}
			this.treeTags.refreshRowAt(t);
		}
	},

	updateEmailButtonsForEdit: function(editStart) {
		var btnUpdate = this._updateButtonsForEditMode('email-recipients', editStart)

		if (editStart) {
			btnUpdate.swcTargetIndex = this.lsbEmail.selectedIndex;
			this.txtEmail.value = this.lsbEmail.selectedItem.swcEmail.e;
		}
		else {
			btnUpdate.swcTargetIndex = '';
			this.txtEmail.value = '';
		}
		this.txtEmail.focus();
	},


	handleChkAnonClicked: function (e) {
		var txtUsername = document.getElementById('swc-ftp-recipients-txtusername');
		var txtPass = document.getElementById('swc-ftp-recipients-txtpassword');

		txtUsername.disabled = txtPass.disabled = e.target.checked;
	},

	processFtpLogin: function(targetIndex) {

		var txtUrl = document.getElementById('swc-ftp-recipients-txturl');
		var txtPath = document.getElementById('swc-ftp-recipients-txtpath');
		var txtUsername = document.getElementById('swc-ftp-recipients-txtusername');
		var txtPass = document.getElementById('swc-ftp-recipients-txtpassword');
		var chkAnonymous = document.getElementById('swc-ftp-recipients-chkanonymous');
		var chkTls = document.getElementById('swc-ftp-recipients-chkforcetls');

	    var loginToUpdate = null;
	    var id = -this.manager.entityFtpLogins.maxId;

		if (targetIndex >= 0) {
		    loginToUpdate = this.treeFtpLogins['sourceList'][targetIndex];
		    id = loginToUpdate.id;
		}

		var ftpLoginTemp = {
			id: id,
			url: {value: txtUrl.value, ctrl: txtUrl}, 
			path: {value: txtPath.value, ctrl: txtPath}, 
			username: {value: txtUsername.value, ctrl: txtUsername}, 
			pass: {value: txtPass.value, ctrl:txtPass } ,
			isAnon: {value: chkAnonymous.checked, ctrl: chkAnonymous},
		}

		var result = null;

		result = this.treeFtpLogins.validateItemToAdd(ftpLoginTemp);

		if (result) {
			this._showError(result.ctrl, result.msg);
			return;
		}

		var data = { 
			url: ftpLoginTemp.url.value,
			path: ftpLoginTemp.path.value,
			username: ftpLoginTemp.username.value,
			pass: ftpLoginTemp.pass.value,
			isAnon: ftpLoginTemp.isAnon.value,
			forceTls: chkTls.checked,
		}

		var indexToSelect = -1;
		if (targetIndex <0) {
			// add new login details
			data.id = this.manager.entityFtpLogins.maxId++;
			this.treeFtpLogins.sourceList.push(data);

			var item = this.treeFtpLogins.newTreeItem();

			item['swcFtp'] = data; // custom property, cannot use value

	        indexToSelect = this.treeFtpLogins.view.rowCount-1;
		}
		else {
			data.id = ftpLoginTemp.id;
			// update existingItem
	        indexToSelect = targetIndex;

	        loginToUpdate.url = data.url;
	        loginToUpdate.path = data.path;
	        loginToUpdate.username = data.username;
	        loginToUpdate.pass = data.pass;
	        loginToUpdate.isAnon = data.isAnon;
	        loginToUpdate.forceTls = data.forceTls;

	        this.updateFtpLoginButtonsForEdit(false);
		}

	    this.treeFtpLogins.updateRow(data, indexToSelect);
		this.treeFtpLogins.selectAndMakeVisible(indexToSelect);

		txtUrl.value = '';
		txtPath.value = '';
		txtUsername.value = '';
		txtPass.value = '';
		chkAnonymous.checked = false;
		chkTls.checked = false;
		txtUsername.disabled = txtPass.disabled = false;
		txtUrl.focus();
	},

	updateFtpLoginButtonsForEdit: function(editStart) {
		this._updateTreeButtonsForEdit('ftp-recipients', editStart, this.treeFtpLogins);

		var txtUrl = document.getElementById('swc-ftp-recipients-txturl');
		var txtPath = document.getElementById('swc-ftp-recipients-txtpath');
		var txtUsername = document.getElementById('swc-ftp-recipients-txtusername');
		var txtPass = document.getElementById('swc-ftp-recipients-txtpassword');
		var chkAnonymous = document.getElementById('swc-ftp-recipients-chkanonymous');
		var chkTls = document.getElementById('swc-ftp-recipients-chkforcetls');

		if (editStart) {
			var selRow = (this.treeFtpLogins.getSelectedTreeRows())[0];
			var login = selRow.parentNode.swcFtp;
			txtUrl.value = login.url;
			txtPath.value = login.path;
			txtUsername.value = login.username;
			txtPass.value = login.pass;
			chkAnonymous.checked = login.isAnon;
			chkTls.checked = login.forceTls;
		}
		else {
			txtUrl.value = '';
			txtPath.value = '';
			txtUsername.value = '';
			txtPass.value = '';
			chkAnonymous.checked = false;
			chkTls.checked = false;
		}

		txtUsername.disabled = txtPass.disabled = chkAnonymous.checked;
		txtUrl.focus();
	},

	delFtpLogin: function() {
		var removed = this.treeFtpLogins.delSelectedItems(
			function(row) {
				return row.parentNode.swcFtp.url;
			});

		var ids = this._getIds(removed);
		this._updateTagsForRemoval('ftps', ids);

	},

	processTag: function(targetIndex) {
		var txtUrl = document.getElementById('swc-content-setup-txturl');
		var txtXpath = document.getElementById('swc-content-setup-txtxpath');
		var txtEmails = document.getElementById('swc-content-setup-txtemails');
		var txtFtps = document.getElementById('swc-content-setup-txtftps');

		var tagToUpdate = null;
		var id = -this.manager.entityTags.maxId;

		if (targetIndex >= 0) {
	        tagToUpdate = this.treeTags['sourceList'][targetIndex];
	        id = tagToUpdate.id;
	    }

		var tagTemp = {
			id: id,
			url: {value: txtUrl.value, ctrl: txtUrl}, 
			tag: {value: txtXpath.value, ctrl: txtXpath}, 
			emails: {value: txtEmails.sourceList, ctrl: txtEmails}, 
			ftps: {value: txtFtps.sourceList, ctrl: txtFtps} 
		};

		var result = null;
		result = this.treeTags.validateItemToAdd(tagTemp);
		if (result) {
			this._showError(result.ctrl, result.msg);
			return;
		}

		var data = { 
			url: tagTemp.url.value,
			tag: tagTemp.tag.value,
			emails: tagTemp.emails.value,
			ftps: tagTemp.ftps.value
		};

		var indexToSelect = -1;
		if (targetIndex <0) {
			// add new Tag
			data.id = this.manager.entityTags.maxId++;
			this.treeTags.sourceList.push(data);

			var item = this.treeTags.newTreeItem(data);

			item['swcTag'] = data; // custom property, cannot use value

	        indexToSelect = this.treeTags.view.rowCount-1;
		}
		else {
			data.id = tagTemp.id;
			// update existingItem
	        indexToSelect = targetIndex;

	        tagToUpdate.url = data.url;
	        tagToUpdate.tag = data.tag;
	        tagToUpdate.emails = data.emails;
	        tagToUpdate.ftps = data.ftps;

	        this.updateTagButtonsForEdit(false);
		}

		this.treeTags.updateRow(data, indexToSelect);
		this.treeTags.selectAndMakeVisible(indexToSelect);

		txtUrl.value = '';
		txtXpath.value = '';

		txtEmails.value = '';
		txtEmails.sourceList = [];

		txtFtps.value = '';
		txtFtps.sourceList = [];

		txtUrl.focus();
	},

	updateTagButtonsForEdit: function(editStart) {
		this._updateTreeButtonsForEdit('content-setup', editStart, this.treeTags);

		var txtUrl = document.getElementById('swc-content-setup-txturl');
		var txtXpath = document.getElementById('swc-content-setup-txtxpath');
		var txtEmails = document.getElementById('swc-content-setup-txtemails');
		var txtFtps = document.getElementById('swc-content-setup-txtftps');

		if (editStart) {
			var selRow = (this.treeTags.getSelectedTreeRows())[0];
			var tag = selRow.parentNode.swcTag;

			txtUrl.value = tag.url;
			txtXpath.value = tag.tag;

			this.populateTextboxWithList(txtEmails, tag.emails, this.treeTags.sourceEmails, 'e');
			this.populateTextboxWithList(txtFtps, tag.ftps, this.treeTags.sourceFtpLogins, 'url');
		}
		else {
			txtUrl.value = '';
			txtXpath.value = '';

			txtEmails.value = '';
			txtEmails.sourceList = [];

			txtFtps.value = '';
			txtFtps.sourceList = [];
		}

		txtUrl.focus();
	},

	delTag: function() {
		var removed = this.treeTags.delSelectedItems(
			function(row) {
				return row.parentNode.swcTag.url;
			});
	},

	handleAccept: function() {
		var v = false;
		try {
			if (!this._isEditInProgress())			
				if (this._validateForm())
					v = this._handleAcceptCore();
		}
		catch(ex) {
			Components.utils.reportError(ex);
		}
		return v;
	},

	_handleAcceptCore: function() {

		this._updateEntity(this.manager.entityEmails, this.lsbEmail.sourceList);
		this.manager.writeEmails();

		this._updateEntity(this.manager.entityFtpLogins, this.treeFtpLogins.sourceList);
		this.manager.writeFtpLogins();

		this._updateEntity(this.manager.entityTags, this.treeTags.sourceList);
		this.manager.writeTags();

		var prefs = this.utils._getPrefService('extensions.exportwebdata.');

		// First update the preferences to store the path of exe file
		prefs.setCharPref('mailsendexe', document.getElementById('swc-mailclient-txtpath').value);

		prefs.setCharPref('smtpserver', document.getElementById('swc-mailclient-txthost').value);

		prefs.setCharPref('smtpuser', document.getElementById('swc-mailclient-txtuser').value);

		prefs.setCharPref('smtpname', document.getElementById('swc-mailclient-txtname').value);

		var password = document.getElementById('swc-mailclient-txtpass').value;
		this._saveSmtpPassword(password);

		prefs.setCharPref('smtpsecurity', document.getElementById('swc-mailclient-rgsecurity').selectedItem.value);

		prefs.setCharPref('smtpport', document.getElementById('swc-mailclient-txtport').value);


		prefs.setCharPref('ftpexe', document.getElementById('swc-ftpclient-txtpath').value);

	},

	_isEditInProgress: function() {
		var buttonIds = ['email-recipients-update', 'ftp-recipients-update', 'content-setup-update'];
		var tabIndicies = [1,2,3];
		var terms = ['email recipient', 'ftp recipient', 'content'];

		var visible = false; // Assume no update button is visible

		for(var i=0 ; i<buttonIds.length; i++) {
			var b = document.getElementById(buttonIds[i]);

			if (!b.getAttribute('hidden')) {
				document.getElementById('swc-options-tab').selectedIndex = tabIndicies[i];
				window.alert('You need to update/cancel ' + terms[i] + '.');
				visible = true;
			}
		}

		return visible;
	},

	_validateForm: function() {

		var txtMailExePath = document.getElementById('swc-mailclient-txtpath');
		var txtSmtpHost = document.getElementById('swc-mailclient-txthost');
		var txtSmtpUser = document.getElementById('swc-mailclient-txtuser');
		var txtSmtpPass = document.getElementById('swc-mailclient-txtpass');
		var txtSmtpPort = document.getElementById('swc-mailclient-txtport');

		var result = this.utils.UI.validateControls([txtMailExePath, txtSmtpHost, txtSmtpUser, txtSmtpPass, txtSmtpPort]);

		if (result.msg) {
			this._showError(result.ctrl, result.msg);
			return false;
		}

		return true;
	},


	_saveSmtpPassword: function(password) {
		var loginMgr = Components.classes["@mozilla.org/login-manager;1"].  	
                                getService(Components.interfaces.nsILoginManager); 

		var existing = this.manager.getExistingLogin(loginMgr);

		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo, "init");
        
		var loginInfo = new nsLoginInfo(this.manager.DUMMY_URL, this.manager.DUMMY_URL, null, 'exportwebdata', password, '', ''); 

		if (existing) {
			if (password) {
				if (password != existing.password) {
					loginMgr.modifyLogin(existing, loginInfo);
				}
			}
			else {
				loginMgr.removeLogin(existing);
			}
		}
		else {
			if (password) loginMgr.addLogin(loginInfo);
		}


	},

	_updateEntity: function(entity, lstSource){
		var lstTarget = entity.listData;

		// Empty old list
		lstTarget.splice(0, lstTarget.length);

		// populate new items
		for each(var item in lstSource) {
			lstTarget.push(item);
		}

	}

};
window.addEventListener('load', exportWebDataOptions.handleLoad, false);
