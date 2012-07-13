'use strict';
var swcEditTagFtpRecipients = {

	handleLoad: function(evt) {
		window.removeEventListener('load', swcEditTagFtpRecipients.handleLoad);
		var args = window.arguments[0];

		setTimeout(function() {
				swcEditTagFtpRecipients.populate(args.master, args.checked); 
			}, 50 );
	},

	populate: function(master, checked) {
		try {
			Components.utils.import('resource://exportwebdata/lib/swcutils.jsm', this);

			var treeFtp = document.getElementById('swc-ftp-recipients-tree');
			treeFtp.sourceList = master;

			this.ftpTreeAdapter(treeFtp, false);
		
			treeFtp.loadModel();

			treeFtp.setCheckedObjects(checked);
		}
		catch(ex) {
			Components.utils.reportError(ex);
		}

	},

	handleAccept: function() {

		var treeFtp = document.getElementById('swc-ftp-recipients-tree');

		var args = window.arguments[0];
		args.returnValue = treeFtp.getCheckedObjects();

		return true;
	},


};

window.addEventListener('load', swcEditTagFtpRecipients.handleLoad, false);
