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
import { handleCodeClick } from './ui.js';
import { p } from './utils.js';


export function analyzeBindings(bindings) {
    const rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    const decNamespace = "http://dec.fabiovitali.it/";
    let decTypes = {};
    let URIsForShared = [];
    let shared = [];
    let labels = {}
    let decPredicates = {};

    bindings.forEach(b => {
        if (b.p.value === rdfType && b.o.value.startsWith(decNamespace)) {
            const type = b.o.value.split("/").pop();
            decTypes[b.s.value] = type;
            if (type === "sharedUniverse") {
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
            b.dec.push('sharedUniverse');
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

export function groupData(data) {
  const groups = {};
  const decTypes = getGlobals("decTypes");
  const shared = getGlobals("shared");
  const decPredicates = getGlobals("decPredicates");
  const allGraphs = Array.from(new Set(data.map(b => b.graph?.value).filter(Boolean)));

  data.forEach(b => {
    const g = b.graph?.value || "<default>";
    const s = b.s.value;
    const p = b.p.value;
    const o = b.o.value;
    const isDec = allGraphs.map(i => ((g === "<default>" || 
      g === undefined) && (i==s || i==o) ) ? i : null)
      .filter(x => x !== null)
    if (isDec.length > 0) {
      const v = isDec[0]
      groups[v] = groups[v] || {meta: {}, dec:new Set(), content:{}} 
      groups[v]['meta'][s] = groups[v]['meta'][s]  || {}
      groups[v]['meta'][s][p] = groups[v]['meta'][s][p] || {v:[]}
      groups[v]['meta'][s][p].v.push({ v: o})
    } else {
      groups[g] = groups[g] || {meta: {}, dec:new Set(), content:{}} 
      groups[g]['content'][s] = groups[g]['content'][s]  || {dec:new Set()}
      groups[g]['content'][s][p] = groups[g]['content'][s][p] || {v:[], dec:new Set()}
      const v = { v: o, dec: new Set()}
      groups[g]['content'][s][p].v.push(v)
      if (decPredicates[p]) {
        v.dec.add(decPredicates[p]);
      }
      if (shared.some(x => x.s.value === s && x.p.value === p && x.o.value === o)) {
        v.dec.add("sharedUniverse");
        if (groups[g].dec.size == 0) {
          groups[g].dec.add("sharedUniverse");
        }
        if (groups[g]['content'][s].dec.size == 0) {
          groups[g]['content'][s].dec.add("sharedUniverse");
        }
        if (groups[g]['content'][s][p].dec.size == 0) {
          groups[g]['content'][s][p].dec.add("sharedUniverse");
        }
      }  else {
          groups[g].dec.clear();
          groups[g]['content'][s].dec.clear();
          groups[g]['content'][s][p].dec.clear();
          groups[g].dec.add(decTypes[g]);
      }
    }
  });
  return groups ; 
}

export function filterAndSort(data, filter, sortField, direction) {
  if (data.length === 0) return  [];
  let rows = []
  data.forEach(row => {
    if (filter === "1" && row["dec"].includes("schema")) return; // filter schema
    if (filter === "2" && row["dec"].includes("schema")) return; // filter shared
    if (filter === "2" && row["dec"].includes("sharedUniverse")) return; // filter shared
    rows.push(row);
  });
  rows.sort((a, b) => { 
    if (direction === "asc") return a[sortField]?.value < b[sortField]?.value ? -1 : 1;
    if (direction === "desc") return b[sortField]?.value < a[sortField]?.value ? -1 : 1;
  });
  return rows
}

  
function OldgetDecType(binding) {
  const rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  let hasRdfType = false;
  let decStatementValue;

  // First check if it's a schema statement
  if (schemaStatement(binding)) return null;

  // Check for both rdf:type and dec statement
  for (const key in binding) {
      if (binding[key].value === rdfType) {
          hasRdfType = true;
      }
      if (binding[key].value.startsWith("http://dec.fabiovitali.it/")) {
          decStatementValue = binding[key].value.split("/").pop();
      }
  }

  // Only create result if both conditions are met
  if (hasRdfType && decStatementValue) {
      const result = {};
      for (const key in binding) {
          if (binding[key].value !== rdfType && !binding[key].value.startsWith("http://dec.fabiovitali.it/")) {
              result[binding[key].value] = decStatementValue;
          }
      }
      return result;
  }

  return null;
}

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
      "aaa * http://www.w3.org/1999/02/22-rdf-syntax-ns#type *",
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

  const matchesPattern = (binding, patternsArray) => {
      return patternsArray.some((pattern) => {
          const [graphPattern, sPattern, pPattern, oPattern] = pattern.split(" ");
          const values = [binding.graph?.value || "", binding.s?.value || "", binding.p?.value || "", binding.o?.value || ""];
          const patterns = [graphPattern, sPattern, pPattern, oPattern];
          const xYMap = { x: undefined, y: undefined };
          return patterns.every((pattern, index) => match(values[index], pattern, xYMap));
      });
  };

  if (matchesPattern(binding, exceptions)) return false;
  return matchesPattern(binding, patterns);
}
function SharedGraphURIs(binding) {
	const values = Object.values(binding).map(item => item.value);
	const hasType = values.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
	const hasShared = values.includes("http://dec.fabiovitali.it/shared");
	if (hasType && hasShared) {
		let remaining = values.filter(v => v !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && v !== "http://dec.fabiovitali.it/shared");
		return remaining;
	}
	return [];
}

function metastatement(binding) {
  let values = Object.values(binding)
  return values.some(v => 
    v?.value?.startsWith("http://dec.fabiovitali.it/")
  )
}

function filterByValues(bindings, elementName, filterables, exceptions = []) {
  return bindings.filter((binding) => {
    const elementValue = binding[elementName]?.value || "";
    const shouldFilter = filterables.some((uri) => {
      return elementValue.startsWith(uri) && !exceptions.includes(elementValue);
    });
    return !shouldFilter;
  });
}

function filterOWLRDFXSD(bindings) {
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
  ];

  const exceptions = [
    "aaa * http://www.w3.org/1999/02/22-rdf-syntax-ns#type *",
  ];

  const match = (value, pattern, xYMap) => {
    if (pattern === "*") return true;

    // Handle x and y: enforce consistent mapping
    if (["x", "y"].includes(pattern)) {
      if (xYMap[pattern] === undefined) {
        xYMap[pattern] = value; // Assign the value to x or y
        return true;
      }
      return xYMap[pattern] === value; // Ensure the value matches the existing assignment
    }

    // Check if value starts with the pattern string
    return value.startsWith(pattern);
  };

  const matchesPattern = (binding, patternsArray) => {
    return patternsArray.some((pattern) => {
      const [graphPattern, sPattern, pPattern, oPattern] = pattern.split(" ");
      const values = [binding.graph?.value || "", binding.s?.value || "", binding.p?.value || "", binding.o?.value || ""];
      const patterns = [graphPattern, sPattern, pPattern, oPattern];

      // Create a fresh xYMap for each binding evaluation
      const xYMap = { x: undefined, y: undefined };

      return patterns.every((pattern, index) => match(values[index], pattern, xYMap));
    });
  };

  const filteredBindings = bindings.filter((binding) => {
    // Exclude bindings that match any exception pattern
    if (matchesPattern(binding, exceptions)) {
      return true;
    }

    // Include bindings that do not match any filterable pattern
    if (matchesPattern(binding, patterns)) return false;

    return true;
  });

  return filteredBindings;
}

function usePrefixes(value) {
  if (value == undefined) return "";
  if (typeof value == 'object') {
    return Object.entries(value).map(([key, val]) => [key, usePrefixes(val.value)]);
  } else {
    const prefixes = getGlobals("prefixes") || {};

    for (const [prefix, uri] of Object.entries(prefixes)) {
      if (value.startsWith(uri)) {
        return value.replace(uri, `${prefix}:`).replace('<empty>','').replaceAll("/", "/​");
      }
    }
    return value.replaceAll("/", "/​");
  }
}

function relevantPart(string) {
  const parts = string.split(/[/#]/);
  return parts[parts.length - 1];
}




function createLabel(value) {
  if (value == undefined) return "";
  if (typeof value == 'object') {
    return Object.entries(value).map(([key, val]) => [key, createLabel(val.value)]);
  } else {
    const labels = getGlobals('labels'); 
    if (labels[value]) return labels[value] ;
    
    const lastSegment = value.split(/[:/#_]/).pop();
    const words = lastSegment.replace(/([a-z])([A-Z])/g, '$1 $2');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
}

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
  export function formatPrefixes(prefixes) {
    return Object.entries(prefixes)
      .map(([prefix, uri]) => `${prefix} ${uri}`)
      .join("\n");
  }
  export function formatPrefixesInSparql(prefixes) {
    return Object.entries(prefixes)
      .map(([prefix, uri]) => `PREFIX ${prefix=='<empty>'?'':prefix}: <${uri}>`)
      .join("\n");
  }
  
export function formatLabels(labels) {
  return Object.entries(labels)
    .map(([uri, label]) => `${uri} "${label}"`)
    .join("\n");
}

export function extractLabels(bindings) {
    const LABEL_PREDICATE = "http://www.w3.org/2000/01/rdf-schema#label";
  
    // Extract labels from bindings
    const newLabels = bindings
      .filter((binding) => binding.p?.value === LABEL_PREDICATE)
      .reduce((acc, binding) => {
        const subject = binding.s?.value || "";
        const object = binding.o?.value || "";
  
        if (subject && object && !acc[subject]) {
          acc[subject] = object;
        }
        return acc;
      }, {});
  
    // Merge with existing labels
    const existingLabels = getGlobals("labels") || {};
    const mergedLabels = { ...existingLabels, ...newLabels };
  
    return mergedLabels
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
  Handlebars.registerHelper("debug", (value) => JSON.stringify(value, null, 2)) ;
  Handlebars.registerHelper("join", (value) => value.join(" ")) ;
  Handlebars.registerHelper("addOne", (value) => value + 1) ;
  Handlebars.registerHelper('hasItems', function(obj) { return obj && Object.keys(obj).length > 0; });
  Handlebars.registerHelper("eq", function(a, b) { return a === b ; });
  Handlebars.registerHelper("neq", function(a, b) { return a !== b ; });
  Handlebars.registerHelper("typeof", function(value) { return typeof value; });
  Handlebars.registerHelper("endsWith", function(a, b) { return a.substr(-1*b.length) == b; });
  Handlebars.registerHelper("keys", function(obj) { return Object.keys(obj); });
  Handlebars.registerHelper("first", function(array) { return array[0]; });
  Handlebars.registerHelper("isFirstNonDec", function(key, obj) {
    const keys = Object.keys(obj);
    const firstNonDec = keys.find(k => k !== "dec");
    return key === firstNonDec;
  });
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
        if (a === "<default>") return -1;
        if (b === "<default>") return 1;

        const Ashared = a.includes("shared");
        const Bshared = b.includes("shared");
        
        if (Ashared && !Bshared) return 1;
        if (!Ashared && Bshared) return -1;
        
        return a.localeCompare(b);
    });
    return sorted.map((key, index) => options.fn(obj[key], { data: { index, key } })).join('');
}); 

class CollapseElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.addEventListener('click', handleCodeClick);
    }

    showVideo(videoId) {
        const iframe = this.shadowRoot.querySelector('#iframe');
        if (iframe) {
            iframe.src = "https://www.youtube.com/embed/" + videoId;
        }
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
            <link rel="stylesheet" href="viewer.css">
            <div class="sparql" id="sparql-${this.parentElement.id}">
                <div class="clearSwitch form-check form-switch">
                    <input class="form-check-input clearDatasetCheckbox" type="checkbox" id="clearDatasetCheckbox-${this.parentElement.id}" ${clearDataset ? 'checked' : ''}>
                    <label class="form-check-label clearDatasetLabel" for="clearDatasetCheckbox-${this.parentElement.id}">Clear</label>
                </div>
                <pre>${content}</pre>
            </div>
        `;

        // Add event listener to the checkbox
        const checkbox = this.shadowRoot.querySelector('.clearDatasetCheckbox');
        checkbox.addEventListener('change', (e) => {
            // Dispatch a custom event that bubbles up to the main document
            const event = new CustomEvent('clearDatasetChange', {
                bubbles: true,
                composed: true,
                detail: { checked: e.target.checked }
            });
            this.dispatchEvent(event);
        });
    }
}
customElements.define('fv-sparql', FvSparql);

// Add this near the top of the file with other event listeners

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


