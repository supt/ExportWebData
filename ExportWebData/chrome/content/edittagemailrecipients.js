'use strict';
var swcEditTagEmailRecipients = {

	handleLoad: function(evt) {
		window.removeEventListener('load', swcEditTagEmailRecipients.handleLoad);

		Components.utils.import('resource://exportwebdata/lib/swcutils.jsm', this);

		var args = window.arguments[0];

		var lsbEmails = document.getElementById('swc-email-recipients-list');
		lsbEmails.sourceList = args.master;

		this.emailListboxAdapter(lsbEmails, true);

		lsbEmails.loadModel();
		
		setTimeout(function() { 
				lsbEmails.setCheckedObjects(args.checked); 
			}, 90 );
	},

	handleAccept: function() {
		var lsbEmails = document.getElementById('swc-email-recipients-list');
		var emails = lsbEmails.getCheckedObjects();

		var args = window.arguments[0];
		args.returnValue = emails;
		return true;
	},


};

window.addEventListener('load', swcEditTagEmailRecipients.handleLoad, false);
