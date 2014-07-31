/*$(document).ready(function(){
          $('#id_url').preview({key: 'ef5beeb8b53746e3b4248c10c871723e', // Sign up for a key: http://embed.ly/pricing
                                bind: false,
                                query : {
                                  autoplay : 1,
                                  maxwidth: 600
                                }})
                      .on('loading', function(){
                        $(this).prop('disabled', true);
                      })
                      .on('loaded', function(){
                        $(this).prop('disabled', false);
                      });
          $('#urllink').on('click', function(){
                        $('#id_url').trigger('preview');
                      });

        })

function getUnreadItems(callback) {
    $.ajax(..., function(data) {
        process(data);
        callback(data);
    });
}*/

function updateBadge() {
    getUnreadItems(function(data) {
        chrome.browserAction.setBadgeText({text:data.unreadItems});
    });
}


function startRequest() {
    updateBadge();
    timerId = window.setTimeout(startRequest, pollInterval);
    prompt("startRequest");
}
function stopRequest() {
    window.clearTimeout(timerId);
}

function getDomainFromUrl(url) {
	var host = "null";
	if(typeof url == "undefined" || null == url)
		url = window.location.href;
	var regex = /.*\:\/\/([^\/]*).*/;
	var match = url.match(regex);
	if(typeof match != "undefined" && null != match)
		host = match[1];
	return host;
}

function getWindowTabsCount(window) {
	return window.tabs.length;
}

function getTabsCount(windowList) {
	var count = 0;
	for (var i = 0; i < windowList.length; i++) {
	    count += getWindowTabsCount(windowList[i]);
	}
	return count;
}

function onTabsCountChange(count) {
    chrome.browserAction.setBadgeBackgroundColor({color: "#123123"});
	chrome.browserAction.setBadgeText({text: count.toString()});
	  
	console.log("tab count = " + count);
}

function getAllWindowTabs() {
  chrome.windows.getAll(
  	{ populate: true }, 
  	function(windowList) {
	  var c = getTabsCount(windowList);
	  onTabsCountChange(c);  
  	}
  );
}

function checkForValidUrl(tabId, changeInfo, tab) {
  getAllWindowTabs();
};

chrome.browserAction.onClicked.addListener(getAllWindowTabs);

chrome.tabs.onUpdated.addListener(checkForValidUrl);
chrome.tabs.onActivated.addListener(function(info) {
    checkForValidUrl();
});
chrome.tabs.onMoved.addListener(function(tabId, removeInfo) {
    checkForValidUrl();
});
chrome.tabs.onCreated.addListener(function(tab) {
    checkForValidUrl();
});

chrome.runtime.onInstalled.addListener(function() {
  console.log("Installed.");

  // localStorage is persisted, so it's a good place to keep state that you
  // need to persist across page reloads.
  localStorage.counter = 1;

  //chrome.browserAction.setBadgeText({text: "ON"});
  console.log("Loaded.");

  var t = 0;
  chrome.windows.getAll({ 
  	populate: true }, 
  	function(windowList) {
	  t = getTabsCount(windowList);
	  chrome.browserAction.setBadgeBackgroundColor({color: "#123123"});
	  chrome.browserAction.setBadgeText({text: t.toString()});
	  if(t > 20) {
	  	chrome.browserAction.setPopup(
	  		{
	  			popup: "popup.html"
	  		}
	  	);
	  	console.log("enable popup");
	  }
	  else {
	  	chrome.browserAction.setPopup(
	  		{
	  			popup: ""
	  		}
	  	);
	  	console.log("disable popup");
	  }
  });
});
