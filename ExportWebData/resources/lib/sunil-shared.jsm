'use strict';
var EXPORTED_SYMBOLS = ['utils'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var utils = {
	_handleStartup: function (url) {
		/*
		var oldVersion = '__version__';
		var currVersion = '__version__';
		
		try {
			oldVersion = this._prefService.getCharPref('version');
		}
		catch(e) {}
		
		if (oldVersion != currVersion) {
			this._prefService.setCharPref('version', currVersion);
			try {
				setTimeout(function() { 
					try {
						openUILinkIn( url, 'tab');
					} 
					catch(e) {}
				;},100);
			}
			catch(e) {}
		}
		*/
	},

	_getPrefService: function(key) {
		var prefService = null;
		try 
		{
			prefService = gPrefService;
		}
		catch(err)
		{
			// gPrefService not available in SeaMonkey
			prefService = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService);
		}
		
		prefService = prefService.getBranch(key);
		return prefService;
	},

	writeDataToFile: function(content, file, fptr) {
		/*******************************************************************************
		Writes data to file asynchronously.
		Parameters:
		  content - string to be written to file
		  file - nsIFile instance to which string would be written
		  fptr - function that would be invoked after write operation
		*******************************************************************************/
		
		Components.utils.import('resource://gre/modules/NetUtil.jsm'); 	
		Components.utils.import('resource://gre/modules/FileUtils.jsm'); 

		// You can also optionally pass a flags parameter here. It defaults to  
		// FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE;  
		var ostream = FileUtils.openSafeFileOutputStream(file)  
		  
		var converter = Components.classes['@mozilla.org/intl/scriptableunicodeconverter']
							.createInstance(Components.interfaces.nsIScriptableUnicodeConverter); 
		converter.charset = 'UTF-8';  
		var istream = converter.convertToInputStream(content);  
		
		// The last argument (the callback) is optional.  
		NetUtil.asyncCopy(istream, ostream, fptr);  
	},

	readStream: function(inputStream) {
		// The file data is contained within inputStream.
		// You can read it into a string with
		var data = '';
		
		var converterStream = null;
		const BUFFER_SIZE = 1024;
		converterStream = Cc['@mozilla.org/intl/converter-input-stream;1']  
						   .createInstance(Ci.nsIConverterInputStream);  
		converterStream.init(inputStream, 'UTF-8', BUFFER_SIZE, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

		var input = {};
		var numChars = 0;
		// read all "bytes" (not characters) into the input
		try {
			do {
				numChars = converterStream.readString(BUFFER_SIZE, input);  
				data += input.value;
			} while(numChars == BUFFER_SIZE);
		}
		finally {
			if (converterStream) {
				try { converterStream.close(); }
				catch(ex) {}
			}
		}
		return data;
	},

	_consoleService: null,

	initializeLog: function() {
		utils._consoleService = Cc['@mozilla.org/consoleservice;1'].
		     getService(Ci.nsIConsoleService);
	},

	log: function(msg) {
		if (utils._consoleService) {
			utils._consoleService.logStringMessage(msg);
		}
	},

	getProfileDir: function() {
		// get profile directory  
		var dirService = Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties);
		var file = dirService.get('ProfD', Ci.nsIFile);
		
		return file;
	},

	getWindow: function() {
		return Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator).getMostRecentWindow('navigator:browser');
	},

	getStylesheet: function(doc, href) {
		var styleSheet = null;
		for(var i=0 ; i<doc.styleSheets.length; i++) {
			var s1 = doc.styleSheets[i];
			if (s1.href == href) {
				styleSheet = s1;
				break;
			}
		}
		return styleSheet;
	},

	injectStyleSheet: function(doc, href) {
		if (utils.getStylesheet(doc, href) == null) {		
		    var nodeToInsert = doc.createElement('link');
		    nodeToInsert.setAttribute('rel', 'stylesheet');
		    nodeToInsert.setAttribute('type', 'text/css');
		    nodeToInsert.setAttribute('href', href);
		    doc.head.appendChild(nodeToInsert);
		    return true;
		}
		return false;
	},

	getPropsAsString: function(objects, propName) {
		var ids = [o[propName] for each(o in objects)];
		return ids.join(',');
	},

    getItemsFromPropsString: function(propValues, objects, pkPropName, returnPropName) {
        /*
        * Returns an array of propValues/Objects where the value object.pkPropname is found in propValues
        *
        * propValues - array of property values
        * objects - array of objects
        * pkPropName - the property name which will be looked-up in propValues
        * returnPropName - the property name that would be returned on every object
        */

        var items = [];

        var f = null;

        if (returnPropName) f = function(o) { return o[returnPropName]; };
        else f = function(o) { return o; }; 


        for (var i=0 ; i<objects.length; i++) {
            var o = objects[i];

            var index = propValues.indexOf(o[pkPropName]);
            if (index != -1) {
                    items.push(f(o));
            }
        }
        return items;
    },

    UI : {
		validateControls: function(controls) {
			var o = {ctrl: null, msg: '' };

			for each(var ctrl in controls) {
				var result = this.validateControl(ctrl);

				if (result) {
					o.ctrl = ctrl;
					o.msg = result;
					break;
				}
			}

			return o;
		},

		validateControl: function(ctrl) {
			if (ctrl.hasAttribute('data-required') && ctrl.getAttribute('data-required') == 'true') {
				if (ctrl.value.trim().length == 0) {
					return 'Empty value is not allowed.';
				}
			}

			if (ctrl.hasAttribute('data-validation-regex')) {
				var re = new RegExp(ctrl.getAttribute('data-validation-regex'));

				var value = ctrl.value.trim();

				if (!re.test(value)) {
					return '\'' + value + '\' is invalid.';
				}
			}

			return '';

		},

    },


}
