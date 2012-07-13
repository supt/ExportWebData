'use strict';
var EXPORTED_SYMBOLS = ['DUMMY_URL', 'getExistingLogin', 'getSmtpPassword'];

var DUMMY_URL = 'chrome://exportwebdata/';

function getExistingLogin(loginManager) {
	// Get Login Manager   
	if (!loginManager) {
		loginManager = Components.classes["@mozilla.org/login-manager;1"].  
		      				getService(Components.interfaces.nsILoginManager);  
	}

	// Find users for the given parameters  
	var logins = loginManager.findLogins({}, DUMMY_URL, DUMMY_URL, null); 

	var l = null;
	// Find user from returned array of nsILoginInfo objects  
	for (var i = 0; i < logins.length; i++) {
		if (logins[i].username == 'exportwebdata') {  
			l = logins[i];  
			break;  
		}  
	}

	return l;
}

function getSmtpPassword() {
	var login = getExistingLogin();

	if (login) return login.password;

	return '';
}
