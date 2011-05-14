function setPref(key, value) {
	localStorage[key] = value;
	chrome.extension.sendRequest({action : 'reloadConfig'});
	
	if (key == 'refresh_rate') {
		chrome.extension.sendRequest({action : 'refreshRateChanged'});
	}
}

function getPref(key) {
	var v = localStorage[key];
	if (v == 'true') v = true;
	if (v == 'false') v = false;
	return v;
}

function getAllPrefs() {
	return localStorage;
}

function setDefaults() {
	if(!getPref('sab_url')) setPref('sab_url', 'http://localhost:8080/sabnzbd/');
	if(!getPref('api_key')) setPref('api_key', '');
	if(!getPref('http_user')) setPref('http_user', '');
	if(!getPref('http_pass')) setPref('http_pass', '');
	if(!getPref('hardcoded_category')) setPref('hardcoded_category', '');
	if(!getPref('default_category')) setPref('default_category', '');
	if(!getPref('speedlog')) setPref('speedlog', JSON.stringify([]));
	if(getPref('show_graph') == null) setPref('show_graph', 0);
	if(getPref('show_notifications') == null) setPref('show_notifications', 1);
	if(getPref('notifications_timeout') == null) setPref('notifications_timeout', 0);
	if(getPref('use_category_header') == null) setPref('use_category_header', 0);
	if(getPref('enable_newzbin') == null) setPref('enable_newzbin', 1);
	if(getPref('enable_nzbmatrix') == null) setPref('enable_nzbmatrix', 1);
	if(getPref('enable_nzbclub') == null) setPref('enable_nzbclub', 1);
	if(getPref('enable_bintube') == null) setPref('enable_bintube', 1);
	if(getPref('enable_newzleech') == null) setPref('enable_newzleech', 1);
	if(getPref('enable_nzbsorg') == null) setPref('enable_nzbsorg', 1);
	if(getPref('enable_binsearch') == null) setPref('enable_binsearch', 1);
	if(getPref('enable_nzbindex') == null) setPref('enable_nzbindex', 1);
	if(getPref('enable_nzbsrus') == null) setPref('enable_nzbsrus', 1);
	if(getPref('enable_nzbdotsu') == null) setPref('enable_nzbdotsu', 1);
	if(getPref('enable_fanzub') == null) setPref('enable_fanzub', 1);
	if(getPref('use_nice_name_nzbindex') == null) setPref('use_nice_name_nzbindex', 1);
	if(getPref('use_nice_name_binsearch') == null) setPref('use_nice_name_binsearch', 1);
 
	// Force this back to 0 just incase
	setPref('skip_redraw', 0);
	
	setPref('refresh_rate_default', 15);
	if(getPref('refresh_rate') == null) setPref('refresh_rate', getPref('refresh_rate_default'));
}

function checkEndSlash(input) {
	if (input.charAt(input.length-1) == '/') {
		return input;
	} else {
		var output = input+'/';
		return output;
	}
}

function constructApiUrl() {
	var sabUrl = checkEndSlash(getPref('sab_url')) + 'api';
	return sabUrl;
}

function constructApiPost() {
	var data = {};
	
	var apikey = getPref('api_key');
	if (apikey) {
		data.apikey = apikey;
	}

	var username = getPref('http_user');
	if (username) {
		data.ma_username = username;
	}

	var password = getPref('http_pass');
	if (password) {
		data.ma_password = password;
	}
	
	return data;
}

// List of sites that send the X-DNZB-Category HTTP header
var category_header_sites = ['nzbs.org', 'newzbin.com', 'newzxxx.com'];
var no_category_header_sites = ['nzbmatrix.com', 'binsearch', 'nzbindex', 'nzbsrus', 'newzleech', 'nzbclub', 'fanzub.com'];

function addToSABnzbd(addLink, nzburl, mode, nice_name, category) {
	var req = {'action' : 'addToSABnzbd',
	'nzburl' : nzburl,
	'mode' : mode
	};
	
	if (typeof nice_name != 'undefined' && nice_name != null) {
		req['nzbname'] = nice_name;
	}

	if (typeof category != 'undefined' && category != null) {
		req['category'] = category;
	}
	
	console.log("Sending to SABnzbd:");
	console.log(req);

	chrome.extension.sendRequest(
		req, function(response) {
			switch(response.ret)
			{
			case 'error' :
				alert("Could not contact SABnzbd \n Check it is running and your settings are correct");
				var img = chrome.extension.getURL('images/sab2_16_red.png');
				if ($(this).find('img').length > 0) {
				    $(addLink).find('img').attr("src", img);
				} else {
					$(addLink).css('background-image', 'url('+img+')');
				}
				return;
			case 'success' :
				// If there was an error of some type, report it to the user and abort!
				if (response.data.error) {
					alert(response.data.error);
					var img = chrome.extension.getURL('images/sab2_16_red.png');
					if ($(this).find('img').length > 0) {
					    $(addLink).find('img').attr("src", img);
					} else {
						$(addLink).css('background-image', 'url('+img+')');
					}
					return;
				}
				var img = chrome.extension.getURL('images/sab2_16_green.png');
				if ($(addLink).find('img').length > 0) {
				    $(addLink).find('img').attr("src", img);
				} else if (addLink.nodeName && addLink.nodeName.toUpperCase() == 'INPUT' && addLink.value == 'Sent to SABnzbd!') {
					// Nothing; handled in nzbsorg.js
				} else {
					$(addLink).css('background-image', 'url('+img+')');
				}
				return;
			default:
				alert("Oops! Something went wrong. Try again.");
			}
		});
		return;
}


function moveQueueItem(nzoid, pos) {
	var sabApiUrl = constructApiUrl();
	var data = constructApiPost();
	data.mode = 'switch';
	data.value = nzoid;
	data.value2 = pos;

	$.ajax({
		type: "POST",
		url: sabApiUrl,
		data: data,
		username: getPref('http_user'),
		password: getPref('http_pass'),
		success: function(data) {
			// Since data has changed, refresh the jobs. Does not update the graph because the first param is true
			fetchInfo(true);
		},
		error: function() {
			$('#error').html('Failed to move item, please check your connection to SABnzbd');
		}
	});
 
	
}

function queueItemAction(action, nzoid, callBack) {

	var sabApiUrl = constructApiUrl();
	var data = constructApiPost();
	data.mode = 'queue';
	data.name = action;
	data.value = nzoid;	

	$.ajax({
		type: "POST",
		url: sabApiUrl,
		data: data,
		username: getPref('http_user'),
		password: getPref('http_pass'),
		success: function(data) {
			// Since data has changed, refresh the jobs. Does not update the graph because the first param is true
			fetchInfo(true, callBack);
		},
		error: function() {
			$('#error').html('Failed to move item, please check your connection to SABnzbd');
		}
	});
 
	
}

//file size formatter - takes an input in bytes
function fileSizes(value, decimals){
	// Set the default decimals to 2
	if(decimals == null) decimals = 2;
	kb = value / 1024
	mb = value / 1048576
	gb = value / 1073741824
	if (gb >= 1){
		return gb.toFixed(decimals)+"GB"
	} else if (mb >= 1) {
		return mb.toFixed(decimals)+"MB"
	} else {
		return kb.toFixed(decimals)+"KB"
	}
}

/**
 * quickUpdate
 *	 If set to true, will not update the graph ect, currently used when a queue item has been moved/deleted in order to refresh the queue list
 */
function fetchInfo(quickUpdate, callBack) {

	var sabApiUrl = constructApiUrl();
	var data = constructApiPost();
	
	data.mode = 'queue';
	data.output = 'json';
	data.limit = '5';
	$.ajax({
		type: "GET",
		url: sabApiUrl,
		data: data,
		username: getPref('http_user'),
		password: getPref('http_pass'),
		dataType: 'json',
		success: function(data) {

			// If there was an error of some type, report it to the user and abort!
			if(data != null && data.error) {
				setPref('error', data.error);
				// We allow a custom callback to be passed (ie redrawing the popup html after update)
				if(callBack) {
					callBack();
				}
				return;
			}
			// This will remove the error
			// Will cause problems if the error pref is used elsewhere to report other errors
			setPref('error', '');
			
			setPref('timeleft', data.queue.timeleft);
			
			if(data.queue.speed) {
				// Convert to bytes
				var bytesPerSec = parseFloat(data.queue.kbpersec)*1024;
				var speed = data.queue.speed + 'B/s';
			} else {
				var speed = '-';
			}
			setPref('speed', speed);
			
			// Do not run this on a quickUpdate (unscheduled refresh)
			//console.log(data.queue)
			if(!quickUpdate) {
			    //console.log("!quickUpdate")
				var speedlog = JSON.parse(getPref('speedlog'));
				
				if(speedlog.length >= 10) {
					// Only allow 10 values, if at our limit, remove the first value (oldest)
					speedlog.shift();
				}
				
				speedlog.push(parseFloat(data.queue.kbpersec));
				setPref('speedlog', JSON.stringify(speedlog));
			}
			
			if(data.queue.mbleft && data.queue.mbleft > 0) {
				// Convert to bytes
				var bytesLeft = data.queue.mbleft*1048576;
				var queueSize = fileSizes(bytesLeft);
			} else {
				var queueSize = '';
			}
			setPref('sizeleft', queueSize);

			setPref('queue', JSON.stringify(data.queue.slots));		   

			setPref('status', data.queue.status);
			setPref('paused', data.queue.paused);

			// Update the badge
			var badge = {};
			// Set the text on the object to be the number of items in the queue
			// +'' = converts the int to a string.
			if (data.queue.noofslots == 0) {
				badge.text = '';
			} else {
				badge.text = data.queue.noofslots+'';
			}
			chrome.browserAction.setBadgeText(badge);
			
			// Update the background based on if we are downloading
			if(data.queue.kbpersec && parseFloat(data.queue.kbpersec) > 1) {
				badgeColor = {}
				badgeColor.color = new Array(0, 213, 7, 100);
				chrome.browserAction.setBadgeBackgroundColor(badgeColor)
			} else {
				// Not downloading
				badgeColor = {}
				badgeColor.color = new Array(255, 0, 0, 100);
				chrome.browserAction.setBadgeBackgroundColor(badgeColor)
			}
			
			// We allow a custom callback to be passed (ie redrawing the popup html after update)
			if(callBack) {
				callBack();
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			setPref('error', 'Could not connect to SABnzbd - Check it is running, the details in this plugin\'s settings are correct and that you are running at least SABnzbd version 0.5!');
			// We allow a custom callback to be passed (ie redrawing the popup html after update)
			if(callBack) {
				callBack();
			}
		}
	});

	if (!quickUpdate && getPref('show_notifications') == '1') {
		// Check for new complete downloads
		var sabApiUrl = constructApiUrl();
		var data = constructApiPost();

		data.mode = 'history';
		data.output = 'json';
		data.limit = '10';
		$.ajax({
			type: "GET",
			url: sabApiUrl,
			data: data,
			username: getPref('http_user'),
			password: getPref('http_pass'),
			dataType: 'json',
			success: function(data) {
				for (var i=0; i<data.history.slots.length; i++) {
					var dl = data.history.slots[i];
					var key = 'past_dl-' + dl.name + '-' + dl.bytes;
					if (typeof localStorage[key] == 'undefined') {
						console.log("Possible History notification:");
						console.log(dl);
						// Only notify when post-processing is complete
						if (dl.action_line == '') {
							if (dl.fail_message != '') {
								var fail_msg = dl.fail_message.split('<')[0];
								var notification = webkitNotifications.createNotification(
								  'images/sab2_64.png',
								  'Download Failed',
								  dl.name + ': ' + fail_msg
								);
							} else {
								var notification = webkitNotifications.createNotification(
								  'images/sab2_64.png',
								  'Download Complete',
								  dl.name
								);
							}
							notification.show();
							localStorage[key] = true;
							console.log("Notification posted!");
							
							if (getPref('notifications_timeout') != '0') {
								console.log("notifications_timeout set to " + getPref('notifications_timeout') + " seconds");
								setTimeout(function() { notification.cancel(); }, getPref('notifications_timeout') * 1000);
							}
						}
					}
				}
			}
		});
	}
}