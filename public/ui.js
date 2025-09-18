/**
 * Copyright (c) 2025 Fabio Vitali
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

import { $, $$, $$$ } from './utils.js';
import { setGlobals, getGlobals, query, update } from './main.js';
import { formatLabels, parseLabels, parsePrefixes, formatPrefixes, filterAndSort, groupData } from './app.js';


/**
 * Sets up all event listeners for the application
 */
export function setupListeners() {
  $("#queryTextarea").addEventListener("change", handleQueryInput);
  $("#updateTextarea").addEventListener("change", handleUpdateInput);
  $("#prefixesModalClose").addEventListener("click", handlePrefixesInput);
  $("#labelsModalClose").addEventListener("click", handleLabelsInput);

  $("#renderStyleSlider").addEventListener("input", handleRenderStyleSliderChange);
  $("#filterSlider").addEventListener("input", handleFilterSliderChange);
  
  // Listen for the custom event from fv-sparql components
  document.addEventListener("clearDatasetChange", handleClearDatasetCheckbox);
  
  $("#queryButton").addEventListener("click", handleQueryButtonClick);
  $("#updateButton").addEventListener("click", handleUpdateButtonClick);
  $("#undoButton").addEventListener("click", undo);
  $('#bindingsContent').addEventListener('click', sortTable) 
}


/**
 * Updates the UI based on global variables
 * @param {Array<string>} [elements=[]] - Array of specific elements to update. If empty, updates all elements
 */
export function updateUI(elements = []) {
  if (!!getGlobals('isError')) {
    updateRawOutput(true);
    updateBindingsTable(true);
    updateGroupedBindings(true);
    return    
  }
	if (elements.length === 0 || elements.includes("prefixes")) updatePrefixesTextarea();
	if (elements.length === 0 || elements.includes("labels")) updateLabelsTextarea();
	if (elements.length === 0 || elements.includes("query")) updateQueryTextarea();
  if (elements.length === 0 || elements.includes("slider")) updateSliders();
	if (elements.length === 0 ) updateFooter();
	if (elements.length === 0 ) updateInfoAccordion();
	if (elements.length === 0 ) updateExamplesList();
  updateRawOutput(false);
  updateBindingsTable(false);
  updateGroupedBindings(false);
}

/**
 * Handles modal focus management - removes focus from modal elements when hidden
 */
document.addEventListener('DOMContentLoaded', function() {
  // Handle modal focus
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
      modal.addEventListener('hidden.bs.modal', function() {
          // Remove focus from any focused element inside the modal
          const focusedElement = modal.querySelector(':focus');
          if (focusedElement) {
              focusedElement.blur();
          }
      });
  });
});

/**
 * Handles query textarea input changes
 * @param {Event} event - Input change event
 */
function handleQueryInput(event) {
  setGlobals({ query: event.target.value });
  updateUI(["query"]);
}

/**
 * Handles update textarea input changes
 * @param {Event} event - Input change event
 */
function handleUpdateInput(event) {
  setGlobals({ update: event.target.value });
  updateUI(["update"]);
}

/**
 * Handles query button click - executes SPARQL query
 */
async function handleQueryButtonClick() {
  await query();
  updateUI()
}

/**
 * Handles update button click - executes SPARQL update
 */
async function handleUpdateButtonClick() {
  await update();
  updateUI(["rawOutput", "bindings", "groupedBindings"]);
  $('#grouped-bindings-tab-button').click(); 
}

/**
 * Handles prefixes modal close - parses and saves prefix definitions
 */
function handlePrefixesInput() {
  const prefixes = parsePrefixes($("#prefixesTextarea").value);
  setGlobals({ prefixes });
  updateUI(["prefixes"]);
}

/**
 * Handles labels modal close - parses and saves label definitions
 */
function handleLabelsInput() {
  const labels = parseLabels($("#labelsTextarea").value);
  setGlobals({ labels });
  updateUI(["labels"]);
}

/**
 * Handles clear dataset checkbox changes - syncs all checkboxes
 * @param {Event} e - Change event from checkbox
 */
function handleClearDatasetCheckbox(e) {
  const clearDataset = e.detail ? e.detail.checked : e.target.checked;
  
  setGlobals({ clearDataset });
  
  const checkboxes = $$$('.clearDatasetCheckbox'); 
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = clearDataset;
  });
}

/**
 * Updates the prefixes textarea with current prefix definitions
 */
function updatePrefixesTextarea(error) {
  if(error) return
  const prefixes = getGlobals("prefixes") || {};
  const formattedPrefixes = formatPrefixes(prefixes);
  $("#prefixesTextarea").value = formattedPrefixes;
}

/**
 * Updates the labels textarea with current label definitions
 */
function updateLabelsTextarea(error) {
  if(error) return
  const labels = getGlobals("labels") || {};
  const formattedLabels = formatLabels(labels);
  $("#labelsTextarea").value = formattedLabels;
}

/**
 * Updates the query textarea with current query text
 */
function updateQueryTextarea(error) {
  if (error) return
  $("#queryTextarea").value = getGlobals("query") || "";
}

/**
 * Updates the footer text content
 */
async function updateFooter(error) {
  if (error) return
    $("#footerText").innerHTML = CONFIG.FOOTER || "";
  }

/**
 * Updates the info accordion content
 */
async function updateInfoAccordion(error) {
  if (error) return
    $("#infoContent").innerHTML = getGlobals("info") || "";
}
  
/**
 * Updates the examples list content
 */
async function updateExamplesList(error) {
  if (error) return
  $("#examplesContent").innerHTML = getGlobals("examples") || "";
}

function updateRawOutput(error) {
  if (error) {
    const data = getGlobals("error");
    const template = Handlebars.compile($("#errorTemplate").innerHTML);
    $$$('.explanation').forEach(i => i.style.display = "none");
    $("#rawOutput").innerHTML = template(data);
    $("#rawOutput").classList.add("error");
  } else {
    const bindings = getGlobals("bindings");
    const rawOutput = JSON.stringify(bindings,null, 2) ;
    $("#rawOutput").textContent = bindings.length > 0 ? rawOutput : "";
    $("#rawOutput").classList.remove("error");
  }
}


function updateBindingsTable(error) {
  if (error) {
    let data = getGlobals("error");
    const template = Handlebars.compile($("#errorTemplate").innerHTML);
    $$$('.explanation').forEach(i => i.style.display = "none");
    $("#bindingsContent").innerHTML = template(data);
  } else {
    const template = Handlebars.compile($("#bindingsTableTemplate").innerHTML);
    let data = getGlobals("filtered");
    let total = getGlobals("bindings").length;
    if (data?.length > 0) {
      $$$('.explanation').forEach(i => i.style.display = "auto");
      $("#bindingsContent").innerHTML = template({
        headers: Object.keys(data[0]), 
        rows: data,
        total:total,
        filtered:data.length
      });
    }
  }
}

function updateGroupedBindings(error) {
  if (error) {
    let data = getGlobals("error");
    const template = Handlebars.compile($("#errorTemplate").innerHTML);
    $$$('.explanation').forEach(i => i.style.display = "none");
    $("#groupedBindingsContent").innerHTML = template(data);
  } else {
    const template = Handlebars.compile($("#groupedBindingsTemplate").innerHTML);
    let data = getGlobals("filtered");
    let total = getGlobals("bindings").length;
    if (data?.length > 0) {
      const groupedData = groupData(data);
      let groupCount = Object.keys(groupedData).length;
      $$$('.explanation').forEach(i => i.style.display = "auto")  ;
      $("#groupedBindingsContent").innerHTML = template({groups: groupedData, total:total, filtered:data.length, groupCount:groupCount});
    }
  }
}

/**
 * Appends data to update textarea and opens add data section
 * @param {string} data - SPARQL data to append
 * @param {HTMLElement} expect - Expected result element
 */
export function appendData(data, expect) {
  const currentTextareaValue = $("#updateTextarea").value;
  if (currentTextareaValue!==data) {
    setGlobals({ undoValue: currentTextareaValue });
    setGlobals({ update: data });
    $("#updateTextarea").value = data;
    $("#undoButton").disabled = false;
  }
  $('#addDataButton').click();
}

/**
 * Starts a query with provided data and updates explanation
 * @param {string} data - SPARQL data to query
 * @param {HTMLElement} expect - Expected result element
 */
export function startQuery(data, expect) {
  const currentTextareaValue = $("#updateTextarea").value;
  if (currentTextareaValue!==data) {
    setGlobals({ undoValue: currentTextareaValue });
    setGlobals({ update: data });
    $("#updateTextarea").value = data;
    $("#undoButton").disabled = false;
  }
  $('#updateButton').click();
  $$('.explanation').forEach(i => i.innerHTML = expect?.innerHTML || "")
}

/**
 * Handles clicks on code elements - appends code to update textarea
 * @param {Event} event - Click event
 */
export function handleCodeClick(event) {
    const target = event.composedPath()[0];
    const sparql = event.composedPath()[4];
    if (target.tagName === 'PRE' || target.tagName === 'CODE') {
        appendData(target.textContent, sparql?.querySelector(".expect"));
        event.stopPropagation();
        event.preventDefault();
    }
}

/**
 * Undoes the last update textarea change
 */
export function undo() {
  const undoValue = getGlobals("undoValue");
  const currentTextareaValue = $("#updateTextarea").value;
  setGlobals({ undoValue: currentTextareaValue });
  $("#updateTextarea").value = undoValue;
}
  
/**
 * Handles render style slider changes
 * @param {Event} e - Input change event
 */
 function handleRenderStyleSliderChange(e) {
    const value = e.target.value;
    updateSliders({renderStyle: value});
};

/**
 * Handles filter slider changes
 * @param {Event} e - Input change event
 */
function handleFilterSliderChange(e) {
  const value = e.target.value;
  updateSliders({filter: value});
}

/**
 * Updates slider positions and applies filtering/rendering changes
 * @param {Object} config - Configuration object with renderStyle and/or filter properties
 */
function updateSliders(config) {
  const renderStyle = config?.renderStyle ? config.renderStyle : getGlobals("renderStyle");
  const filter = config?.filter ? config.filter : getGlobals("filter");

  $("#groupedBindingsContent").className = "";
  $("#groupedBindingsContent").classList.add("filter"+filter, "render"+renderStyle);

  const trackStylePosition = (renderStyle * 50);
  const trackFilterPosition = (filter * 50);

  $("#renderStyleSlider").value = renderStyle;
  $("#filterSlider").value = filter;

  $("#renderStyleSlider").style.setProperty('--track-position', `${trackStylePosition}%`);
  $("#filterSlider").style.setProperty('--track-position', `${trackFilterPosition}%`);
      
    setGlobals({ 
      renderStyle: renderStyle, 
      filter: filter
    });
    const filtered = filterAndSort(
      getGlobals("bindings"), 
      getGlobals("filter"), 
      getGlobals("sort")?.field || "s", 
      getGlobals("sort")?.direction || "asc"
    );
    setGlobals({ filtered: filtered });
    updateUI(["bindings", "groupedBindings"]);
}

/**
 * Handles table sorting by column headers
 * @param {Event} e - Click event on table header
 */
export function sortTable(e) {
  const currentSort = getGlobals("sort");
  const newSort = e.target.innerText;
  if (newSort === currentSort.field) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort.field = newSort;
    currentSort.direction = "asc";
  }
  setGlobals({ sort: currentSort });
  const filtered = filterAndSort(getGlobals("bindings"), getGlobals("filter"), getGlobals("sort").field, getGlobals("sort").direction);
  setGlobals({ filtered: filtered });
  updateUI(["bindings", "groupedBindings"]);  
}

