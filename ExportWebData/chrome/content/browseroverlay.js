'use strict';

/* ***** BEGIN LICENSE BLOCK *****
 * ***** END LICENSE BLOCK ***** */
var exportWebData = {
	manager: null,
	log: null,
	_g: null,

	handleLoad: function(evt) {
		window.removeEventListener('load', exportWebData.handleLoad, false); 

		var manager = Application.storage.get('exportwebdata-manager', null);
		if (manager == null) { 
			Application.storage.set('exportwebdata-manager', { isIniting:true });
			window.setTimeout(function() { exportWebData.init(); }, 30 );
		}
		else {
			exportWebData.manager = manager;
			window.setTimeout(function() { exportWebData.populateNewWindow(); }, 30 );
		}
	},

	populateNewWindow: function() {

		if (typeof(gBrowser) == undefined) {
			// gBrowser is not available in Seamonkey
			this._g = document.getElementById('content');			
		} else {
			this._g = gBrowser;
		}

		this.log = this.manager.log;

		AddonManager.getAddonByID('supt58@rediffmail.com', function(addon) {
		  var file = addon.getResourceURI('').QueryInterface(Components.interfaces.nsIFileURL).file
		  file.append('resources');
		  file.append('bin');
		  file.append('silentstart.exe');
		  exportWebData.log('ExportWebData: file.path = ' + file.path);
		  exportWebData.manager.silentstartpath = file.path;
		});

        var prefs = this.ExportWebDataManager.utils._getPrefService('extensions.exportwebdata.');

	    if (!prefs.getBoolPref('firstrundone')) {  
	        this.installButton('nav-bar', 'exportwebdata-toolbarbutton-send');
	        // The "addon-bar" is available since Firefox 4  
	        // this.installButton("addon-bar", "my-extension-addon-bar-button");  
	        prefs.setBoolPref('firstrundone', true);
	    }  

		this._g.addEventListener('load', this.handleTabSelected, true);
		this._g.tabContainer.addEventListener('TabSelect', this.handleTabSelected, false);
		window.addEventListener('unload', this.handleUnload, false);

		this._updateButton();
	},

    /** 
     * Installs the toolbar button with the given ID into the given 
     * toolbar, if it is not already present in the document. 
     * 
     * @param {string} toolbarId The ID of the toolbar to install to. 
     * @param {string} id The ID of the button to install. 
     * @param {string} afterId The ID of the element to insert after. @optional 
     */  
    installButton: function(toolbarId, id, afterId) {  
        if (!document.getElementById(id)) {  
            var toolbar = document.getElementById(toolbarId);  
      
            // If no afterId is given, then append the item to the toolbar  
            var before = null;  
            if (afterId) {  
                let elem = document.getElementById(afterId);  
                if (elem && elem.parentNode == toolbar)  
                    before = elem.nextElementSibling;  
            }  
      
            toolbar.insertItem(id, before);  
            toolbar.setAttribute("currentset", toolbar.currentSet);  
            document.persist(toolbar.id, "currentset");  
      
            if (toolbarId == "addon-bar")  
                toolbar.collapsed = false;  
        }  
    },  
      

	init: function() {
		Components.utils.import('resource://exportwebdata/lib/exportwebdatamanager.jsm', this);
		var manager = new exportWebData.ExportWebDataManager();

		//reset temp object
		Application.storage.set('exportwebdata-manager', manager);
		this.manager = manager;

		this.populateNewWindow();
	},

	handleUnload: function(evt) {
		var self = exportWebData;
		self._g.tabContainer.removeEventListener('TabSelect', self.handleTabSelected);
		window.removeEventListener('unload', self.handleUnload);
		self._g.removeEventListener('load', self.handleTabSelected);
	},

	handleTabSelected: function(evt) {
		exportWebData._updateButton();
	},

	_updateButton: function() {

		var brdcaster = document.getElementById('exportwebdata-sendcommandbroadcaster');

		var filter = 'url(chrome://exportwebdata/skin/filter.svg#grayscale)';

  		//contentWin is the XUL element of the browser that's just been selected
		var contentWin = exportWebData._g.selectedBrowser;
		
		if (['http', 'https'].indexOf(exportWebData._g.currentURI.scheme ) < 0) {
			brdcaster.setAttribute('disabled', true);
			brdcaster.setAttribute('tooltiptext', 'Not available on these pages.');
			// Seamonkey greys out toolbar button by putting images dynamically, so grayscale the button
			brdcaster.style.filter = filter;
			return;
		}


		brdcaster.setAttribute('disabled', false);

		var keyTooltip = 'No content selected for this page.';

		var tags = this.manager.findTags(this._g.selectedBrowser.currentURI.spec);

		if(tags.length > 0) {
			filter= 'none';
			keyTooltip = tags.length + ' tag(s) found.';
		}

		brdcaster.style.filter = filter;
		brdcaster.setAttribute('tooltiptext', keyTooltip);
	},


	_makeTwoDigit: function(str) {
		return (str.length >1? str: '0' + str);
	},

	sendContent: function() {
        var tags = exportWebData.manager.findTags(exportWebData._g.selectedBrowser.currentURI.spec);

        if (tags.length == 0) {
            alert('No content selected for this page.');
            this.close();
        }

	    window.openDialog('chrome://exportwebData/content/progressbar.xul',
	    				   'exportwebdata-progressbar',
	    				   'centerscreen, chrome, modal', tags);

	},


	selector : {

		startSelection: function() {
			var w = exportWebData._g.selectedBrowser;
			var d = w.contentDocument;

			var selObj = d.defaultView.getSelection();  
		    var self = exportWebData.selector;

			if (selObj.rangeCount > 1) {
				alert('Multiple selection is not supported');
				return;
			}

			var xpath = '';

			if (selObj.rangeCount == 0) {
				xpath = '';
			}
			else {
				var range  = selObj.getRangeAt(0);
				var target = range.commonAncestorContainer;

				selObj.selectAllChildren(target);
			    xpath = self.getXPathForElement(target, d);
			}


		    window.setTimeout( function() {
			    window.openDialog('chrome://exportwebData/content/definetag.xul',
			    				   'exportWebData',
			    				   'centerscreen, chrome, resizable, modal', 
			    				   d.location.href, xpath);
/*removed debug code*/

				}, 50);
		},
 
		getXPathForElement: function (el, xml) {  
		    var xpath = '';  
		    var pos, tempitem2;  
		        
		    while(el !== xml.documentElement) {       
		        pos = 0;  
		        tempitem2 = el;  
		        while(tempitem2) {  
		            if (tempitem2.nodeType === 1 && tempitem2.nodeName === el.nodeName) { 
		                // If it is ELEMENT_NODE of the same name  
		                pos += 1;  
		            }  
		            tempitem2 = tempitem2.previousSibling;  
		        }  
		            
		        xpath = "*[name()='"+el.nodeName+"']["+pos+']'+'/'+xpath;  
		    
		        el = el.parentNode;  
		      }  
		      xpath = '/*'+"[name()='"+xml.documentElement.nodeName+"']"+'/'+xpath;  
		      xpath = xpath.replace(/\/$/, '');  
		      return xpath;  
		},

    },


}
window.addEventListener('load', exportWebData.handleLoad, false); 
