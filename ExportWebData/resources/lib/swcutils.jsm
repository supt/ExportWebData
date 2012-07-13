'use strict';
var EXPORTED_SYMBOLS = ['utils', 'emailListboxAdapter', 'ftpTreeAdapter', 'tagTreeAdapter', 'tagValidatorAdapter'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var treeUtils = {}
Cu.import('resource://exportwebdata/lib/treeutils.jsm', treeUtils);

Cu.import('resource://exportwebdata/lib/sunil-shared.jsm', this);

function tagValidatorAdapter(theControl) {
    theControl.validateItemToAdd = function(objToValidate) {

    		var ctrls = [ objToValidate.url.ctrl, objToValidate.tag.ctrl];

			var result = utils.UI.validateControls(ctrls);
			if (result.msg) return result;

			var url = objToValidate.url.value;
			var tag = objToValidate.tag.value;
			var id = objToValidate.id;

			var found = this.sourceList.some(function(o) {
						return o.url == url && o.tag == tag && id != o.id;
					});

			if(found) {
				return { 
					msg: 'This tag for \'' + url + '\' alreay exists.',
					ctrl: objToValidate.url.ctrl
				};
			}

			if (objToValidate.emails.value.length== 0 && objToValidate.ftps.value.length== 0) {
				return { 
					msg: 'Select atleast one recipient.',
					ctrl: objToValidate.emails.ctrl
				};
			}

			return null;
		};
}


function emailListboxAdapter(listbox, checkbox) {

    listbox.loadModel = function() {
    		var emails = this.sourceList;
    		for (var i=0 ; i<emails.length; i++) {
    			var data = emails[i];
    			this.addEmailToListBox(data);
    		}
    	};

   	listbox.addEmailToListBox = function(data) {
			var item = this.appendItem(data.e);
			if (checkbox) {
				item.setAttribute('type', 'checkbox');
			}
			item.swcEmail = data; // custom property, cannot use value
			return item;
    	};

    listbox.validateItemToAdd = function(objToValidate) {
			var msg = utils.UI.validateControl(objToValidate.e.ctrl);
			if (msg) return msg;

			var newEmail = objToValidate.e.value;
			var id = objToValidate.id;

			var found = this.sourceList.some(
					function(objEmail) {
						return objEmail.e == newEmail && id != objEmail.id;
					}
				);

			if(found) return '\'' + newEmail + '\' alreay exists.';

			return null;
		};

    if (!checkbox) return;

    listbox.getCheckedObjects = function() {
    		var checked = [];

    		for (var i=0 ; i<this.itemCount; i++) {
    			var item = this.getItemAtIndex(i);

    			if (item.checked) {
    				checked.push(item.swcEmail);
    			}
    		}
    		return checked;
    	};

    listbox.setCheckedObjects = function(checked) {
    		for (var i=0 ; i<this.itemCount; i++) {
    			var item = this.getItemAtIndex(i);

    			if(checked.indexOf(item.swcEmail.id) >= 0)
    				item.checked = true;
    		}
    	};


}

function commonTreeFunctions(tree, editable) {
	tree.updateRowCore = treeUtils.updateRowCore;
	tree.newTreeItem = treeUtils.newTreeItem;
	tree.getTreeRowAtIndex = treeUtils.getTreeRowAtIndex;
	tree.getSelectedTreeRows = treeUtils.getSelectedTreeRows;
	tree.getSelectedIndices = treeUtils.getSelectedIndices;
	tree.selectAndMakeVisible = treeUtils.selectAndMakeVisible;

	if (editable) {
		tree.delSelectedItems = treeUtils.delSelectedItems;
	}
}

function ftpTreeAdapter(tree, editable) {
	commonTreeFunctions(tree, editable);

	tree.loadModel =  function() {
	        var logins = this.sourceList;

            var colIndex = -1;

            for (var i=0; i<this.columns.length ;i++) {
                if (this.columns[i].id == 'swc-ftp-recipients-colheadersel') {
                    colIndex = i; 
                    break;
                }
            }

			this.treeBoxObject.beginUpdateBatch();
			for (var i=0 ; i<logins.length; i++) {
				var login = logins[i];
				var treeItem = this.newTreeItem();

				treeItem['swcFtp'] = login;

                if (colIndex >= 0) {
                    var cell = treeItem.firstChild.getElementsByTagName('treecell')[colIndex];
                    cell.setAttribute('properties', 'green-check-box');
                }

	            var index = this.view.rowCount-1;
	            this.updateRow(login, index);
			}

			this.treeBoxObject.endUpdateBatch();
		};


	tree.updateRow = function(login, index) {
			//	FtpEntity = { id: int, url:string, path:string, username:string, pass:string }
			var cols = ['swc-ftp-recipients-colheaderurl', 'swc-ftp-recipients-colheaderpath', 
						'swc-ftp-recipients-colheaderusername', 'swc-ftp-recipients-colheaderpassword'
/*removed debug code*/
						];
			var vals = [login.url, login.path, login.username, ['*' for each(c in login.pass)].join(''), login.id.toString()];
			this.updateRowCore(index, cols, vals);

			this.view.setCellValue(index, this.columns.getNamedColumn('swc-ftp-recipients-colheaderanonymous'), login.isAnon);
		};

    tree.validateItemToAdd = function(objToValidate) {
    		var ctrls = [ objToValidate.url.ctrl, objToValidate.path.ctrl];

    		if (!objToValidate.isAnon.ctrl.checked) {
    			ctrls.push(objToValidate.username.ctrl);
    			ctrls.push(objToValidate.pass.ctrl);
    		}

			var result = utils.UI.validateControls(ctrls);
			if (result.msg) return result;

			var url = objToValidate.url.value;
			var path = objToValidate.path.value;
			var id = objToValidate.id;

			var found = this.sourceList.some(
					function(o) {
						return o.url == url && o.path == path && id != o.id;
					}
				);

			if(found) {
				return { 
					msg: '\'' + url + '\' alreay exists.',
					ctrl: objToValidate.url.ctrl
				};
			}
			return null;
		};

	var checkboxCol = tree.columns.getNamedColumn('swc-ftp-recipients-colheadersel');
	if (checkboxCol == null) return;

    tree.setCheckedObjects = function(checked) {
			var col = checkboxCol;
			var v = this.view;

			var c = v.rowCount;
    		for (var i=0 ; i<c ; i++) {
    			var row = this.getTreeRowAtIndex(i);
    			var id = row.parentNode.swcFtp.id;
    			if (checked.indexOf(id) >= 0)
					v.setCellValue(i, col, true);
    		}
    	};

    tree.getCheckedObjects = function() {
			var col = checkboxCol;
			var v = this.view;

			var objs = [];
    		for (var i=0 ; i<v.rowCount ; i++) {
    			var val = v.getCellValue(i, col);

    			if (val == 'true') {
	    			var row = this.getTreeRowAtIndex(i);
	    			objs.push(row.parentNode.swcFtp);
	    		}
    		}

    		return objs;
    	};

}


function tagTreeAdapter(tree) {
	commonTreeFunctions(tree, true);

    tree.loadModel = function() {

            var tags = tree.sourceList;

			this.treeBoxObject.beginUpdateBatch();
			for (var i=0 ; i<tags.length; i++) {
				var data = tags[i];
				var treeItem = this.newTreeItem();
				treeItem.swcTag = data;
                var index = this.view.rowCount-1;
                this.updateRow(data, index);
			}
			this.treeBoxObject.endUpdateBatch();
    	},

    tree.refreshRowAt = function(index) {
    		var row = this.getTreeRowAtIndex(index);
    		this.updateRow(row.parentNode.swcTag, index);
    	}

    tree.updateRow = function(tag, index) {
			var emails = utils.getItemsFromPropsString(tag.emails, this.sourceEmails, 'id', 'e');
			var ftpLogins = utils.getItemsFromPropsString(tag.ftps, this.sourceFtpLogins, 'id', 'url');

			var cols = ['swc-content-setup-colheaderurl', 'swc-content-setup-colheadertag', 
						'swc-content-setup-colheaderemails', 'swc-content-setup-colheaderftpurls'
/*removed debug code*/
						];
			var vals = [tag.url, tag.tag, emails.join(','), ftpLogins.join(','), tag.id.toString()];
			this.updateRowCore(index, cols, vals);
    	},

    tagValidatorAdapter(tree);
}
