'use strict';
var swcProgressBar = {
    pm: null,
    pt: null,
    ftpSender: null,
    emailSender: null,
    log: null,
    exportWebData:null,
    prefs:null,
    timerClose:null,
    errorCount:0,

    observe: function(subject, topic, data) {    
        // Do your stuff here.  

        if (topic == 'exportwebdata-send') {
            var meter = this.pm;

            this.log('ExportWebData: exportwebdata-send notification received');
            var v = parseInt(meter.getAttribute('value')) + 1;
            meter.setAttribute('value', v);
            this.log('ExportWebData: Setting progressbar.value = ' + v);
            this.pt.processItem(JSON.parse(data));

            var max = meter.getAttribute('max');

            if (v == max) {
                this._setAttr('swc-progress-btnok', 'disabled', false);
                if (!this.errorCount) {
                    var duration = this.prefs.getIntPref('progressbarduration');
                    if (duration < 0) duration = 5000;

                    this._setAttr('swc-progress-lblautocloseinfo1', 'hidden', false);
                    this._setAttr('swc-progress-lblautocloseinfo2', 'value', (duration/1000) + ' seconds.');

                    this.timerClose = window.setTimeout(function() { swcProgressBar.timerClose=null; window.close();}, duration );
                }
            }
        }
        
    },

    _setAttr: function(id, attr, v) {
        document.getElementById(id).setAttribute(attr,v);
    },

    tagSender: function(tags, tagsToFilter) {
        swcProgressBar.log('ExportWebData: Processing tags to send...');
        this.tags = tags;
        this.tagsToFilter = tagsToFilter;

        this.files = [null for each(tag in tags)];

        this.generateFiles();
        return this;
    },

    handleLoad: function(evt) {
        window.removeEventListener('load', swcProgressBar.init);
        window.addEventListener('unload', swcProgressBar.unload, false);

        try {
            swcProgressBar.init();
        }
        catch(ex) {
            Components.utils.reportError(ex);
        }

    },

    init: function() {
        var observerService = Components.classes['@mozilla.org/observer-service;1']  
                              .getService(Components.interfaces.nsIObserverService);  
        observerService.addObserver(swcProgressBar, 'exportwebdata-send', false);

        this.pm = document.getElementById('swc-progressmeter');

        var tree = document.getElementById('swc-progressbar-tree');
        Components.utils.import('resource://exportwebdata/lib/treeutils.jsm', tree);

        tree.processItem = function(data) {
                if (data.status == 'starting') return;

                if (['failed', 'start-failed'].indexOf(data.status) != -1) swcProgressBar.errorCount++;

                this.treeBoxObject.beginUpdateBatch();
                var item = this.newTreeItem();

                var index = this.view.rowCount-1;
                
                var itemName = data.itemName;
                var t = '';
                var hasLog = false;

                if (itemName == swcProgressBar.ftpSender.itemName) {
                    t = data.item.url;
                    hasLog = true;
                }
                else if (itemName == swcProgressBar.emailSender.itemName)
                    t = data.item.to;

                var p = 'swc-progressbar-col';
                var cols = [ p+'type', p+'data', p+'status', p+'message'];
                var vals = [itemName, t, data.status, data.msg];

                this.updateRowCore(index, cols, vals);

                var r = this.getTreeRowAtIndex(index);

                this.treeBoxObject.endUpdateBatch();

            };

        this.pt = tree;

        // set to window
        var exportWebData = window.opener.exportWebData;
        this.log = exportWebData.log;
        this.prefs = exportWebData.ExportWebDataManager.utils._getPrefService('extensions.exportwebdata.');

        this._extendTagSender(exportWebData);

        this._importLibs(exportWebData);

        var tags = (window.arguments? window.arguments[0]: []);

        var tagsToFilter = this.prefs.getCharPref('filtertags');

        new this.tagSender(tags, tagsToFilter.split(','));
    },

    _importLibs: function(swc) {
        Components.utils.import('resource://exportwebdata/lib/sender.jsm', this);
        Components.utils.import('resource://exportwebdata/lib/exewrapper.jsm', this);
        this._initEmailSender(swc);
        this._initFtpSender(swc);
    },

    _initFtpSender: function(swc) {
        this.ftpSender = new this.swcSender(this.log);
        this.ftpSender.itemName = 'FTP upload';

        var self = this;
        
        this.ftpSender.senderFunction = function(original_args, observer) {
            swc.log('ExportWebData: sendFtp begin for ' + original_args.url);
            var msg = self.ftpExe.init(swc.manager.silentstartpath);

            if (msg) {
                self.log('ExportWebData: sendFtp exiting - exportWebData.ftpExe.init failed\n' + msg);
                return msg;
            }

            var prefs = self.prefs;
            var args = {
                url:    original_args.url,
                path:   original_args.path,
                port:       original_args.port,
                contentpath: original_args.contentPath,
                isAnon: original_args.isAnon,
                username:   original_args.username,
                pass:       original_args.pass,
                observer:   observer,
                remoteFileName: original_args.remoteFileName,
                forceTls: original_args.forceTls,
            };

            var msg = self.ftpExe.invoke(args);
            if (msg) {
                return msg;
            }
            self.log('ExportWebData: sendFtp exiting normally');
            return ''; 
        };
        
        this.ftpExe = new this.swcExeWrapper();
        this.ftpExe.execFunction = function(exeProcess, args) {
            //wput <local_file_path> ftp://<user>:<password>@<server/<path_to_file>/<filename>

            var prefs = self.prefs;

            var wputPath =  prefs.getCharPref('ftpexe');
            if (!wputPath) return 'Path for wput exe has not been set in options.';

            var theExeFile = Components.classes['@mozilla.org/file/local;1'].getService(Components.interfaces.nsILocalFile);
            theExeFile.initWithPath(wputPath);
            if (!theExeFile.exists()) return 'File does not exist:\n' +  wputPath;

            self.log('ExportWebData: execFtpSend begin');
            var url = args.url;
            var path = args.path;
            var localFile = args.contentpath; 

            var logFile =localFile + '.log';

            // drop ftp://
            var pos = url.indexOf('://');
            var scheme = 'ftp://';
            if (pos > 0) {
                scheme = url.substr(0, pos+3);
                url = url.substr(pos+3);
            }

            // make full path
            url = (path && url[url.length-1] == '/'? url.substr(0, url.length-1):url) + path;

            // append remote filename
            url = url + (url[url.length-1] == '/'? '':'/') + args.remoteFileName;

            self.log('ExportWebData: execFtpSend invoking wput');
            if (args.isAnon) {
            }
            else {
                // make url in format username:password@url/path/to/filename
                url = args.username + ':' + args.pass + '@' + url;
            }

            url = scheme + url;

            var ftpArgs = [
                wputPath,
                '-t', prefs.getIntPref('ftpmaxretries'),
                '-T', prefs.getIntPref('ftptimeout'),
            ];

            if (args.forceTls) {
                ftpArgs.push('--force-tls');
            }

            ftpArgs = ftpArgs.concat([
                '-o', logFile,
                localFile,
                url,
            ]);

/*removed debug code*/

            try {
                //invoke wput 
                exeProcess.runAsync(ftpArgs, ftpArgs.length, args.observer);
                //args.observer.observe({}, 'process-finished', {});
            }
            catch(e){
                Components.utils.reportError(e);
                return e.message;
            }

            self.log('ExportWebData: execFtpSend exiting normally');
            return '';

        };
    },

    _initEmailSender: function(swc) {
        this.emailSender = new this.swcSender(this.log);
        this.emailSender.itemName = 'Email';
        var self = this;
        this.emailSender.senderFunction = function(original_args, observer) {
            var msg = self.emailExe.init(swc.manager.silentstartpath);
            if (msg) {
                self.log('ExportWebData: sendEmail exiting - exportWebData.emailExe.init failed\n' + msg);
                return msg;
            }

            var prefs = self.prefs;

            var subject = prefs.getCharPref('emailsubject')
                            .replace(/\%url\%/gi, swc._g.selectedBrowser.currentURI.spec)
                            .replace(/\%title\%/gi, swc._g.selectedBrowser.contentTitle);

            var args = {
                to:         original_args.to, 
                server:     prefs.getCharPref('smtpserver'),
                port:       prefs.getCharPref('smtpport'),
                subject:    subject,
                contentpath: original_args.contentPath,
                security:   prefs.getCharPref('smtpsecurity'),
                username:   prefs.getCharPref('smtpuser'),
                fullname:   prefs.getCharPref('smtpname'),
                pass:       swc.manager.getSmtpPassword(),
                observer:   observer,
            }

            args.from = args.username;

            if (args.port && args.port.length > 0) {
                if (isNaN(args.port)) {
                    return 'Invalid port configured in options: ' + args.port;
                }
            }
            else {
                args.port = 25;
            }

            msg = self.emailExe.invoke(args);
            if (msg) {
                return msg;
            }
            return '';
        };

        this.emailExe = new this.swcExeWrapper();
        this.emailExe.execFunction = function(exeProcess, args) {
            var prefs = self.prefs;
            var path = prefs.getCharPref('mailsendexe');
            if (!path) return 'Path for mailsend exe has not been set in options.';
            var theExeFile = Components.classes['@mozilla.org/file/local;1'].getService(Components.interfaces.nsILocalFile);
            theExeFile.initWithPath(path);
            if (!theExeFile.exists()) return 'File does not exist:\n' +  path;

            var emailArgs = [
                path,
                '-f', args.from,
                '-t', args.to, 
                '-smtp', args.server,
                '-port', args.port,
                '-' + args.security,  // starttls/ssl 
                '-sub', (args.subject.trim().indexOf(' -') >= 0? '"' + args.subject + '"': args.subject),
                '-attach', args.contentpath+',text/html,i',
                '-q'
            ];
        
            if (args.fullname) {
                emailArgs.push('-name', args.fullname);
            }

            if (args.username) {
                emailArgs.push('-auth','-user', args.username);
                emailArgs.push('-pass', args.pass);
            }

/*removed debug code*/


            try {
                //send email 
                exeProcess.runAsync(emailArgs, emailArgs.length, args.observer);
            }
            catch(e){
                Components.utils.reportError(e);
                return e.message;
            }

            return '';
        } ;
    },

    _extendTagSender: function(swc) {

        var self = this;
        this.tagSender.prototype.generateFiles = function() {
            self.log('ExportWebData: Starting file generatino for ' + this.tags.length + ' tags.');
            for each (var tag in this.tags) {
                this._generateFileAsyc(tag);
            }
        };
    
        this.tagSender.prototype.handleFileGenerated = function(inputStream, status, tag, webpageFile) {
            self.log('ExportWebData: handleFileGenerated: ' + webpageFile.path);

            var pos = -1;
            for(var i=0 ; i<this.tags.length; i++) {
                if (this.tags[i].id == tag.id) {
                    pos = i;
                    break;
                }
            }

            if (!Components.isSuccessCode(status)) {  
                // Handle error!
                self.log('ExportWebData: Failed to create file - ' + status);
                window.alert('Export Web Data: Failed to create file: ' + status);
                this.files[pos] = '';

                return;
            }


            this.files[pos] = webpageFile.path;

            var waiting = this.files.some( function(obj) { return obj == null; } );
            var tSender = this;

            if (!waiting) {

                var observerService = Components.classes['@mozilla.org/observer-service;1']
                              .getService(Components.interfaces.nsIObserverService);

                var emailBatches = 0;
                var ftpBatches = 0;


                //window.setTimeout(function() {
                    emailBatches = tSender.startEmailing();
                //}, 10);
                //window.setTimeout(function() {
                    ftpBatches = tSender.startUploading();
                    //}, 20);

               var maxVal = (emailBatches + ftpBatches) * 2;
               self.log('Setting progressbar.max = ' + maxVal);
               self.pm.setAttribute('max', maxVal);
            }

        };

        this.tagSender.prototype.startEmailing = function() {
            self.log('ExportWebData: startEmailing');

            var batch = [];

            var itemCount = 0;

            for(var i=0 ; i<this.tags.length; i++) {
                var file = this.files[i];
                if (file) {
                    var tag = this.tags[i];

                    if (tag.emails.length == 0) continue; 
                    var emailEntites = swc.manager.findEmails(tag.emails);

                    if (emailEntites.length == 0) continue;

                    self.log('ExportWebData: Queuing emails for: ' + tag.url);

                    for each( var itm in emailEntites) {
                        batch.push({ tag:tag, contentPath: file, to:itm.e});
                        itemCount++;
                    }
                }
            }

            if (batch.length > 0) {
                self.emailSender.queue(batch);
            }

            return itemCount;

        };

        this.tagSender.prototype._twoDigits = function(n) {
            return swc._makeTwoDigit(n.toString());
        };

        this.tagSender.prototype.startUploading = function() {
            self.log('ExportWebData: startUploading');

            var batch = [];
            var batchCount = 0;

            var now = new Date();

            var pattern = self.prefs.getCharPref('ftpfilenamepattern');
            var remoteFilename = pattern.replace('%YYYY%', now.getFullYear())
                                        .replace('%MM%', this._twoDigits(now.getMonth()+1))
                                        .replace('%DD%', this._twoDigits(now.getDate()))
                                        .replace('%hh%', this._twoDigits(now.getHours()%12))
                                        .replace('%HH%', this._twoDigits(now.getHours()))
                                        .replace('%mm%', this._twoDigits(now.getMinutes()))
                                        .replace('%ss%', this._twoDigits(now.getSeconds()))
                                        .replace('%ms%', now.getMilliseconds());

            var ioService = Components.classes['@mozilla.org/network/io-service;1']  
                              .getService(Components.interfaces.nsIIOService);  
            for(var i=0 ; i<this.tags.length; i++) {
                var file = this.files[i];
                if (file) {
                    var tag = this.tags[i];

                    var ftpEntites = swc.manager.findFtpLogins(tag.ftps);
                    swc.log('ExportWebData: Found ' + ftpEntites.length + ' FTP entries');
                    for each(var itm in ftpEntites) {
                        var url = itm.url;
                        if (url[url.length-1] != '/') url += '/' ;
                        
                        var path = itm.path;

                        if (path) {
                            if (path[0] != '/') path = '/' + path;
                            if (path[path.length-1] != '/') path += '/' ;
                        }

                        swc.log('ExportWebData: Queueing FTP upload for ' + url);

                        var urlObject = ioService.newURI(tag.url, null, null);  
                        var hostPortions = urlObject.host.replace('www.', '').split('.');

                        var domainMain = '';
                        if (hostPortions.length==2) domainMain = hostPortions[0];
                        else  {
                            for (var x=hostPortions.length-1 ; x>2 ; x--) {
                                if (hostPortions[x].length >2) {
                                    domainMain = hostPortions[x]; //abc.co.uk?
                                    break;
                                }
                            }
                        }

                        batch.push({
                            url:url,
                            path:path,
                            username:itm.username,
                            pass:itm.pass,
                            isAnon:itm.isAnon,
                            tag: tag,
                            contentPath: file,
                            remoteFileName: remoteFilename.replace('%DOMAIN_MAIN%', domainMain),
                            forceTls: itm.forceTls,
                        });
                        batchCount++;
                    }
                }
            }

            if (batch.length > 0) {
                self.ftpSender.queue(batch);
            }

            return batchCount;
        };

        this.tagSender.prototype._generateFileAsyc = function(tag) {

            var webpageFile = Components.classes['@mozilla.org/file/directory_service;1']
                .getService(Components.interfaces.nsIProperties)
                .get('TmpD', Components.interfaces.nsIFile);
            
            /*write the webcontent to the temporary file*/
            var now = new Date();

            var month = swc._makeTwoDigit((now.getMonth()+1) .toString());
            var day   = swc._makeTwoDigit(now.getDate().toString());

            webpageFile.append('ExportWebData_' +  now.getFullYear() + '-' + month + '-' + day);
            webpageFile.append('swc.html');

            //https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIFile
            webpageFile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt('0666', 8));
                
            self.log('ExportWebData: Created temp file: ' + webpageFile.path);

            var textToBeSent = self.extractContent(swc._g.selectedBrowser.contentDocument, tag.tag, self.prefs.getCharPref('filtertags').toLowerCase().split(','));

            self.log('ExportWebData: Extracted content for temp file successfully');
            var tSender = this;

            swc.ExportWebDataManager.utils.writeDataToFile(textToBeSent, webpageFile, 
                    function(inputStream, status) {
                            tSender.handleFileGenerated(inputStream, status, tag, webpageFile);
                        });
        };

    },


    extractContent: function(doc, xpath, tagsToFilter) {
        var found = xpath? this.evaluateXPath(doc, xpath): [doc.body];

        var ret = null;

        if (found.length > 0) {
            var dup = found[0].cloneNode(true);
            this.clean(dup, tagsToFilter, doc.baseURIObject);

            ret = '<html>\n\t<head>\n'
                + '\t<meta http-equiv="Content-type" content="text/html; charset=utf-8">\n'
                + '\t</head>\n'
                + (xpath?'\t<body>\n':'')
                + dup.innerHTML + '<!--KASHIF-->'
                + (xpath?'\n\t</body>':'')
                + '\n</html>' ;
        }

        return ret;
    },


    clean: function(node, tagsToFilter, baseUri) {
        while(node.hasAttributes()) node.removeAttribute(node.attributes.item(0).nodeName);

        /*
        if (node.tagName) {
            var pos = exportWebData._relativeTags.indexOf(node.tagName.toLowerCase());
            if (pos >=0) {
                // needs to convert relative links
                var attrName = exportWebData._relativeAttrs[pos];
                var current = '';
                if (node.hasAttribute(attrName))
                    current = node.getAttribute(attrName);

                if (current) {
                    var newurl = baseUri.resolve(current);
                    node.setAttribute(attrName, newurl);
                }

            }
        }
        */

        for(var i=0 ; i<node.childNodes.length ; i++) {
            var child = node.childNodes.item(i); 
            if (child.tagName && tagsToFilter.indexOf(child.tagName.toLowerCase()) >= 0) {
                node.removeChild(child);
                i--;    
            }
            else {

                this.clean(child, tagsToFilter, baseUri);
            }
        }
    },

    evaluateXPath: function (aNode, aExpr) {  
      var xpe = new XPathEvaluator();  
      var nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ?  
        aNode.documentElement : aNode.ownerDocument.documentElement);  
      var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);  
      var found = [];  
      var res;  
      while (res = result.iterateNext())  
        found.push(res); 
      return found;  
    },


    execFtpSend_curl: function(exeProcess, args) {
        //-T <local_file_path> ftp://myftpsite.com/mp3/ --user username:password

        exportWebData.log('ExportWebData: execFtpSend begin');
        var url = args.url;
        var ftpArgs = [
            '-T', args.contentpath,
            'ftp://' + (args.path && url[url.length-1] == '/'? url.substr(0, url.length-1):url) + args.path,
        ];
    
        exportWebData.log('ExportWebData: execFtpSend invoking curl with parameters\n' + ftpArgs.join(' '));
        if (!args.isAnon) {
            ftpArgs.push('--user', args.username + ':' + args.pass);
        }

/*removed debug code*/

        try {
            //send email 
            exeProcess.runwAsync(ftpArgs, ftpArgs.length, args.observer);
        }
        catch(e){
            Components.utils.reportError(e);
            return e.message;
        }

        exportWebData.log('ExportWebData: execFtpSend exiting normally');
        return '';

    },

    unload: function() {
        if (swcProgressBar.timerClose) { window.clearTimeout(swcProgressBar.timerClose); swcProgressBar.timerClose=null; }
        var observerService = Components.classes['@mozilla.org/observer-service;1']  
                            .getService(Components.interfaces.nsIObserverService);  
        observerService.removeObserver(swcProgressBar, 'exportwebdata-send');
        window.removeEventListener('unload', swcProgressBar.unload);
        swcProgressBar.pm = null;
        swcProgressBar.exportWebData = null;
    }

}

window.addEventListener('load', swcProgressBar.handleLoad, false);
