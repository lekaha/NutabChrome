// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var TAG = "NuTab";

var animationFrames = 36;
var animationSpeed = 10; // ms
//var canvas = document.getElementById('canvas');
//var loggedInImage = document.getElementById('logged_in');
//var canvasContext = canvas.getContext('2d');
var pollIntervalMin = 1;  // 1 minute
var pollIntervalMax = 60;  // 1 hour
var requestTimeout = 1000 * 2;  // 2 seconds
var rotation = 0;
var loadingAnimation = new LoadingAnimation();

// Legacy support for pre-event-pages.
var oldChromeVersion = !chrome.runtime;
var requestTimerId;

var nutabLogged = false;

function D(msg) {
    console.log("[" + TAG + "] " + msg);
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
    chrome.browserAction.setBadgeBackgroundColor({color:[208, 0, 24, 255]});
	chrome.browserAction.setBadgeText({text: count.toString()});
	  
	D("tab count = " + count);
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

function onLogout() {
    delete localStorage.nutabid;
}

function onLogin() {

}

function onNeedLogin() {

}

function isLogged() {
    if (localStorage.hasOwnProperty("nutabid")) {
        D("isLogged: nutab id = " + localStorage.nutabid);
        return true;
    }
    else {    
        D("isLogged: Not logged nutab id");
        return false;
    }
}

function onActionClicked() {
    if(nutabLogged) {
        D("onActionClicked: Logged nutab id");
    }
    else {
        D("onActionClicked: Not logged nutab id");
    }
}

function setActionPopup(enable) {
    if(!enable) {
      	chrome.browserAction.setPopup(
      		{
      			popup: "popup.html"
      		}
      	);
    }
    else {
        chrome.browserAction.setPopup(
	  		{
	  			popup: ""
	  		}
	  	);
    }
}

function getGmailUrl() {
  return "https://mail.google.com/mail/";
}

// Identifier used to debug the possibility of multiple instances of the
// extension making requests on behalf of a single user.
function getInstanceId() {
  if (!localStorage.hasOwnProperty("instanceId"))
    localStorage.instanceId = 'gmc' + parseInt(Date.now() * Math.random(), 10);
  return localStorage.instanceId;
}

function getFeedUrl() {
  // "zx" is a Gmail query parameter that is expected to contain a random
  // string and may be ignored/stripped.
  return getGmailUrl() + "feed/atom?zx=" + encodeURIComponent(getInstanceId());
}

function isGmailUrl(url) {
  // Return whether the URL starts with the Gmail prefix.
  return url.indexOf(getGmailUrl()) == 0;
}

// A "loading" animation displayed while we wait for the first response from
// Gmail. This animates the badge text with a dot that cycles from left to
// right.
function LoadingAnimation() {
  this.timerId_ = 0;
  this.maxCount_ = 8;  // Total number of states in animation
  this.current_ = 0;  // Current state
  this.maxDot_ = 4;  // Max number of dots in animation
}

LoadingAnimation.prototype.paintFrame = function() {
  var text = "";
  for (var i = 0; i < this.maxDot_; i++) {
    text += (i == this.current_) ? "." : " ";
  }
  if (this.current_ >= this.maxDot_)
    text += "";

  //chrome.browserAction.setBadgeText({text:text});
  this.current_++;
  if (this.current_ == this.maxCount_)
    this.current_ = 0;
}

LoadingAnimation.prototype.start = function() {
  if (this.timerId_)
    return;

  var self = this;
  this.timerId_ = window.setInterval(function() {
    self.paintFrame();
  }, 100);
}

LoadingAnimation.prototype.stop = function() {
  if (!this.timerId_)
    return;

  window.clearInterval(this.timerId_);
  this.timerId_ = 0;
}

function updateIcon(isLogged) {
  if (!isLogged) {
    chrome.browserAction.setIcon({path:"icon_24.png"});
    chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text:"?"});
  } else {
//    chrome.browserAction.setIcon({path: "icon_24.png"});
    chrome.browserAction.setBadgeBackgroundColor({color:[208, 0, 24, 255]});
//    chrome.browserAction.setBadgeText({
//      text: localStorage.unreadCount != "0" ? localStorage.unreadCount : ""
//    });
    getAllWindowTabs();
  }
}

function scheduleRequest() {
  D('scheduleRequest');
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, localStorage.requestFailureCount || 0);
  var multiplier = Math.max(randomness * exponent, 1);
  var delay = Math.min(multiplier * pollIntervalMin, pollIntervalMax);
  delay = Math.round(delay);
  D('Scheduling for: ' + delay + ' minutes');

  if (oldChromeVersion) {
    if (requestTimerId) {
      window.clearTimeout(requestTimerId);
    }
    requestTimerId = window.setTimeout(onAlarm, delay*60*1000);
  } else {
    D('Creating alarm');
    // Use a repeating alarm so that it fires again if there was a problem
    // setting the next alarm.
    chrome.alarms.create('refresh', {periodInMinutes: delay});
  }
}

// ajax stuff
function startRequest(params) {
  // Schedule request immediately. We want to be sure to reschedule, even in the
  // case where the extension process shuts down while this request is
  // outstanding.
  if (params && params.scheduleRequest) scheduleRequest();

  function stopLoadingAnimation() {
    if (params && params.showLoadingAnimation) loadingAnimation.stop();
  }

  if (params && params.showLoadingAnimation)
    loadingAnimation.start();

  getInboxCount(
    function(count) {
      stopLoadingAnimation();
      updateUnreadCount(count);
    },
    function() {
      stopLoadingAnimation();
      delete localStorage.unreadCount;
      //updateIcon();
    }
  );
}

function getInboxCount(onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();  // synchronously calls onreadystatechange
  }, requestTimeout);

  function handleSuccess(count) {
    localStorage.requestFailureCount = 0;
    window.clearTimeout(abortTimerId);
    if (onSuccess)
      onSuccess(count);
  }

  var invokedErrorCallback = false;
  function handleError() {
    ++localStorage.requestFailureCount;
    window.clearTimeout(abortTimerId);
    if (onError && !invokedErrorCallback)
      onError();
    invokedErrorCallback = true;
  }

  try {
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;

      if (xhr.responseXML) {
        var xmlDoc = xhr.responseXML;
        var fullCountSet = xmlDoc.evaluate("/gmail:feed/gmail:fullcount",
            xmlDoc, gmailNSResolver, XPathResult.ANY_TYPE, null);
        var fullCountNode = fullCountSet.iterateNext();
        if (fullCountNode) {
          handleSuccess(fullCountNode.textContent);
          return;
        } else {
          console.error(chrome.i18n.getMessage("gmailcheck_node_error"));
        }
      }

      handleError();
    };

    xhr.onerror = function(error) {
      handleError();
    };

    xhr.open("GET", getFeedUrl(), true);
    xhr.send(null);
  } catch(e) {
    console.error(chrome.i18n.getMessage("gmailcheck_exception", e));
    handleError();
  }
}

function gmailNSResolver(prefix) {
  if(prefix == 'gmail') {
    return 'http://purl.org/atom/ns#';
  }
}

function updateUnreadCount(count) {
  var changed = localStorage.unreadCount != count;
  localStorage.unreadCount = count;
  //updateIcon();
//  if (changed)
//    animateFlip();
}


function ease(x) {
  return (1-Math.sin(Math.PI/2+x*Math.PI))/2;
}

function animateFlip() {
  rotation += 1/animationFrames;
  drawIconAtRotation();

  if (rotation <= 1) {
    setTimeout(animateFlip, animationSpeed);
  } else {
    rotation = 0;
    //updateIcon();
  }
}

function drawIconAtRotation() {
  canvasContext.save();
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.translate(
      Math.ceil(canvas.width/2),
      Math.ceil(canvas.height/2));
  canvasContext.rotate(2*Math.PI*ease(rotation));
  canvasContext.drawImage(loggedInImage,
      -Math.ceil(canvas.width/2),
      -Math.ceil(canvas.height/2));
  canvasContext.restore();

  chrome.browserAction.setIcon({imageData:canvasContext.getImageData(0, 0,
      canvas.width,canvas.height)});
}

function goToInbox() {
  D('Going to inbox...');
  isLogged();
  chrome.tabs.getAllInWindow(undefined, function(tabs) {
    for (var i = 0, tab; tab = tabs[i]; i++) {
      if (tab.url && isGmailUrl(tab.url)) {
        D('Found Gmail tab: ' + tab.url + '. ' +
                    'Focusing and refreshing count...');
        chrome.tabs.update(tab.id, {selected: true});
        startRequest({scheduleRequest:false, showLoadingAnimation:false});
        return;
      }
    }
    D('Could not find Gmail tab. Creating one...');
    chrome.tabs.create({url: getGmailUrl()});
  });
}

function onInit() {
  D('onInit');
  localStorage.requestFailureCount = 0;  // used for exponential backoff
  startRequest({scheduleRequest:true, showLoadingAnimation:true});
  if (!oldChromeVersion) {
    // TODO(mpcomplete): We should be able to remove this now, but leaving it
    // for a little while just to be sure the refresh alarm is working nicely.  
    var d = 5;
    D("create alarm period in " + d.toString() + " mins.");
    chrome.alarms.create('watchdog', {periodInMinutes:d});
  }
}

function onAlarm(alarm) {
  D('Got alarm', alarm);
  // |alarm| can be undefined because onAlarm also gets called from
  // window.setTimeout on old chrome versions.
  if (alarm && alarm.name == 'watchdog') {
    onWatchdog();
  } else {
    startRequest({scheduleRequest:true, showLoadingAnimation:false});
  }
}

function onWatchdog() {
  chrome.alarms.get('refresh', function(alarm) {
    if (alarm) {
      D('Refresh alarm exists. Yay.');
    } else {
      D('Refresh alarm doesn\'t exist!? ' +
                  'Refreshing now and rescheduling.');
      startRequest({scheduleRequest:true, showLoadingAnimation:false});
    }
  });
}



function onNavigate(details) {
  if (details.url && isGmailUrl(details.url)) {
    D('Recognized Gmail navigation to: ' + details.url + '.' +
                'Refreshing count...');
    startRequest({scheduleRequest:false, showLoadingAnimation:false});
  }
}

var filters = {
  // TODO(aa): Cannot use urlPrefix because all the url fields lack the protocol
  // part. See crbug.com/140238.
  url: [{urlContains: getGmailUrl().replace(/^https?\:\/\//, '')}]
};

if (oldChromeVersion) {
  D("starting...(old chrome version)");
  updateIcon();
  onInit();
} else {
    D("starting...");
    nutabLogged = isLogged();
    updateIcon(nutabLogged);
    setActionPopup(nutabLogged);

    chrome.runtime.onInstalled.addListener(onInit);
    chrome.alarms.onAlarm.addListener(onAlarm);
}

if (chrome.webNavigation && chrome.webNavigation.onDOMContentLoaded &&
    chrome.webNavigation.onReferenceFragmentUpdated) {
  D("webNavigation, onDomContentLoaded...");
  chrome.webNavigation.onDOMContentLoaded.addListener(onNavigate, filters);
  chrome.webNavigation.onReferenceFragmentUpdated.addListener(
      onNavigate, filters);
} else {
  D("webNavigation, set tab onupdate listener");
  chrome.tabs.onUpdated.addListener(function(_, details) {
    onNavigate(details);
  });
}

chrome.browserAction.onClicked.addListener(goToInbox);

if (chrome.runtime && chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(function() {
    D('Starting browser... updating icon.');
    startRequest({scheduleRequest:false, showLoadingAnimation:false});
    updateIcon();
  });
} else {
  // This hack is needed because Chrome 22 does not persist browserAction icon
  // state, and also doesn't expose onStartup. So the icon always starts out in
  // wrong state. We don't actually use onStartup except as a clue that we're
  // in a version of Chrome that has this problem.
  chrome.windows.onCreated.addListener(function() {
    D('Window created... updating icon.');
    startRequest({scheduleRequest:false, showLoadingAnimation:false});
    updateIcon();
  });
}
