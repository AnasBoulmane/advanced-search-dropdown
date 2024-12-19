// Helper function to create element from template string
export function createElement(template) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(template.trim(), 'text/html');
	return doc.body.firstChild;
}

// Helper function for creating multiple elements
export function createElements(template) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(template.trim(), 'text/html');
	return Array.from(doc.body.children);
}
