var rootEntry;
var territories = [];

function main() {
  bindButtons();
  loadPreviousDirectory();
}

function loadPreviousDirectory() {
  chrome.storage.local.get('directory_id', function(localStorage) {
    chrome.fileSystem.restoreEntry(localStorage.directory_id, function(entry) {
      if (entry) {
        chooseDirectory(entry);
      }
    });
  });
}

function bindButtons() {
  $('#btnDirectory').click(clickDirectory);
  $('#btnAddTerritory').click(clickAddTerritory);
}

function clickAddTerritory() {
  prompt({
    message: 'Enter a new territory:',
    fields: [
      {
        name: 'number',
        label: 'Number:',
        required: true,
        value: territories.length + 1
      },
      {
        name: 'name',
        label: 'Name:',
        required: true
      }
    ],
    buttons: ['Add', { label:'Cancel', cancel: true }],
    callback: function(button, fields) {
      if (button == 'Add') {
        var territory = new Territory(fields.number, fields.name, Territory.TYPE_IDS.PHONE);
        territories.push(territory);
        getTerritoryDOM(territory);
      }
    }
  });
}

function clickDirectory() {
  chrome.fileSystem.chooseEntry({type:'openDirectory'}, chooseDirectory);
}

function getTerritoryDOM(territory) {
  dom({
    nodeName: 'div',
    id: 'territory' + territories.indexOf(territory),
    children: [
      {
        nodeName: 'div',
        innerText: territory.name
      }
    ]
  });
}

function chooseDirectory(entry) {
  // See if the following structure exists:
  // - selected_dir/
  //   - history/
  //   - *.terr
  recurseDirectory(entry, function(rootEntries) {
    var hasHistory = rootEntries.some(function(entry) {
      return entry.name == 'history' && entry.isDirectory;
    });

    if (!hasHistory) {
      alert({
        message: "This directory is not yet setup to handle territories.  Would you like to set it up?",
        buttons: ["Yes", "No, Don't Use This Directory"],
        callback: function(answer) {
          if (answer == 'Yes') {
            setupDirectory(entry);
          }
        }
      });
    }
    else {
      useDirectory(entry);
    }
  });
}

function setupDirectory(entry) {
  entry.getDirectory(
    'history',
    {create: true, exclusive: false},
    function(historyEntry) {
      (entry.entries || []).push(historyEntry);
      useDirectory(entry);
      alert('The territory directory was setup successfully.');
    },
    function() {
      console.log('Error:', arguments);
      alert('An error occurred while trying to setup the history directory.');
    });
}

function useDirectory(entry) {
  rootEntry = entry;
  chrome.fileSystem.getDisplayPath(entry, function(path) {
    $('#txtDirectory').val(path);
  });
  chrome.storage.local.set({
    directory_id: chrome.fileSystem.retainEntry(entry)
  });
  $('#territoriesPanel .overlay').hide();
}

/**
 * Recursively retrieves the contents of the specified DirectoryEntry.  All
 * entries are appended to an array assigned to the `entries` key of each
 * DirectoryEntry.
 * @param  {!DirectoryEntry} dirEntry  The DirectoryEntry representing the root
 *     directory for which all entries should be retrieved recursively.
 * @param  {function(Array.<DirectoryEntry,FileEntry>)} callback  Function
 *     called after all descendant directories have been traversed.
 */
function recurseDirectory(dirEntry, callback) {
    var dirsLeft = 1;
    var rootEntries;
    function helper(dirEntry, isRoot) {
        dirEntry.createReader().readEntries(function(entries) {
            dirsLeft--;
            if (isRoot) {
                rootEntries = entries;
            }
            var entriesByName = dirEntry.entriesByName = {};
            (dirEntry.entries = entries).forEach(function(entry) {
                entriesByName[entry.name] = entry;
                if (entry.isDirectory) {
                    dirsLeft++;
                    helper(entry);
                }
            });
            if (!dirsLeft) {
                callback(rootEntries);
            }
        });
    }
    helper(dirEntry, true);
}

function readFileAsText(fileEntry, callback) {
  fileEntry.file(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      callback(e.target.result);
    };
    reader.readAsBinaryString(file);
  });
}

function saveFileAsText(fileEntry, text, callback) {
  // Create a FileWriter object for our FileEntry (log.txt).
  fileEntry.createWriter(function(fileWriter) {
    if (callback) {
      fileWriter.onwriteend = callback;
    }
    fileWriter.write(new Blob([text], {type: 'text/plain'}));
  });
}

function saveAllFiles() {
  try {
    $JS.forOwn(files, function(dict, key) {
      if (key == 'results' || key == 'searches') {
        var entry = dict.entry;
        var rows = dict.rows;
        var text = dictArrayToCSV(rows);
        saveFileAsText(entry, text);
      }
    });
  }
  catch(e) {
    alert(e.message);
    console.log(e);
  }
}

function dictArrayToCSV(arr) {
  // Keep track of all of the different columns.
  var colNameToIndex = {};
  var colNames = [];
  var colCount = 0;
  var rows = arr.map(function(dict, rowIndex) {
    var row = [];
    $JS.forOwn(dict, function(value, colName) {
      if (!$JS.hasOwn(colNameToIndex, colName)) {
        colNames.push(colName);
        colNameToIndex[colName] = colCount++;
      }
      row[colNameToIndex[colName]] = value;
    });
    return row;
  });

  return [colNames].concat(rows).map(function(row) {
    row.length = colCount;
    return row.map(function(value) {
      return /[\r\n,"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
    }).join(',');
  }).join('\n');
}

function alert(options) {
  if ($JS.typeOf(options, 'String')) {
    options = { message: options };
  }
  var msg = options.message;
  var buttons = options.buttons || ['OK'];
  var callback = options.callback;
  var container = $('<div><div class="message" /><hr /><div class="buttons" /></div>')
    .find('.message').text(msg).end()
    .find('.buttons').append(buttons.map(function(button) {
      var label = $JS.typeOf(button, 'String') ? button : (button.label || button.value);
      var value = $JS.typeOf(button, 'String') ? button : (button.value || button.label);
      return $('<button class="blue-button" style="margin: 0 5px;" />').text(label).click(function() {
        $.unblockUI();
        callback && callback(value);
      });
    })).end();
  $.blockUI({
    message: container,
    css: {
      borderRadius: '10px',
      padding: '5px',
      fadeIn: 500,
      fadeOut: 500,
      width: '50%',
      left: '25%'
    }
  });
}

function prompt(options) {
  var idPrefix = ('' + Math.random()).replace(/^0\.?/, '_');
  var msg = options.message;
  var fields = options.fields;
  var buttons = options.buttons || ['OK', 'Cancel'];
  var callback = options.callback;
  var container = $('<form><div class="message" /><hr /><div class="buttons" /></form>')
    .find('.message').each(function() {
      var jqMe = $(this);
      if (msg) {
        jqMe.append($('<div />').text(msg).css({
          fontWeight: 'bold',
          fontSize: '110%'
        }));
      }


      jqMe.append(fields.map(function(field, i) {
        var id = idPrefix + '_' + i;
        var input = {
          nodeName: 'input',
          'type': 'text',
          id: id,
          name: field.name || field.label,
          value: field.value || ''
        };
        if (field.required) {
          input.className = 'required';
        }
        return $JS.dom({
          nodeName: 'div',
          children: [
            {
              nodeName: 'div',
              children: {
                nodeName: 'label',
                htmlFor: id,
                innerText: field.label || field.name
              }
            },
            {
              nodeName: 'div',
              children: input
            }
          ]
        });
      }));
    }).end()
    .find('.buttons').append(buttons.map(function(button) {
      var label = $JS.typeOf(button, 'String') ? button : (button.label || button.value);
      var value = $JS.typeOf(button, 'String') ? button : (button.value || button.label);
      var isCancel = button.cancel;
      return $('<button class="blue-button" style="margin: 0 5px;" />').text(label).click(function() {
        var isMissingSome = container.find('.required').filter(function() {
          var jq = $(this);
          var missing = !jq.val();
          jq[missing ? 'addClass' : 'removeClass']('error');
          return missing;
        }).length;

        if (isCancel || !isMissingSome) {
          $.unblockUI();
          callback && callback(value, container.serializeObject());
        }
      });
    })).css('text-align', 'center').end()
    .css('cursor', 'default');

  $.blockUI({
    message: container,
    css: {
      borderRadius: '10px',
      padding: '5px',
      fadeIn: 500,
      fadeOut: 500,
      width: '70%',
      left: '15%',
      textAlign: 'left'
    }
  });
}

$(main);