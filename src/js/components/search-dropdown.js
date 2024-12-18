import { debounce } from '../utils/debounce';
import { bindEventListener } from '../utils/event-listener';
import { VirtualScroller } from '../utils/virtual-scroller';

export class SearchDropdown {
	#elements = {};
	#state;
	#fetchData;
	#subscribers = new Map();
	#options;
	#eventSink = {};
	#virtualScroller;
	#renderTimeout;

	constructor(config) {
		if (!config.fetchData) {
			throw new Error('fetchData is required');
		}

		this.#fetchData = config.fetchData;
		this.#options = {
			placeholder: 'Search...',
			pageSize: 10,
			debounceTime: 300,
			minSearchLength: 3,
			...config,
		};

		this.#state = {
			isOpen: false,
			items: [],
			loading: false,
			error: null,
			selectedItems: new Map(),
			page: 0,
		};

		this.#virtualScroller = new VirtualScroller({
			itemHeight: this.#options.itemHeight || 36,
			itemGap: this.#options.itemGap || 4,
			containerHeight: this.#options.containerHeight || 300,
			bufferSize: 10,
		});

		this.#createElements();
		this.#setupEvents();
	}

	#createElements() {
		// Create main container
		this.#elements.container = document.createElement('div');
		this.#elements.container.className = 'relative w-full';

		// Input wrapper
		this.#elements.inputWrapper = document.createElement('div');
		this.#elements.inputWrapper.className = 'relative flex items-center';

		// Search input
		this.#elements.input = document.createElement('input');
		this.#elements.input.type = 'text';
		this.#elements.input.className =
			'w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-800 text-white border-slate-600';
		this.#elements.input.placeholder = this.#options.placeholder;

		// Search icon
		const searchIcon = document.createElement('span');
		searchIcon.className = 'absolute left-2 text-slate-400 material-symbols-rounded';
		searchIcon.textContent = 'search';

		// Dropdown panel
		this.#elements.dropdown = document.createElement('div');
		this.#elements.dropdown.className =
			'absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg hidden';

		// Suggestions list
		this.#elements.suggestions = document.createElement('div');
		this.#elements.suggestions.className = 'h-60 overflow-y-auto';

		// Selected items count
		this.#elements.selectedContainer = document.createElement('div');
		this.#elements.selectedContainer.className = 'absolute right-2 top-0 h-full flex items-center gap-1';

		// Create virtual scroll viewport
		this.#elements.viewport = document.createElement('div');
		this.#elements.viewport.className = 'absolute inset-1 overflow-auto rounded';

		// Create content container for virtual items
		this.#elements.content = document.createElement('div');
		this.#elements.content.className = 'absolute w-full';

		this.#elements.preview = document.createElement('div');
		this.#elements.preview.className =
			'fixed hidden z-[100] bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-600 pointer-events-none';
		document.body.appendChild(this.#elements.preview);

		this.#elements.viewport.appendChild(this.#elements.content);
		this.#elements.suggestions.appendChild(this.#elements.viewport);

		// Assemble the elements
		this.#elements.inputWrapper.appendChild(this.#elements.input);
		this.#elements.inputWrapper.appendChild(searchIcon);
		this.#elements.inputWrapper.appendChild(this.#elements.selectedContainer);
		this.#elements.dropdown.appendChild(this.#elements.suggestions);
		this.#elements.container.appendChild(this.#elements.inputWrapper);
		this.#elements.container.appendChild(this.#elements.dropdown);
	}

	#setupEvents() {
		// Input focus shows dropdown
		this.#eventSink.handleFocus = bindEventListener(this.#elements.input, 'focus', () => {
			if (this.#state.items.length === 0) return;
			this.#setOpen(true);
		});

		// Click outside closes dropdown
		this.#eventSink.handleClick = bindEventListener(document, 'click', (e) => {
			if (!this.#elements.container.contains(e.target) && !e.target.closest('[data-item-id]')) {
				this.#setOpen(false);
			}
		});

		// Input changes trigger search
		this.#eventSink.handleInput = bindEventListener(
			this.#elements.input,
			'input',
			debounce(() => this.#handleSearch(), this.#options.debounceTime)
		);

		// Infinite scroll + virtual scrolling
		this.#eventSink.handleScroll = bindEventListener(this.#elements.viewport, 'scroll', () => {
			this.#handleScroll();
		});

		// Add hover events using event delegation
		this.#eventSink.handleItemHover = bindEventListener(
			this.#elements.content,
			'mousemove',
			this.#handleItemHover.bind(this)
		);

		this.#eventSink.handleItemLeave = bindEventListener(this.#elements.content, 'mouseleave', () => {
			this.#elements.preview.classList.add('hidden');
		});

		// Handle item selection

		// Use event delegation for both containers
		const handlers = [
			bindEventListener(this.#elements.content, 'click', this.#handleItemClick.bind(this)),
			bindEventListener(this.#elements.selectedContainer, 'click', this.#handleItemClick.bind(this)),
		];

		this.#eventSink.itemsEventSink = () => handlers.forEach((unbind) => unbind());
	}

	#handleItemHover(e) {
		const itemElement = e.target.closest('[data-item-id]');
		if (!itemElement) return;

		const itemId = itemElement.dataset.itemId;
		const item = this.#state.items.find((i) => i.id === itemId);

		if (!item?.images?.preview) return;

		// Get element position
		const rect = itemElement.getBoundingClientRect();

		// Position preview next to the item
		this.#elements.preview.style.left = `${rect.right + 8}px`;
		this.#elements.preview.style.top = `${rect.top}px`;

		// Show preview with loading state
		this.#elements.preview.classList.remove('hidden');

		// Load image
		const img = new Image();
		img.className = 'w-48 h-48 object-cover rounded';
		img.src = item.images.preview;

		img.onload = () => {
			if (!this.#elements.preview.classList.contains('hidden')) {
				this.#elements.preview.innerHTML = '';
				this.#elements.preview.appendChild(img);
			}
		};
	}

	#handleItemClick(e) {
		const itemElement = e.target.closest('[data-item-id]');
		if (!itemElement) return;
		const itemId = itemElement.dataset.itemId;

		if (this.#state.selectedItems.has(itemId)) {
			this.#state.selectedItems.delete(itemId);
		} else {
			const item = this.#state.items.find((i) => i.id === itemId);
			this.#state.selectedItems.set(itemId, item);
		}

		this.#emit('select', Array.from(this.#state.selectedItems.values()));
		this.#renderSelectedPreview();
		this.#renderVisibleItems();
	}

	#setOpen(isOpen) {
		this.#state.isOpen = isOpen;
		this.#elements.dropdown.classList.toggle('hidden', !isOpen);
	}

	async #handleSearch() {
		try {
			const searchTerm = this.#elements.input.value.trim();
			// Reset search state and close dropdown if search term is less than 3 characters
			if (searchTerm.length < this.#options.minSearchLength) {
				this.#state.items = [];
				this.#setOpen(false);
				// Reset scroll position on new search
				this.#elements.viewport.scrollTop = 0;
				this.#virtualScroller.updateConfig({ scrollTop: 0 });
				this.#render();
				return;
			}
			// continue with search
			this.#state.loading = true;
			this.#state.page = 0;
			this.#setOpen(true);
			// Reset scroll position on new search
			this.#elements.viewport.scrollTop = 0;
			this.#virtualScroller.updateConfig({ scrollTop: 0 });
			this.#emit('searchStart');
			this.#render();

			const items = await this.#fetchData(searchTerm, this.#state.page, this.#options.pageSize);

			this.#state.items = items;
			this.#emit('searchComplete', items);
		} catch (error) {
			this.#state.error = error;
			this.#emit('error', error);
		} finally {
			this.#state.loading = false;
			this.#render();
		}
	}

	async #loadMore() {
		if (this.#state.loading) return;

		try {
			this.#state.loading = true;
			this.#render();

			const newItems = await this.#fetchData(
				this.#elements.input.value.trim(),
				this.#state.page + 1,
				this.#options.pageSize
			);

			if (newItems.length > 0) {
				this.#state.page++;
				this.#state.items = [...this.#state.items, ...newItems];
			}
		} catch (error) {
			this.#state.error = error;
			this.#emit('error', error);
		} finally {
			this.#state.loading = false;
			this.#render();
		}
	}

	#handleScroll() {
		const { scrollTop, scrollHeight, clientHeight } = this.#elements.viewport;

		// Update virtual scroller
		this.#virtualScroller.updateConfig({ scrollTop, totalItems: this.#state.items.length });

		// Schedule render
		if (this.#renderTimeout) {
			cancelAnimationFrame(this.#renderTimeout);
			this.#renderTimeout = null;
		}

		this.#renderTimeout = requestAnimationFrame(() => {
			this.#renderVisibleItems();
		});

		// Check if we need to load more items
		if (scrollHeight - scrollTop <= clientHeight + 100) {
			this.#loadMore();
		}
	}

	#renderVisibleItems() {
		const { start, end } = this.#virtualScroller.getVisibleRange();
		const visibleItems = this.#state.items.slice(start, end);

		// Render only visible items
		let content = visibleItems
			.map((item, idx) => {
				const itemStyle = this.#virtualScroller.getItemStyle(start + idx);
				const styleString = Object.entries(itemStyle)
					.map(([key, value]) => `${key}:${value}`)
					.join(';');

				return `
          <div
            style="${styleString}"
            class="group absolute w-full flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-slate-700 data-[selected]:bg-slate-700"
            data-item-id="${item.id}"
            ${this.#state.selectedItems.has(item.id) ? 'data-selected="true"' : ''}
          >
            <img class="w-5 h-5 rounded border-slate-500" src="${item.images?.icon}" alt="${item.label}">
            <span class="text-sm text-white flex-1">${item.label}</span>
						<span class="material-symbols-rounded text-[18px] text-white hidden group-[[data-selected]]:block">check</span>
          </div>
        `;
			})
			.join('');

		// Add loading indicator if needed
		if (this.#state.loading) {
			const loadingStyle = this.#virtualScroller.getItemStyle(Math.max(end, start + visibleItems.length));
			const loadingStyleString = Object.entries(loadingStyle)
				.map(([key, value]) => `${key}:${value}`)
				.join(';');

			content += `
				<div class="absolute w-full flex justify-center p-4" style="${loadingStyleString}">
					<div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
				</div>
			`;
		}

		// Update content & height
		this.#elements.content.innerHTML = content;
		this.#elements.content.style.height = `${this.#virtualScroller.getScrollHeight()}px`;
	}

	#render() {
		// Update selected items preview
		this.#renderSelectedPreview();

		// Initial render of visible items
		this.#virtualScroller.updateConfig({ totalItems: this.#state.items.length });
		this.#renderVisibleItems();
	}

	#renderSelectedPreview() {
		// Update selected preview and count
		const selectedItems = Array.from(this.#state.selectedItems.values());
		// only show 2 selected items in preview at all time
		const selectedPreview = selectedItems.length > 2 ? selectedItems.slice(0, 1) : selectedItems.slice(0, 2);
		this.#elements.selectedContainer.innerHTML =
			this.#state.selectedItems.size > 0
				? `
				${selectedPreview
					.map(
						(item) => `
							<span class="text-xs text-slate-200 px-2 py-1 flex items-center gap-1 bg-slate-700 rounded" data-item-id="${item.id}">
								${item.label}
								<span class="material-symbols-rounded text-[14px]">close</span>
							</span>
						`
					)
					.join('')}
				${
					selectedItems.length > 2
						? `
						<span class="text-xs text-slate-200 px-2 py-1 bg-slate-700 rounded" >
							+${this.#state.selectedItems.size - selectedPreview.length} selected
						</span>`
						: ''
				}`
				: '';
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

	mount(container) {
		container.appendChild(this.#elements.container);
	}

	destroy() {
		// Remove event listeners
		Object.values(this.#eventSink).forEach((unbind) => unbind());

		this.#elements.container.remove();
		this.#subscribers.clear();
	}
}
