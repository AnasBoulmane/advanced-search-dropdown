import { debounce } from '../utils/debounce';
import { bindEventListener } from '../utils/event-listener';
import { VirtualScroller } from '../utils/virtual-scroller';
import { StateManager } from '../utils/state-manager';
import { SearchDropdownViewManager } from './search-dropdown.view';

export class SearchDropdown {
	#stateManager;
	#viewManager;
	#historyManager;
	#virtualScroller;
	#eventSink = {};
	#subscribers = new Map();
	#options;
	#fetchData;

	constructor(config) {
		if (!config.fetchData) {
			throw new Error('fetchData is required');
		}
		if (!config.historyManager) {
			throw new Error('historyManager is required');
		}

		this.#options = {
			placeholder: 'Search...',
			pageSize: 10,
			debounceTime: 300,
			minSearchLength: 3,
			itemHeight: 36,
			itemGap: 4,
			containerHeight: 300,
			...config,
		};

		this.#fetchData = config.fetchData;
		this.#historyManager = config.historyManager;
		this.#initializeComponents();
		this.#setupEvents();
	}

	#initializeComponents() {
		// Initialize virtual scroller for efficient rendering of large lists
		this.#virtualScroller = new VirtualScroller({
			itemHeight: this.#options.itemHeight,
			itemGap: this.#options.itemGap,
			containerHeight: this.#options.containerHeight,
			bufferSize: 10,
		});

		// Initialize state manager with default state
		this.#stateManager = new StateManager({
			isOpen: false,
			items: [],
			loading: false,
			error: null,
			selectedItems: new Map(),
			page: 0,
			isHistoryVisible: false,
			recentItems: [],
			historyItems: [],
		});

		// Initialize view manager and subscribe to state changes
		this.#viewManager = new SearchDropdownViewManager(this.#virtualScroller, this.#options);
		// Load history data
		this.#loadHistoryData();
		// Subscribe to state changes to update the view
		this.#stateManager.subscribe((state) => {
			const timestamp = new Date().toISOString();
			console.log('rendering state:', timestamp, state);
			this.#viewManager.renderDropdownContent(state);
			this.#viewManager.renderSelectedPreview(Array.from(state.selectedItems.values()));
		});
	}

	#setupEvents() {
		const elements = this.#viewManager.elements;

		// Input focus shows dropdown
		this.#eventSink.handleFocus = bindEventListener(elements.input, 'focus', () => {
			const state = this.#stateManager.state;
			if (state.items.length === 0 && state.recentItems.length === 0) return;
			this.#setOpen(true);
		});

		// Click outside closes dropdown
		this.#eventSink.handleClick = bindEventListener(document, 'click', (e) => {
			if (!elements.container.contains(e.target) && !e.target.closest('[data-item-id]')) {
				this.#setOpen(false);
			}
		});

		// Input changes trigger search
		this.#eventSink.handleInput = bindEventListener(
			elements.input,
			'input',
			debounce(() => this.#handleSearch(), this.#options.debounceTime)
		);

		// Infinite scroll + virtual scrolling
		this.#eventSink.handleScroll = bindEventListener(elements.viewport, 'scroll', () => {
			this.#handleScroll();
		});

		// Hover events for item previews
		this.#eventSink.handleItemHover = bindEventListener(
			elements.content,
			'mousemove',
			this.#handleItemHover.bind(this)
		);

		this.#eventSink.handleItemLeave = bindEventListener(elements.content, 'mouseleave', () => {
			this.#viewManager.hidePreview();
		});

		// Item selection handling with event delegation
		const handlers = [
			bindEventListener(elements.content, 'click', this.#handleItemClick.bind(this)),
			bindEventListener(elements.selectedContainer, 'click', this.#handleItemClick.bind(this)),
		];

		this.#eventSink.itemsEventSink = () => handlers.forEach((unbind) => unbind());

		// Show history panel
		this.#eventSink.handleHistoryAction = bindEventListener(
			this.#viewManager.elements.recentSection,
			'click',
			async (e) => {
				const action = e.target.closest('[data-action]')?.dataset.action;

				if (action === 'toggle-history') {
					this.#toggleHistory(!this.#stateManager.state.isHistoryVisible);
					await this.#loadHistoryData();
				} else if (action === 'clear-history') {
					await this.#historyManager.clear();
					await this.#loadHistoryData();
				}
			}
		);
	}

	async #loadHistoryData() {
		try {
			const [recentItems, historyItems] = await Promise.all([
				this.#historyManager.getRecentItems(),
				this.#historyManager.getHistory(),
			]);

			this.#stateManager.setState({ recentItems, historyItems });
		} catch (error) {
			this.#emit('error', error);
		}
	}

	async #handleSearch() {
		const elements = this.#viewManager.elements;
		const state = this.#stateManager.state;
		const searchTerm = elements.input.value.trim();

		// Reset search if term is too short
		if (searchTerm.length < this.#options.minSearchLength && !state.recentItems?.length) {
			this.#stateManager.setState({
				items: [],
				page: 0,
			});
			this.#setOpen(false);
			elements.viewport.scrollTop = 0;
			this.#virtualScroller.updateConfig({ scrollTop: 0 });
			return;
		}

		try {
			// Update state for search start
			this.#stateManager.setState({
				loading: true,
				page: 0,
			});
			this.#setOpen(true);
			elements.viewport.scrollTop = 0;
			this.#virtualScroller.updateConfig({ scrollTop: 0 });
			this.#emit('searchStart');

			// Fetch and update items
			const items = await this.#fetchData(searchTerm, 0, this.#options.pageSize);
			this.#stateManager.setState({ items });
			this.#emit('searchComplete', items);
		} catch (error) {
			this.#stateManager.setState({ error });
			this.#emit('error', error);
		} finally {
			this.#stateManager.setState({ loading: false });
		}
	}

	async #loadMore() {
		const state = this.#stateManager.state;
		if (state.loading) return;

		try {
			this.#stateManager.setState({ loading: true });

			const searchTerm = this.#viewManager.elements.input.value.trim();
			const newItems = await this.#fetchData(searchTerm, state.page + 1, this.#options.pageSize);

			if (newItems.length > 0) {
				this.#stateManager.setState({
					page: state.page + 1,
					items: [...state.items, ...newItems],
				});
			}
		} catch (error) {
			this.#stateManager.setState({ error });
			this.#emit('error', error);
		} finally {
			this.#stateManager.setState({ loading: false });
		}
	}

	#handleScroll() {
		const elements = this.#viewManager.elements;
		const { scrollTop, scrollHeight, clientHeight } = elements.viewport;

		// Update virtual scroller configuration
		this.#virtualScroller.updateConfig({
			scrollTop,
			totalItems: this.#stateManager.state.items.length,
		});

		// Schedule render for next animation frame
		this.#viewManager.scheduleRender(() => {
			this.#viewManager.renderVisibleItems(this.#stateManager.state);
		});

		// Check if we need to load more items
		if (scrollHeight - scrollTop <= clientHeight + 100) {
			this.#loadMore();
		}
	}

	#handleItemHover(e) {
		const itemElement = e.target.closest('[data-item-id]');
		if (!itemElement) return;

		const itemId = itemElement.dataset.itemId;
		const item = this.#findItemById(itemId);

		if (item) {
			const rect = itemElement.getBoundingClientRect();
			this.#viewManager.showPreview(item, rect);
		}
	}

	async #handleItemClick(e) {
		const itemElement = e.target.closest('[data-item-id]');
		if (!itemElement) return;

		const itemId = itemElement.dataset.itemId;
		const item = this.#findItemById(itemId);

		if (!item) return;

		// Update selection state
		const selectedItems = new Map(this.#stateManager.state.selectedItems);
		if (selectedItems.has(itemId)) {
			selectedItems.delete(itemId);
		} else {
			selectedItems.set(itemId, item);

			// Add to history and recent
			await Promise.all([
				this.#historyManager.addToHistory({
					...item,
					timestamp: Date.now(),
				}),
			]);

			// Reload history data
			await this.#loadHistoryData();
		}

		this.#stateManager.setState({ selectedItems });
		this.#emit('select', Array.from(selectedItems.values()));
	}

	#findItemById(id) {
		const { items, recentItems, historyItems } = this.#stateManager.state;
		return (
			items.find((i) => i.id === id) || recentItems.find((i) => i.id === id) || historyItems.find((i) => i.id === id)
		);
	}

	#setOpen(isOpen) {
		this.#stateManager.setState({ isOpen });
		this.#viewManager.setDropdownVisibility(isOpen);
	}

	#toggleHistory(isHistoryVisible) {
		this.#stateManager.setState({ isHistoryVisible });
	}

	// Public API methods
	mount(container) {
		container.appendChild(this.#viewManager.elements.container);
	}

	on(event, callback) {
		if (!this.#subscribers.has(event)) {
			this.#subscribers.set(event, new Set());
		}
		this.#subscribers.get(event).add(callback);

		return () => {
			this.#subscribers.get(event).delete(callback);
		};
	}

	#emit(event, data) {
		if (this.#subscribers.has(event)) {
			this.#subscribers.get(event).forEach((callback) => callback(data));
		}
	}

	/**
	 * Clean up event listeners, subscriptions, and view elements
	 **/
	destroy() {
		// Clean up all event listeners
		Object.values(this.#eventSink).forEach((unbind) => unbind());

		this.#subscribers.clear();
		// Clean up view
		this.#viewManager.destroy();
	}
}
