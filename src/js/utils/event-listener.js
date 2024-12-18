// helper function to add event listener to an element and return a function to remove the event listener
export function bindEventListener(element, event, callback) {
	element?.addEventListener(event, callback);
	return () => {
		element?.removeEventListener(event, callback);
	};
}
