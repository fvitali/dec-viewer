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


// Utility functions

/**
 * Pretty-prints an object to console as formatted JSON
 * @param {*} i - Object to print
 */
export function p(i) {
    console.log(JSON.stringify(i,null,2)) 
}

/**
 * Returns the first element that matches the selector
 * @param {string} selector - CSS selector
 * @param {Document|Element} [context=document] - Context to search within
 * @returns {Element|null} First matching element or null
 */
export function $(selector, context = document) {
    return context.querySelector(selector);
  }
  
  /**
   * Returns all elements that match the selector as an array
   * @param {string} selector - CSS selector
   * @param {Document|Element} [context=document] - Context to search within
   * @returns {Array<Element>} Array of matching elements
   */
  export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }
  
  /**
   * Returns all elements that match the selector, including those in shadow DOMs
   * @param {string} selector - CSS selector
   * @param {Document|Element} [context=document] - Context to search within
   * @returns {Array<Element>} Array of matching elements from regular DOM and shadow DOMs
   */
  export function $$$(selector, context = document) {
    const results = new Set();
  
    function traverse(node) {
      // Se il nodo ha un shadow root, visitiamolo
      if (node.shadowRoot) {
        traverse(node.shadowRoot);
      }
  
      // Se è un root node (document or shadowRoot), cerchiamo lì
      if (node.querySelectorAll) {
        for (const match of node.querySelectorAll(selector)) {
          results.add(match);
        }
      }
  
      // Visitiamo solo i figli ELEMENTO, per evitare duplicazioni da text/comment
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }
  
    traverse(context);
    return Array.from(results);
  }
  