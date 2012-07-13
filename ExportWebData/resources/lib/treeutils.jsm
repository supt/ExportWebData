'use strict';
var EXPORTED_SYMBOLS = ['newTreeItem', 'updateRowCore', 'getTreeRowAtIndex',
						'getSelectedTreeRows', 'getSelectedIndices', 
						'delSelectedItems', 'selectAndMakeVisible'];

function newTreeItem() {
	var d = this.ownerDocument;
	var treeChildren = this.treeBoxObject.treeBody;
	var treeItem = d.createElement('treeitem');
	var treeRow = d.createElement('treerow');
	
	for (var i=0 ; i<this.columns.length; i++) {
		var treeCell = d.createElement('treecell');
		treeRow.appendChild(treeCell);
	}
	
	treeItem.appendChild(treeRow);
	treeChildren.appendChild(treeItem);

    return treeItem;
}

function updateRowCore(rowIndex, cols, vals) {
	var v = this.view;

	for(var i=0 ; i<cols.length ; i++) {
		v.setCellText(rowIndex, this.columns.getNamedColumn(cols[i]), vals[i]);
	}
}


function getTreeRowAtIndex(index) {
	/*
	* Returns a treerow object at the given index.
	* This function is to be used as instance method of tree object. e.g.:
	* tree.prototype.getTreeRowAtIndex = utils.getTreeRowAtIndex
	*/
	var treeItem = this.view.getItemAtIndex(index);
	
	return treeItem.getElementsByTagName('treerow')[0];
}

function getFromSelectedRows(picker) {
	/*
	* Returns an array of objects from the selected rows.
	* 
	* Parameters:
	* 
	* picker - a function that accepts index and return return some property 
	* 			from the row at that index. e.g. to get all selected rows,
	*			picker should be a function as follows:
	*			function(i) { return this.getTreeRowAtIndex(i); }
	* 
	* This function is to be used as instance method of tree object. e.g.:
	* tree.prototype.getFromSelectedRows = utils.getFromSelectedRows
	*/
	var start = new Object();
	var end = new Object();
	var numRanges = this.view.selection.getRangeCount();

	var arrValues = [];

	for (var t = 0; t < numRanges; t++){
	  this.view.selection.getRangeAt(t,start,end);
	  for (var v = start.value; v <= end.value; v++){
	    arrValues.push(picker(v));
	  }
	}

	return arrValues;
}

function getSelectedTreeRows() {
	var self = this;

	if (!this._getFromSelectedRows) {
		this._getFromSelectedRows = getFromSelectedRows.bind(self);
	}

	return this._getFromSelectedRows(function (i) {
		return self.getTreeRowAtIndex(i);
	} );
}

function getSelectedIndices() {
	if (!this._getFromSelectedRows) {
		this._getFromSelectedRows = getFromSelectedRows.bind(this);
	}

	return this._getFromSelectedRows(function (i) {
		return i;
	} );
}


function delSelectedItems(f) {
	// f is function that accepts treerow and return a string

	var itemsToDel = this.getSelectedTreeRows();
	var selCount = itemsToDel.length;

	var msg = 'Are you sure you want to delete ' + ( selCount>1? selCount + ' items?': '\'' + f(itemsToDel[0])+ '\' ?');

	var promptService = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
	var result = promptService.confirm(null, null, msg);
	
	if (!result) return [];

	var indices = this.getSelectedIndices();
	indices.sort();

	var removed = new Array(indices.length);
	// remove from end
	var treeBody = this.treeBoxObject.treeBody;
	for(var i=indices.length-1 ; i>=0; i--) {
		var c = indices[i];
		treeBody.removeChild(treeBody.children[c]);
		var r = this.sourceList.splice(c, 1)[0];
		removed.push(r);
	}

	return removed;
}


function selectAndMakeVisible(index) {
	this.view.selection.select(index);
	this.treeBoxObject.ensureRowIsVisible(index);
}
