import { fetchSuggestions } from './api/suggestions.js';
import { LocalStorageHistoryManager } from './utils/history-manager.js';
import { SearchDropdown } from './components/search-dropdown.js';

// Initialize dropdown with mock data
const dropdown = new SearchDropdown({
	fetchData: fetchSuggestions,
	historyManager: new LocalStorageHistoryManager(),
	placeholder: 'Search items...',
	pageSize: 10,
});

// Mount dropdown
dropdown.mount(document.getElementById('app'));

// Add event listeners
dropdown.on('select', (item) => {
	console.log('Selected:', item);
});

dropdown.on('error', (error) => {
	console.error('Error:', error);
});

dropdown.on('searchStart', () => {
	console.log('Search started');
});

dropdown.on('searchComplete', (items) => {
	console.log('Search completed:', items);
});
