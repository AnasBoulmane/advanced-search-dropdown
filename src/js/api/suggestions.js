// Mock data generator
function generateMockItems(searchTerm, page, pageSize) {
	// normalize search term for id generation remove special characters uncompatible with id attribute
	const normalizedTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
	return Array(pageSize)
		.fill(0)
		.map((_, i) => ({
			id: `${normalizedTerm}-${page * pageSize + i}`,
			label: `${searchTerm || 'Item'} ${page * pageSize + i + 1}`,
			images: {
				icon: `https://via.placeholder.com/50?text=${searchTerm || 'Item'} ${page * pageSize + i + 1}`,
				preview: `https://via.placeholder.com/400?text=${searchTerm || 'Item'} ${page * pageSize + i + 1}`,
				thumbnail: `https://via.placeholder.com/150?text=${searchTerm || 'Item'} ${page * pageSize + i + 1}`,
			},
		}));
}

export async function fetchSuggestions(searchTerm, page, pageSize) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(generateMockItems(searchTerm, page, pageSize));
		}, 500);
	});
}
