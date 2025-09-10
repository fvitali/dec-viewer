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

import { getGlobals, setGlobals } from './main.js';
import { appendData, startQuery } from './ui.js';
import { p } from './utils.js';


/**
 * Analyzes SPARQL bindings to extract DEC-related metadata
 * @param {Array<Object>} bindings - Array of SPARQL binding objects
 * @returns {Object} Object containing analyzed data with headers, rows, decTypes, shared, labels, and decPredicates
 */
export function analyzeBindings(bindings) {
    const rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    const decNamespace = "http://w3id.org/conjectures/";
    let decTypes = {};
    let URIsForShared = [];
    let shared = [];
    let labels = {}
    let decPredicates = {};

    bindings.forEach(b => {
        if (b.p.value === rdfType && b.o.value.startsWith(decNamespace)) {
            const type = b.o.value.split("/").pop();
            if (!decTypes[b.s.value]) decTypes[b.s.value] = [];
            decTypes[b.s.value].push(type);
            if (type === "sharedWorld") {
                URIsForShared.push(b.s.value);
            }
        }
        if (b.p.value === "http://www.w3.org/2000/01/rdf-schema#label" && typeof b.o.value === 'string') {
            labels[b.s.value] = b.o.value;
        }
        if (typeof b.o.value === 'string' && b.o.value.startsWith(decNamespace)) {
            const decType = b.o.value.split("/").pop();
            decPredicates[b.s.value] = decType;
        }
        if (typeof b.s.value === 'string' && b.s.value.startsWith(decNamespace)) {
            const decType = b.s.value.split("/").pop();
            decPredicates[b.o.value] = decType;
        }
        
    });

    bindings.forEach(b => {
        if (URIsForShared.includes(b.graph.value)) {
            shared.push(b);
        }
    });

    bindings.forEach(b => {
        b.dec = [];
        if (schemaStatement(b)) {
            b.dec.push('schema');
        }
        if (shared.some(s => 
            s.s.value === b.s.value && 
            s.p.value === b.p.value && 
            s.o.value === b.o.value && 
            s.graph.value !== b.graph.value
        )) {
            b.dec.push('sharedWorld');
        }
      if (decTypes[b.graph.value]) {
            b.dec.push(decTypes[b.graph.value]);
      }
    });

    return { 
        headers: ['s', 'p', 'o', 'graph'], 
        rows: bindings, 
        decTypes: decTypes, 
        shared: shared,
        labels: labels,
        decPredicates: decPredicates
    };
}

/**
 * Groups SPARQL data by graph and organizes content hierarchically
 * @param {Array<Object>} data - Array of SPARQL binding objects
 * @returns {Object} Grouped data structure organized by graph with meta and content sections
 */
export function groupData(data) {
  const groups = {};
  const decTypes = getGlobals("decTypes");
  const shared = getGlobals("shared");
  const decPredicates = getGlobals("decPredicates");
  const allWorlds = Array.from(new Set(data.map(b => b.graph?.value).filter(Boolean)));

  data.forEach(b => {
    let g = b.graph?.value || "<default>";
    let s = b.s.value;
    let p = b.p.value;
    let o = b.o.value;
    const isADecStatement = 
        typeof p ==='string' && p.match(/^http:\/\/w3id\.org\/conjectures\//) || 
        typeof s ==='string' && s.match(/^http:\/\/w3id\.org\/conjectures\//) || 
        typeof o ==='string' && o.match(/^http:\/\/w3id\.org\/conjectures\//);
    const isADecWorld = allWorlds.map(i => ((g === "<default>" || 
      g === undefined) && (i==s || i==o) ) ? i : null)
      .filter(x => x !== null)
    if (isADecWorld.length > 0) {
      const v = isADecWorld.find(i => i==s) || isADecWorld[0]
      groups[v] = groups[v] || {meta: {}, dec:new Set(), content:{}} 
      groups[v]['meta'][s] = groups[v]['meta'][s]  || {}
      groups[v]['meta'][s][p] = groups[v]['meta'][s][p] || {v:[]}
      groups[v]['meta'][s][p].v.push({ v: o})
    } else if (isADecStatement) {
      groups['decStatements'] = groups['decStatements'] || {meta: {}, dec:new Set(), content:{}} 
      groups['decStatements']['content'][s] = groups['decStatements']['content'][s]  || {dec:new Set()}
      groups['decStatements']['content'][s][p] = groups['decStatements']['content'][s][p] || {v:[], dec:new Set()}
      const v = { v: o, dec: new Set()}
      groups['decStatements']['content'][s][p].v.push(v)
      if (decPredicates[p]) {
        v.dec.add(decPredicates[p]);
      }
    } else {
      groups[g] = groups[g] || {meta: {}, dec:new Set(), content:{}} 
      if (typeof s === 'object') {
        s = "<<" + s.subject.value + " " + s.predicate.value + " " + s.object.value + ">>";
      }
      groups[g]['content'][s] = groups[g]['content'][s]  || {dec:new Set()}
      groups[g]['content'][s][p] = groups[g]['content'][s][p] || {v:[], dec:new Set()}
      const v = { v: o, dec: new Set()}
      groups[g]['content'][s][p].v.push(v)
      if (decPredicates[p]) {
        v.dec.add(decPredicates[p]);
      }
      if (shared.some(x => x.s.value === s && x.p.value === p && x.o.value === o)) {
        v.dec.add("sharedWorld");
        if (groups[g].dec.size == 0) {
          groups[g].dec.add("sharedWorld");
        }
        if (groups[g]['content'][s].dec.size == 0) {
          groups[g]['content'][s].dec.add("sharedWorld");
        }
        if (groups[g]['content'][s][p].dec.size == 0) {
          groups[g]['content'][s][p].dec.add("sharedWorld");
        }
      }  else {
          groups[g].dec.clear();
          groups[g]['content'][s].dec.clear();
          groups[g]['content'][s][p].dec.clear();
          decTypes[g]?.forEach( i => groups[g].dec.add(i) )
      }
    }
  });
  return groups ; 
}

/**
 * Filters and sorts SPARQL binding data based on criteria
 * @param {Array<Object>} data - Array of SPARQL binding objects to filter and sort
 * @param {string} filter - Filter criteria ("1" filters schema, "2" filters schema and shared)
 * @param {string} sortField - Field name to sort by
 * @param {string} direction - Sort direction ("asc" or "desc")
 * @returns {Array<Object>} Filtered and sorted array of bindings
 */
export function filterAndSort(data, filter, sortField, direction) {
  if (data.length === 0) return  [];
  let rows = []
  data.forEach(row => {
    if (filter === "1" && row["dec"].includes("schema")) return; // filter schema
    if (filter === "2" && row["dec"].includes("schema")) return; // filter shared
    if (filter === "2" && row["dec"].includes("sharedWorld")) return; // filter shared
    rows.push(row);
  });
  rows.sort((a, b) => { 
    if (direction === "asc") return a[sortField]?.value < b[sortField]?.value ? -1 : 1;
    if (direction === "desc") return b[sortField]?.value < a[sortField]?.value ? -1 : 1;
  });
  return rows
}


/**
 * Determines if a SPARQL binding represents a schema statement
 * @param {Object} binding - SPARQL binding object with graph, s, p, o properties
 * @returns {boolean} True if the binding matches schema patterns and not exceptions
 */
function schemaStatement(binding) {
  const patterns = [
      "* http://www.w3.org/2002/07/owl# * *",
      "* http://www.w3.org/1999/02/22-rdf-syntax-ns# * *",
      "* http://www.w3.org/2000/01/rdf-schema# * *",
      "* http://www.w3.org/2001/XMLSchema# * *",
      "* urn:x-hp-jena:rubrik/ * *",
      "* x * x",
      "* * * http://www.w3.org/2000/01/rdf-schema#Class",
      "* * * http://www.w3.org/2002/07/owl#Class",
      "* * * http://www.w3.org/2000/01/rdf-schema#Resource",
      "* * * http://www.w3.org/2002/07/owl#Thing",
      "* * * http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
  ];

  const exceptions = [
      "* * http://w3id.org/conjectures/closedFor *",
  ];

  const match = (value, pattern, xYMap) => {
      if (pattern === "*") return true;
      if (["x", "y"].includes(pattern)) {
          if (xYMap[pattern] === undefined) {
              xYMap[pattern] = value;
              return true;
          }
          return xYMap[pattern] === value;
      }
      return typeof value === 'string' && value.startsWith(pattern);
  };

  const matchesPattern = (valuesArray, patternsArray) => {
      return patternsArray.some((pattern) => {
          const [graphPattern, sPattern, pPattern, oPattern] = pattern.split(" ");
          const patterns = [graphPattern, sPattern, pPattern, oPattern];
          const xYMap = { x: undefined, y: undefined };
          return patterns.every((pattern, index) => match(valuesArray[index], pattern, xYMap));
      });
  };

  const getBindingValues = (binding) => {
      const graph = binding.graph?.value || "";
      let s = binding.s?.value || "";
      const p = binding.p?.value || "";
      let o = binding.o?.value || "";

      // Handle nested triples in subject position
      if (typeof binding.s?.value === 'object') {
          const sTriple = binding.s.value;
          const sValues = [graph, sTriple.subject.value, sTriple.predicate.value, sTriple.object.value];
          if (!matchesPattern(sValues, exceptions) && matchesPattern(sValues, patterns)) {
              return { earlyReturn: true }; // Triple matches patterns and not exceptions - return true
          }
      }

      // Handle nested triples in object position  
      if (typeof binding.o?.value === 'object') {
          const oTriple = binding.o.value;
          const oValues = [graph, oTriple.subject.value, oTriple.predicate.value, oTriple.object.value];
          if (!matchesPattern(oValues, exceptions) && matchesPattern(oValues, patterns)) {
              return { earlyReturn: true }; // Triple matches patterns and not exceptions - return true
          }
      }

      return [graph, s, p, o];
  };

  const values = getBindingValues(binding);
  if (values && values.earlyReturn) return true; // Nested triple matched patterns
  
  if (matchesPattern(values, exceptions)) return false;
  return matchesPattern(values, patterns);
}

/**
 * Replaces URIs with prefixes for more readable display
 * @param {string|Object} value - URI string or object containing URIs
 * @returns {string|Array} Value with URIs replaced by prefixes, or array for objects
 */
function usePrefixes(value) {
  if (value == undefined) return "";
  if (typeof value == 'object') {
    return Object.entries(value).map(([key, val]) => [key, usePrefixes(val.value)]);
  } else {
    const prefixes = getGlobals("prefixes") || {};

    for (const [prefix, uri] of Object.entries(prefixes)) {
        value = value.replaceAll("/​", "/").replaceAll(uri, `${prefix}:`).replaceAll('<empty>','').replaceAll("/", "/​");
    }
//    return value;
    return value.replaceAll("/", "/​");
  }
}


/**
 * Creates human-readable labels from URIs or values
 * @param {string|Object} value - URI string or object containing URIs
 * @returns {string|Array} Human-readable label or array for objects
 */
function createLabel(value) {
  if (value == undefined) return "";
  let vals = value.replace(/<<( *)/g, '" ').replace(/( *)>>/g, ' "').split(/ +/);
  let result = vals.map(val => {
    if (typeof val == 'object') {
      return Object.entries(val).map(([key, val]) => [key, createLabel(val.value)]);
    } else {
      const labels = getGlobals('labels'); 
      if (labels[val]) return labels[val] ;

      const lastSegment = val.split(/[:/#]/).pop();
      const words = lastSegment.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      let a = words.split(' ').map(word => (word.charAt(0).toUpperCase() + word.slice(1))).join(' ');
      return a;
    }
  }).join(' ');
  return result;
  /*
  if (typeof value == 'object') {
    return Object.entries(value).map(([key, val]) => [key, createLabel(val.value)]);
  } else {
    const labels = getGlobals('labels'); 
    if (labels[value]) return labels[value] ;
    
    const lastSegment = value.split(/[:/#]/).pop();
    const words = lastSegment.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return words.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
    */
}

/**
 * Parses label definitions from text format
 * @param {string} text - Text containing label definitions in format "URI 'label'"
 * @returns {Object} Object mapping URIs to labels
 */
export function parseLabels(text) {
  const labels = {};
  text.split("\n").forEach((line) => {
    const match = line.match(/^(\S+)\s+["']([^"']+)["']$/);
    if (match) {
      const [_, uri, label] = match;
      labels[uri] = label;
    }
  });
  return labels;
}

/**
 * Parses prefix definitions from text format
 * @param {string} prefixes - Text containing prefix definitions in format "prefix URI"
 * @returns {Object} Object mapping prefixes to URIs
 */
export function parsePrefixes(prefixes) {
    const lines = prefixes.split("\n"); // Split the text into lines
    const result = {};
  
    lines.forEach((line) => {
      const [key, value] = line.trim().split(/\s+/); // Split each line by whitespace
      if (key && value) {
        result[key] = value; // Add the key-value pair to the result object
      }
    });
  
    return result;
  }
  /**
   * Formats prefix object into text representation
   * @param {Object} prefixes - Object mapping prefixes to URIs
   * @returns {string} Text representation in format "prefix URI"
   */
  export function formatPrefixes(prefixes) {
    return Object.entries(prefixes)
      .map(([prefix, uri]) => `${prefix} ${uri}`)
      .join("\n");
  }
  /**
   * Formats prefix object into SPARQL PREFIX declarations
   * @param {Object} prefixes - Object mapping prefixes to URIs
   * @returns {string} SPARQL PREFIX declarations
   */
  export function formatPrefixesInSparql(prefixes) {
    return Object.entries(prefixes)
      .map(([prefix, uri]) => `PREFIX ${prefix=='<empty>'?'':prefix}: <${uri}>`)
      .join("\n");
  }
  
/**
 * Formats labels object into text representation
 * @param {Object} labels - Object mapping URIs to labels
 * @returns {string} Text representation in format 'URI "label"'
 */
export function formatLabels(labels) {
  return Object.entries(labels)
    .map(([uri, label]) => `${uri} "${label}"`)
    .join("\n");
}

  Handlebars.registerHelper("count", (value) => {
    let count = 0;
    function countLeaves(obj) {
      if (!obj) return;
      if (obj.v && Array.isArray(obj.v)) {
        count += obj.v.length;
      }
      Object.values(obj).forEach(val => {
        if (typeof val === 'object') countLeaves(val);
      });
    }
    countLeaves(value.content);
    return count;
  });
  Handlebars.registerHelper("join", (value) => value.join(" ")) ;
  Handlebars.registerHelper("addOne", (value) => value + 1) ;
  Handlebars.registerHelper('hasItems', function(obj) { return obj && Object.keys(obj).length > 0; });
  Handlebars.registerHelper("eq", function(a, b) { return a === b ; });
  Handlebars.registerHelper("neq", function(a, b) { return a !== b ; });
  Handlebars.registerHelper("typeof", function(value) { return typeof value; });
  Handlebars.registerHelper('allValues', function(v) {
    if (!v) return "";
    return Array.from(v).join(" ");
  });
  Handlebars.registerHelper('render', function(value) {
    const style = getGlobals('renderStyle') || "0"; // full 
    let result = value;
    switch(style) {
        case "1":  // prefixes 
          result = usePrefixes(value); break;
        case "2":  // labels 
          result = createLabel(value); break;
        default: 
          result = value;
    }
    return result;
  });

  Handlebars.registerHelper('eachSorted', function(obj, options) {
    const array = Object.keys(obj);
    const sorted = array.sort((a, b) => {
        // Get dec property for comparison
        const getDecProp = (key) => obj[key]?.dec || new Set();
        const aDecProp = getDecProp(a);
        const bDecProp = getDecProp(b);
        
        // Define sorting order
        const getSortOrder = (key, decProp) => {
            if (key === "<default>") return 0;
            if (decProp.has("epistemicWorld") ) return 1;
            if (decProp.has("conjecturalWorld")) return 2;
            if (decProp.has("doxasticWorld") && !decProp.has("delusionalWorld")) return 3;
            if (decProp.has("doxasticWorld") && decProp.has("delusionalWorld")) return 4;
            if (decProp.has("verbatimWorld")) return 5;
            if (decProp.has("sharedWorld")) return 6;
            if (key === "decStatements") return 7;
            return 8; // fallback for other items
        };
        
        const aOrder = getSortOrder(a, aDecProp);
        const bOrder = getSortOrder(b, bDecProp);
        
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }
        
        // If same order, sort alphabetically
        return a.localeCompare(b);
    });
    return sorted.map((key, index) => options.fn(obj[key], { data: { index, key } })).join('');
}); 



/**
 * Custom HTML element for collapsible sections
 * @extends HTMLElement
 */
class CollapseElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
//        this.addEventListener('click', handleCodeClick);
    }

    connectedCallback() {
        const id = this.getAttribute('id');
        const heading = this.getAttribute('heading');
        const content = this.innerHTML;
        const isCollapsed = this.hasAttribute('collapsed');

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="viewer.css">
            <section id="${id}-section" class="collapse-section">
                <h3 class="inner-collapse-header">
                    <a type="button" 
                       class="collapse-toggle ${isCollapsed ? 'collapsed' : ''}"
                       aria-expanded="${!isCollapsed}">
                        ${heading}
                    </a>
                </h3>
                <div id="${id}-body" class="collapse ${!isCollapsed ? 'show' : ''}">
                    ${content}
                </div>
            </section>
        `;

        // Add click handler for the toggle
        const toggle = this.shadowRoot.querySelector('.collapse-toggle');
        const target = this.shadowRoot.querySelector(`#${id}-body`);

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isCollapsed = toggle.classList.contains('collapsed');
            
            if (isCollapsed) {
                target.classList.add('show');
                toggle.classList.remove('collapsed');
                toggle.setAttribute('aria-expanded', 'true');
            } else {
                target.classList.remove('show');
                toggle.classList.add('collapsed');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
}
customElements.define('fv-collapse', CollapseElement);

/**
 * Custom HTML element for SPARQL code blocks with Try/Edit buttons
 * @extends HTMLElement
 */
class FvSparql extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const content = this.innerHTML;
        const clearDataset = getGlobals("clearDataset");
        this.shadowRoot.innerHTML = `
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
            <link rel="stylesheet" href="viewer.css">
            <div class="sparql" id="sparql-${this.parentElement.id}" style="position: relative;">
                <div class="sparql-buttons" style="position: sticky; top: 0; right: 0; z-index: 1000; display: flex; flex-direction: column; gap: 2px; float: right;">
                    <button class="btn btn-sm btn-outline-primary try-button" type="button" style="font-size: 0.7rem; padding: 2px 6px;">
                        Try
                    </button>
                    <button class="btn btn-sm btn-outline-secondary edit-button" type="button" style="font-size: 0.7rem; padding: 2px 6px;">
                        Edit
                    </button>
                </div>
                <pre>${content}</pre>
            </div>
        `;

        const tryButton = this.shadowRoot.querySelector('.try-button');
        tryButton.addEventListener('click', (e) => {
            e.preventDefault();
            const preElement = this.shadowRoot.querySelector('pre');
            const data = preElement ? preElement.textContent.trim() : '';
            const expectDiv = this.parentElement.querySelector('.expect');
            startQuery(data, expectDiv);
        });

        const editButton = this.shadowRoot.querySelector('.edit-button');
        editButton.addEventListener('click', (e) => {
            e.preventDefault();
            const preElement = this.shadowRoot.querySelector('pre');
            const data = preElement ? preElement.textContent.trim() : '';
            const expectDiv = this.parentElement.querySelector('.expect');
            appendData(data, expectDiv);
        });
    }
}
customElements.define('fv-sparql', FvSparql);

Handlebars.registerHelper('renderValue', function(value) {
  if (typeof value === 'string') {
    return `<span class="object">${createLabel(value)}</span>`;
  } else if (typeof value === 'object' && value !== null) {
    return `<span class="triple">
      <span class="subject">${createLabel(value.subject?.value || value.subject || '')}</span>
      <span class="predicate">${createLabel(value.predicate?.value || value.predicate || '')}</span>
      <span class="object">${createLabel(value.object?.value || value.object || '')}</span>
    </span>`;
  } else {
    return `<span class="object">${createLabel(value)}</span>`;
  }
});


