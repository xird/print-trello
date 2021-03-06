// layout.js
//	functions to create the output for printing



function dpyTrello()
{
	SD = new Showdown.converter();

	var htm = [];

	var dt_gmt = DB.raw.dateLastActivity;
	var dtObj = new Date(dt_gmt);
	var dt = dtObj.toLocaleString();

	if (prefVal.showBoardTitle)
	htm.push('<h2>', DB.raw.name,
		'<span class=asof> - last activity - ', dt, '</span>',
		'</h2>');

	var larr = DB.listArr;
	for (var i=0; i<larr.length; i++){
		htm.push(dpyList(i));
	}
	htm.push('<hr>');

	var el = document.getElementById('MAIN');
	el.innerHTML = htm.join('');

}

function dpyList(i,mode,showPrintHref)
{
	var htm = [];
	if (!mode) mode = 0;
	if (typeof showPrintHref == 'undefined') showPrintHref = true ;

	var lobj = DB.listArr[i];
//console.log(i,lobj);
	if (lobj.closed && !prefVal.showClosedLists ) return;

	var pb = '';
	if (i>0) pb = " style='page-break-before:always' ";

	var x = prefVal.showListTitle;
	if (x){

		var bn = DB.raw.name;
		if (!prefVal.prefaceListNameWithBoard) bn = '';

		var ar = '';

		if (lobj.closed) ar = '<span class=hilite>&nbsp;Archived-List: </span>';

		var nn = i; nn++; nn += '. ';
		if (!prefVal.numberLists) nn='';
		htm.push('<h3',pb,'><hr>', bn, ' :: ', ar, nn, lobj.name);


	        if (showPrintHref && prefVal.showSingleList) htm.push(
		'&nbsp; &nbsp; &nbsp;<span class=small-menu>',
		'<a href=javascript:JS.printList(',i,',0)>print just this list</a>',
		' : ',
		'<a href=javascript:JS.printList(',i,',1)>print just this list expanded</a>',
		'</span>'
		);

		htm.push('<hr>', '</h3>');
	}

	else if (pb) htm.push('<div',pb,'></div>');

	var carr = lobj.cardArr;

	// Count cards so we can insert a page break after every 6 cards. The print
	// CSS defines card size to 80x80mm, which means 6 cards fit on an A4. The
	// card divs are wrapped in an extra div at 6 cards per div, and that
	// wrapper div has a page-break-after.
	var cardCount = 0;
	htm.push('<div class="card-wrapper">');
	for (var j=0; j<carr.length; j++){

		var cobj = carr[j];
		if (cobj.breakBool) break;

		if (cobj.closed && !prefVal.showClosedCards) continue;

		cardId = [''];
		var x = prefVal.numberLists;
		if (x) cardId.push(i+1,'.');
		var x = prefVal.numberCardsInList;
		if (x) cardId.push(j+1, ' ');
		else cardId = [''];
		cardId = cardId.join('');

		if (cardCount && cardCount % 6 == 0) {
		  htm.push('</div><div class="card-wrapper">');
		}
		cardCount++;

		htm.push('<div class="card-div ', prefVal.checklistMode, '">');
		htm.push(dpyCard(cobj,cardId,mode));
		htm.push('</div>');
	}
	htm.push('</div>');
	return htm.join('');
}


var cardHtm = [];

var curr_cobj;

function dpyCard(cobj,cardId,mode)
{
	curr_cobj = cobj;		// need this for do_sub/...

	if (cobj.name == prefCardTitle) return;

	cobj.xrefArr = [];

	var htm = [];
	var x = prefVal.showCardTitle;
	if (x) {
	    if (cobj.closed) htm.push('<span class=hilite>&nbsp;Archived-Card: </span>');
            htm.push('',
		cardId,' <span class=card-title>',cobj.name,'</span>');

	    if (prefVal.showCardNumber)
	    	htm.push(' (#', cobj.idShort,')');

	    if (cobj.who) htm.push( dpyWhoName(cobj.who) );
	    else if (cobj.whox) htm.push( ' (', cobj.whox, ')');
        }

	// -- show any labels
	var x = prefVal.showCardLabels;
        if (x != 'none') {
	   var tmp = cobj.labels;
	   var x = prefVal.showCardLabels;
	   for (var k=0; k<tmp.length; k++){
		var kobj = cobj.labels[k];
		htm.push(' ');
		if (x == 'show-color-block'){
			htm.push('<span class="label-color-block-' , kobj.color , '">&nbsp;&nbsp;&nbsp;</span>');
		}
		else if (x == 'colored-text'){
			htm.push(' <span class="label-colored-text-' , kobj.color , '">', kobj.name, '</i>');
		}
		else htm.push('<span class="label label-' , kobj.color , '">',kobj.name,'</span>');
	   }
	}

	// -- show votes
	var x = prefVal.showVoteCount;
	var varr = cobj.idMembersVoted;
	if (x && varr.length) {
		var s = '';  if (varr.length>1) s = "s";
		var varr = cobj.idMembersVoted;
		htm.push(' (', varr.length, '&nbsp;vote',s,')');

	}

	// -- show due date
	var x = prefVal.showDueDate;
	if (x && cobj.due) {
		var dd = cobj.due.replace(/T.*$/,'');
		htm.push(' due: ',dd);
	}


	// -- show desc
	var x = prefVal.showCardDesc;
	if (x) htm.push(do_sub(cobj.desc));

	// -- show any checklists
	var x = prefVal.showChecklists;
	if (x && cobj.cklistArr.length > 0){
	  var marr = cobj.cklistArr.reverse();
          for (var k=0; k<marr.length; k++){

		htm.push(dpyChecklist(marr[k]));

	  }
	}


	// -- show any comments
	var x = prefVal.showComments;
	if (x && cobj.commArr.length > 0){
	  htm.push('<ul class="comments">');

	  //var marr = cobj.commArr.reverse();
	  var marr = cobj.commArr;
	  for (var k=0; k<marr.length; k++){
      var buf = dpyWhoName(marr[k].memberCreator.fullName) + ": " + marr[k].data.text;
      //htm.push('<li>', do_sub(buf));
      htm.push('<li>', buf);
	  }
	  htm.push('</ul>');
	}

	var buf = htm.join('');
	cardHtm[cobj.idShort] = buf;


	if (mode == 1){
		var arr = cobj.xrefArr;
		var done = [];
		for (var j=0; j<arr.length; j++){
console.log('xref.',j, arr[j], cardHtm[arr[j]]);
			var k = arr[j];
			if (done[k]==1) continue;
			done[k] = 1;
			htm.push('<div class=xref-div>');
			htm.push(cardHtm[k]);
			htm.push('</div>');
		}

	}
	// leave holder for expanding xref links
	htm.push('<div  id=xrefDiv',cobj.idShort,'></div>');


	htm = htm.join('');

	return htm;

}

function dpyChecklist(clobj)
{
//console.log(clobj);

	var htm = [];
	htm.push('<p class=checklist>',clobj.name);

	var mode = prefVal.showChecklistItems;
	// - none
	// - all
	// - unchecked-only -- good for todo lists
	// - checked-only -- good for grocery lists

	var arr = clobj.checkItems;
	var cnt = 0;
	for (var i=0; i<arr.length; i++){

		var obj = arr[i];

		var ckmk = '[x]';
		if (obj.state == 'incomplete'){
			if (mode == 'checked-only') continue;
			ckmk = '[&nbsp;]'
		}
		else {
			if (mode == 'checked-only') ckmk = '___ ';
		}

		htm.push('<br>&nbsp;&nbsp;<tt>', ckmk, '</tt> ', obj.name);
		++cnt;
	}
	if (cnt == 0) return '';
	htm.push('</p>');
	return htm.join('');
}

function dpyWhoName(name)
{
	var x = prefVal.showPersonAs;

	if (x == 'none') return '';
	if (x == 'do-not-show') return '';

	var obj = DB.whoLookup[name];  // should be fullName

	if (obj) x = obj[x];
	else x = name;

	if (!x ) x = name;


	return ' - ' + x.italics();
}


function do_sub(buf)
{

	// apply any markdown conventions
        var htm = SD.makeHtml(buf);

	// look for #(\d)+ , e.g. #105
	// and replace with hyperlink to #card105

	return htm.replace(/#([0-9]+)([^0-9])/g, mk_idhref);
}

function mk_idhref(xx,id,delim)
{
	//return '<a href=#card' + id + '>' + str + '</a>';
	curr_cobj.xrefArr.push(id);
	return '<a href=javascript:JS.popCard(' +curr_cobj.idShort+ ',' +id+ ')>#' + id + '</a>' + delim;
}

function popCard(origId,xrefId)
{
	var el = document.getElementById('xrefDiv'+origId);
	var htm = '[<a href=javascript:JS.closeXrefDiv('+origId+')>close.#'
		+ xrefId + '</a>] &nbsp;'
		+ '<div class=xref-div>'
		+ cardHtm[xrefId]
		+ '</div>'
		;

	if (el) el.innerHTML = htm;
}

function closeXrefDiv(id)
{
	var el = document.getElementById('xrefDiv' + id);
	if (el) el.innerHTML = '';
}


function printList(i,mode)
{
	var htm = [
		'<link rel=stylesheet href=trello-print.css></link>',
		dpyList(i,mode,false),
		''];

	var win = window.open();
	var doc = win.document;
	doc.open();
	doc.write(htm.join(''));
	doc.close();
	win.JS = window;
}


