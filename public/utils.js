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

export function p(i) {
    console.log(JSON.stringify(i,null,2)) 
}

export function $(selector, context = document) {
    return context.querySelector(selector);
  }
  
  export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }
  
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
  