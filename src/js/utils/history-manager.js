/**
 * Interface for history management implementations
 * This allows different storage strategies (localStorage, IndexedDB, API, etc.)
 */
export class HistoryManagerInterface {
	async getRecentItems() {
		throw new Error('Not implemented');
	}
	async getHistory() {
		throw new Error('Not implemented');
	}
	async addToHistory(item) {
		throw new Error('Not implemented');
	}
	async clear() {
		throw new Error('Not implemented');
	}
}

/**
 * History manager implementation using localStorage
 */
export class LocalStorageHistoryManager extends HistoryManagerInterface {
	#maxRecentItems;
	#maxHistoryItems;
	#storageKeyPrefix;

	constructor(options = { maxRecentItems: 5, maxHistoryItems: 50, storageKeyPrefix: 'dropdown_' }) {
		super();
		// Configure size limits for both collections
		this.#maxRecentItems = options.maxRecentItems || 5;
		this.#maxHistoryItems = options.maxHistoryItems || 50;
		// Allow configurable storage keys to prevent conflicts
		this.#storageKeyPrefix = options.storageKeyPrefix || 'dropdown_';
	}

	// Helper method to ensure consistent key usage
	#getStorageKey(type) {
		return `${this.#storageKeyPrefix}${type}`;
	}

	// Helper to safely parse localStorage data
	#getStorageData(key, defaultValue = []) {
		try {
			const data = localStorage.getItem(this.#getStorageKey(key));
			return data ? JSON.parse(data) : defaultValue;
		} catch (error) {
			console.error(`Error reading from localStorage: ${error.message}`);
			return defaultValue;
		}
	}

	// Helper to safely save to localStorage
	#setStorageData(key, data) {
		try {
			localStorage.setItem(this.#getStorageKey(key), JSON.stringify(data));
		} catch (error) {
			console.error(`Error writing to localStorage: ${error.message}`);
			throw error; // Propagate storage errors
		}
	}

	async getRecentItems() {
		// Get full history and take the most recent unique items
		const history = this.#getStorageData('history');

		// Convert map values back to array and slice to ensure max size
		return history.slice(0, this.#maxRecentItems);
	}

	async getHistory() {
		return this.#getStorageData('history');
	}

	async addToHistory(item) {
		if (!item?.id) throw new Error('Item must have an id property');

		const history = this.#getStorageData('history');

		// Add new item at the start and filter out any previous occurrences
		const updatedHistory = [
			{ ...item, timestamp: Date.now() }, // Ensure timestamp is added/updated
			...history.filter((i) => i.id !== item.id),
		].slice(0, this.#maxHistoryItems);

		this.#setStorageData('history', updatedHistory);
	}

	async clear() {
		localStorage.removeItem(this.#getStorageKey('history'));
	}
}

// Example API-based history manager
export class APIHistoryManager extends HistoryManagerInterface {
	#apiClient;

	constructor(apiClient) {
		super();
		this.#apiClient = apiClient;
	}

	async getRecentItems() {
		const response = await this.#apiClient.get('/recent');
		return response.data;
	}

	async getHistory() {
		const response = await this.#apiClient.get('/history');
		return response.data;
	}

	async addToHistory(item) {
		await this.#apiClient.post('/history', item);
	}

	async clear() {
		await this.#apiClient.delete('/history');
		await this.#apiClient.delete('/recent');
	}
}
