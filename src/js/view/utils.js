/**
 * Helper function to create a new element with the given attributes and children
 */
export function new_element(name, attributes, children) {
    const e = document.createElement(name);
    for (const key in attributes) {
        if (key == 'content') {
            e.appendChild(document.createTextNode(attributes[key]));
        }
        else {
            e.setAttribute(key.replace(/_/g, '-'), attributes[key]);
        }
    }
    for (const child of children || []) {
        e.appendChild(child);
    }
    return e;
}
