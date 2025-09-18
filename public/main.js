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

import { updateUI, setupListeners, sortTable } from './ui.js';
import { parsePrefixes, formatPrefixesInSparql, analyzeBindings, filterAndSort } from './app.js';
export { sortTable } from './ui.js';

/**
 * Initialize Application - sets up event listeners and loads initial data
 */
document.addEventListener("DOMContentLoaded", init);

/**
 * Initializes the application by loading settings, setting up listeners, and updating UI
 */
async function init() {
  // Load default settings first
  await setDefaultSettings();

  // Merge with saved settings from localStorage if they exist
  const savedSettings = JSON.parse(localStorage.getItem(CONFIG.NAME));
  if (savedSettings) {
    const currentGlobals = getGlobals();

    const mergedPrefixes = {...currentGlobals.prefixes, ...savedSettings.prefixes};
    const mergedLabels = { ...currentGlobals.labels, ...savedSettings.labels };

    setGlobals({
      ...currentGlobals,
      ...savedSettings,
      prefixes: mergedPrefixes,
      labels: mergedLabels,
    });
  }

  setupListeners();
  updateUI();
}

/**
 * Executes a SPARQL query against the server
 * @returns {Object|boolean} Query results object or false on error
 */
export async function query() {
  const prefixes = formatPrefixesInSparql(getGlobals('prefixes'))
  const queryText = getGlobals("query");
  const payload = [prefixes, queryText].join('\n')


  try {
    const response = await fetch(CONFIG.SERVER+"sparql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: payload.trim() }),
    });

    if (!response.ok) throw new Error("Query failed");
    const data = await response.json();
    const bindings = analyzeBindings(data.head.vars, data.results.bindings);
    const filtered = filterAndSort(bindings.rows, getGlobals("filter"), getGlobals("sort").field, getGlobals("sort").direction);
    setGlobals({ 
        bindings: bindings.rows,
        filtered: filtered,
        labels: bindings.labels,  
        isError: false, 
        decTypes: bindings.decTypes,
        shared: bindings.shared
    });
    return bindings;
  } catch (error) {
    console.log(error);
    setGlobals({
      bindings: {},
      isError: true,
      error: error
    });
    return false; 
  }
}

/**
 * Executes a SPARQL update operation against the server
 * @returns {Object|boolean} Update results object or false on error
 */
export async function update() {
  const prefixes = formatPrefixesInSparql(getGlobals('prefixes'))
  const updateText = getGlobals("update");
  const payload = [prefixes, "INSERT DATA {", updateText, "}"].join('\n')


  try {
    const response = await fetch(CONFIG.SERVER+'update', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
      	update: payload.trim(), 
      	clearDataset: getGlobals("clearDataset") 
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    const bindings = analyzeBindings(data.head.vars, data.results.bindings);
    const filtered = filterAndSort(bindings.rows, getGlobals("filter"), getGlobals("sort").field, getGlobals("sort").direction);
    setGlobals({ 
        bindings: bindings.rows,
        filtered: filtered,
        labels: bindings.labels, 
        isError: false, 
        decTypes: bindings.decTypes,
        decPredicates: bindings.decPredicates,
        shared: bindings.shared
    });
    return bindings;
  } catch (error) {
    console.log(error);
    setGlobals({
      bindings: {},
      isError: true,
      error: error
    });
    return false; 
  }
}

/**
 * Updates global variables and saves settings to localStorage
 * @param {Object} updates - Object containing key-value pairs to update
 */
export function setGlobals(updates) {
  // Do not place bindings in saved settings
    if (updates && updates.hasOwnProperty("bindings")) {
      window.bindings = updates.bindings;
      delete updates.bindings;
    }
  // Do not place filtered in saved settings
  if (updates && updates.hasOwnProperty("filtered")) {
    window.filtered = updates.filtered;
    delete updates.filtered;
  }
  const keys = Object.keys(updates);
  keys.forEach(key => {
    if (Array.isArray(updates[key])) {
        globals[key] = [...(globals[key] || []), ...updates[key]];
    } else if (typeof globals[key] === 'object' && typeof updates[key] === 'object') {
        globals[key] = { ...globals[key], ...updates[key] };
    } else {
        globals[key] = updates[key];
    }
  });
  // Object.assign(globals, updates);
    saveSettings();
  }

/**
 * Retrieves a global variable value
 * @param {string} [key] - Key of the global variable to retrieve. If not provided, returns all globals
 * @returns {*} The value of the requested global variable or all globals object
 */
export function getGlobals(key) {
    if (key=="bindings") return window.bindings;
    if (key=="filtered") return window.filtered;
    if (key)
      return window.globals[key] ;
    return window.globals ;
  }

/**
 * Saves selected global settings to localStorage
 */
function saveSettings() {
    const keysToSave = ["query","prefixes","labels", "renderStyle", "filter", "sort","clearDataset"];
    const filteredGlobals = Object.fromEntries(
      Object.entries(globals).filter(([key]) => keysToSave.includes(key))
    );
    localStorage.setItem(CONFIG.NAME, JSON.stringify(filteredGlobals));
  }

/**
 * Sets up default application settings and loads initial resources
 */
async function setDefaultSettings() {
  window.globals = {
    query: CONFIG.DEFAULT_QUERY,
    update:"",
    prefixes: [],
    labels: {},
    isError: false,
    renderStyle: '1',
    filter: '1',
    sort: {field: 's', direction: 'asc'},
    clearDataset: true,
    undoValue: ""
  };
  window.bindings = [];  
//  window.rawOutput = "";

  try {
    const [examplesResponse, infoResponse, prefixesResponse, labelsResponse] = await Promise.all([
      fetch(RESOURCES.EXAMPLES),
      fetch(RESOURCES.INFO),
      fetch(RESOURCES.PREFIXES),
      fetch(RESOURCES.LABELS),
    ]);

    window.globals.info = await infoResponse.text();
    window.globals.examples = await examplesResponse.text();
    window.globals.prefixes = parsePrefixes(await prefixesResponse.text());
    window.globals.labels = await labelsResponse.json();
  } catch (error) {
    console.error("Error loading default resources:", error);
    window.globals.examples = [];
    window.globals.info = "Error loading info.";
    window.globals.prefixes = [];
    window.globals.labels = {};
  }
//  console.log(window.globals);
}
