/**
 * @param {string} string
 * @returns {HtmlElement} node
 */
export function getElementNodeFromString(string) {
  const doc = new DOMParser().parseFromString(string, 'text/html');

  let node = doc.body.firstChild;

  for (; node; node = node.nextSibling) {
    if (node.nodeType === 1) {
      return node;
    }
  }

  return document.createTextNode('');
}

export function getElementNodesFromString(string) {
  const doc = new DOMParser().parseFromString(string, 'text/html');

  let node = doc.body.firstChild;
  const nodes = [];

  for (; node; node = node.nextSibling) {
    if (node.nodeType === 1) {
      nodes.push(node);
    }
  }

  return nodes;
}
