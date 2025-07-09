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


/** Add Event Listeners */
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


/** Update the UI based on global variables */
export function updateUI(elements = []) {
	const isError = !!getGlobals('isError') ;
	if (elements.length === 0 || elements.includes("prefixes")) updatePrefixesTextarea(isError);
	if (elements.length === 0 || elements.includes("labels")) updateLabelsTextarea(isError);
	if (elements.length === 0 || elements.includes("query")) updateQueryTextarea(isError);
  if (elements.length === 0 || elements.includes("slider")) updateSliders(isError);
	if (elements.length === 0 || elements.includes("rawOutput")) updateRawOutput(isError);
	if (elements.length === 0 || elements.includes("bindings")) updateBindingsTable(isError);
	if (elements.length === 0 || elements.includes("groupedBindings")) updateGroupedBindings(isError);
	if (elements.length === 0 ) updateFooter();
	if (elements.length === 0 ) updateInfoAccordion();
	if (elements.length === 0 ) updateExamplesList();
}

/** XXX Do we still need this?  */
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

/** Event Handlers */
function handleQueryInput(event) {
  setGlobals({ query: event.target.value });
  updateUI(["query"]);
}

function handleUpdateInput(event) {
  setGlobals({ update: event.target.value });
  updateUI(["update"]);
}

async function handleQueryButtonClick() {
  const data = await query();
  updateUI()
}

async function handleUpdateButtonClick() {
  const data = await update();
  updateUI(["rawOutput", "bindings", "groupedBindings"]);
  $('#grouped-bindings-tab-button').click(); 
}

function handlePrefixesInput() {
  const prefixes = parsePrefixes($("#prefixesTextarea").value);
  setGlobals({ prefixes });
  updateUI(["prefixes"]);
}

function handleLabelsInput() {
  const labels = parseLabels($("#labelsTextarea").value);
  setGlobals({ labels });
  updateUI(["labels"]);
}

function handleClearDatasetCheckbox(e) {
  const clearDataset = e.detail ? e.detail.checked : e.target.checked;
  
  setGlobals({ clearDataset });
  
  const checkboxes = $$$('.clearDatasetCheckbox'); 
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = clearDataset;
  });
}

/** UI Update Functions */
function updatePrefixesTextarea() {
  const prefixes = getGlobals("prefixes") || {};
  const formattedPrefixes = formatPrefixes(prefixes);
  $("#prefixesTextarea").value = formattedPrefixes;
}

function updateLabelsTextarea() {
  const labels = getGlobals("labels") || {};
  const formattedLabels = formatLabels(labels);
  $("#labelsTextarea").value = formattedLabels;
}

function updateQueryTextarea() {
  $("#queryTextarea").value = getGlobals("query") || "";
}

async function updateFooter() {
    $("#footerText").innerHTML = CONFIG.FOOTER || "";
  }

async function updateInfoAccordion() {
    $("#infoContent").innerHTML = getGlobals("info") || "";
}
  
async function updateExamplesList() {
  $("#examplesContent").innerHTML = getGlobals("examples") || "";
}

function updateRawOutput(error) {
    const bindings = getGlobals("bindings");
    const rawOutput = JSON.stringify(bindings,null, 2) ;
    $("#rawOutput").textContent = bindings.length > 0 ? rawOutput : "";
    $("#rawOutput").classList.toggle("error", error);
}



function updateBindingsTable(error) {
  if (error) {
    let data = getGlobals("bindings");
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
    let data = getGlobals("bindings");
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

export function appendData(data, expect) {
  const currentTextareaValue = $("#updateTextarea").value;
  if (currentTextareaValue!==data) {
    setGlobals({ undoValue: currentTextareaValue });
    setGlobals({ update: data });
    $("#updateTextarea").value = data;
    $("#undoButton").disabled = false;
  }
//  $('#addDataButton').click();
  $('#updateButton').click();
  $$('.explanation').forEach(i => i.innerHTML = expect?.innerHTML || "")
}

/** Event Handlers */
export function handleCodeClick(event) {
    const target = event.composedPath()[0];
    const sparql = event.composedPath()[4];
    if (target.tagName === 'PRE' || target.tagName === 'CODE') {
        appendData(target.textContent, sparql?.querySelector(".expect"));
        event.stopPropagation();
        event.preventDefault();
    }
}

export function undo() {
  const undoValue = getGlobals("undoValue");
  const currentTextareaValue = $("#updateTextarea").value;
  setGlobals({ undoValue: currentTextareaValue });
  $("#updateTextarea").value = undoValue;
}
  
 function handleRenderStyleSliderChange(e) {
    const value = e.target.value;
    updateSliders({renderStyle: value});
};

function handleFilterSliderChange(e) {
  const value = e.target.value;
  updateSliders({filter: value});
}

function updateSliders(config) {
  const renderStyle = config.renderStyle ? config.renderStyle : getGlobals("renderStyle");
  const filter = config.filter ? config.filter : getGlobals("filter");

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

window.showVideo = function (s) {
	const iframe = document.querySelector('#CigniBalaka-body')
		.shadowRoot.querySelector('#iframe');
	iframe.src = "https://www.youtube.com/embed/" + s;
};
