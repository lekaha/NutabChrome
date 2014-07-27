// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Show a list of all tabs in the same process as this one.
function init() {
  $(document).ready(function(){
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
        });

        $('#id_attach').bind('click', function(e){
        console.log('id_attach = ' + $('#id_url').val());
        if ($(this).text() == 'Attach'){
          $('#id_url').trigger('preview');
          $('#id_url').val($(this).text());
        } else {


        }
        });
  console.log('id_url = ' + $('#id_url').val());

  chrome.windows.getCurrent({populate: true}, function(currentWindow) {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
      var current = currentWindow.tabs.filter(function(tab) {
        return tab.active;
      })[0];
      chrome.processes.getProcessIdForTab(current.id,
        function(pid) {
          var outputDiv = document.getElementById("tab-list");
          var titleDiv = document.getElementById("title");
          titleDiv.innerHTML = "<b>Current Tabs in Process " + pid + ":</b>";
          //displayTabInfo(currentWindow.id, current, outputDiv);
          displaySameProcessTabs(current, pid, outputDiv);
        }
      );

    });
  });
}

function displaySameProcessTabs(selectedTab, processId, outputDiv) {
  // Loop over all windows and their tabs
  var tabs = [];
  
  chrome.windows.getAll({ populate: true }, function(windowList) {
    for (var i = 0; i < windowList.length; i++) {
      for (var j = 0; j < windowList[i].tabs.length; j++) {
        var tab = windowList[i].tabs[j];
        //if (tab.id != selectedTab.id) {
          tabs.push(tab);
        //}
      }
    }

    outputDiv.innerHTML += "<ul>";
    // Display tab in list if it is in the same process
    tabs.forEach(function(tab) {
      chrome.processes.getProcessIdForTab(tab.id,
        function(pid) {
          //if (pid == processId) {
            
            displayTabInfo(tab.windowId, tab, outputDiv);
          //}
        }
      );
    });
    outputDiv.innerHTML += "</ul>";
  });


}

// Print a link to a given tab
function displayTabInfo(windowId, tab, outputDiv) {
  //outputDiv.innerHTML += "<li>";
  var tabInfo = "<li>";
  if (tab.favIconUrl != undefined) {
    //outputDiv.innerHTML += "<img src='chrome://favicon/" + tab.url + "'>\n";
    tabInfo += "<img src='chrome://favicon/" + tab.url + "'>\n";
  }
  


  //outputDiv.innerHTML +=
    //"<b><a href='#' onclick='showTab(window, " + windowId + ", " + tab.id +
    //")'>" + tab.title + "</a></b><br>\n" +
    //"<i>" + tab.url + "</i><br>\n";
  tabInfo += "<b><a href='#' id='urllink'>" + tab.title + "</a></b><br>\n" +
    "<i>" + tab.url + "</i><br>\n";
  tabInfo += "<input type='hidden' class='input-xxlarge' name='url' id='id_url_" + tab.id + "' value='" + tab.url + "'></div><div id='loader_" + tab.id + "'></div></div>";
  tabInfo += "</li>";
  outputDiv.innerHTML += tabInfo;

  $('#id_url_' + tab.id).preview({key: 'ef5beeb8b53746e3b4248c10c871723e', // Sign up for a key: http://embed.ly/pricing
                                bind: false,
                                render:function(data, options){
                                      if(null != data) {
                                          // Add the title after the input.
                                          prev = '<div class="row">' +
                                            '<div class="large-3 columns">' +
                                              '<img class="thumb" src="' + data.thumbnail_url + '"></img>' +
                                            '</div>' +
                                            '<div class="large-9 column">' +
                                              '<a href="' + tab.url + '">' + data.title + '</a>' +
                                              '<p>' + data.description + '</p>' +
                                            '</div>' +
                                          '</div>';

                                          $('#loader_' + tab.id).html(prev);
                                          console.log('render = ' + data.description + ' ');
                                      }      
                                },
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
  $('#id_url_' + tab.id).trigger('preview');
}

// Bring the selected tab to the front
function showTab(origWindow, windowId, tabId) {
  // TODO: Bring the window to the front.  (See http://crbug.com/31434)
  //chrome.windows.update(windowId, {focused: true});
  chrome.tabs.update(tabId, { selected: true });
  origWindow.close();
}

// Kick things off.
document.addEventListener('DOMContentLoaded', init);

chrome.browserAction.onClicked.addListener(function(tab) {
    //var imported = document.createElement('script');
    //imported.src = '/path/to/imported/script';
    //document.head.appendChild(imported);

    chrome.tabs.query({currentWindow: true}, function(tabs) {
        var has = false;
        var curTabId;
        console.log('URL= ' + chrome.extension.getURL("index.html"));
        tabs.forEach(function(tab) {
            
            if( tab.url == chrome.extension.getURL("index.html")) {
                console.log('URL= ' + tab.url);
                has = true;
                curTabId = tab.id;
            }
        });
        if(!has){
            chrome.tabs.create({index: 0, url:chrome.extension.getURL("index.html")});
            //console.log('URL= ' + chrome.extension.getURL("index.html"));
        }
        else
            chrome.tabs.update(curTabId, { selected: true });
            
    });
  
});
