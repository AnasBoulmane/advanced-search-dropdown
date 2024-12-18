import { debounce } from '../utils/debounce';

export class SearchDropdown {
	#elements = {};
	#state;
	#fetchData;
	#subscribers = new Map();
	#options;
	#eventHandlers = {};

	constructor(config) {
		if (!config.fetchData) {
			throw new Error('fetchData is required');
		}

		this.#fetchData = config.fetchData;
		this.#options = {
			placeholder: 'Search...',
			pageSize: 10,
			debounceTime: 300,
			...config,
		};

		this.#state = {
			isOpen: false,
			items: [],
			loading: false,
			error: null,
			page: 0,
		};

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
			'w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-800 text-white border-slate-600';
		this.#elements.input.placeholder = this.#options.placeholder;

		// Dropdown panel
		this.#elements.dropdown = document.createElement('div');
		this.#elements.dropdown.className =
			'absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg hidden';

		// Suggestions list
		this.#elements.suggestions = document.createElement('div');
		this.#elements.suggestions.className = 'max-h-60 overflow-y-auto p-1 space-y-1';

		// Assemble the elements
		this.#elements.inputWrapper.appendChild(this.#elements.input);
		this.#elements.dropdown.appendChild(this.#elements.suggestions);
		this.#elements.container.appendChild(this.#elements.inputWrapper);
		this.#elements.container.appendChild(this.#elements.dropdown);
	}

	#setupEvents() {
		// Input focus shows dropdown
		this.#eventHandlers.handleFocus = () => {
			if (this.#state.items.length === 0) return;
			this.#setOpen(true);
		};
		this.#elements.input.addEventListener('focus', this.#eventHandlers.handleFocus);

		// Click outside closes dropdown
		this.#eventHandlers.handleClick = (e) => {
			if (!this.#elements.container.contains(e.target)) {
				this.#setOpen(false);
			}
		};
		document.addEventListener('click', this.#eventHandlers.handleClick);

		// Input changes trigger search
		this.#eventHandlers.handleInput = debounce(() => this.#handleSearch(), this.#options.debounceTime);
		this.#elements.input.addEventListener('input', this.#eventHandlers.handleInput);

		// Infinite scroll
		this.#eventHandlers.handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = this.#elements.suggestions;
			if (scrollHeight - scrollTop <= clientHeight + 50) {
				this.#loadMore();
			}
		};
		this.#elements.suggestions.addEventListener('scroll', this.#eventHandlers.handleScroll);
	}

	#setOpen(isOpen) {
		this.#state.isOpen = isOpen;
		this.#elements.dropdown.classList.toggle('hidden', !isOpen);
	}

	async #handleSearch() {
		try {
			const searchTerm = this.#elements.input.value.trim();
			// Reset search state and close dropdown if search term is less than 3 characters
			if (searchTerm.length < 3) {
				this.#state.items = [];
				this.#setOpen(false);
				this.#render();
				return;
			}
			// continue with search
			this.#state.loading = true;
			this.#state.page = 0;
			this.#setOpen(true);
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

	#render() {
		// Render suggestions
		this.#elements.suggestions.innerHTML = `
          ${this.#state.items
						.map(
							(item) => `
              <div class="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-slate-700" data-item-id="${item.id}">
                <img class="w-5 h-5 rounded border-slate-500" src="${item.images?.icon}" alt="${item.label}">
                <span class="text-sm text-white">${item.label}</span>
              </div>
          	`
						)
						.join('')}
          ${
						this.#state.loading
							? `
              <div class="flex justify-center p-4">
                <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
          		`
							: ''
					}
          ${
						this.#state.error
							? `
              <div class="p-4 text-red-400 text-sm">
                ${this.#state.error.message}
              </div>
          		`
							: ''
					}
      `;

		// Add click handlers
		this.#elements.suggestions.querySelectorAll('[data-item-id]').forEach((el) => {
			el.addEventListener('click', () => {
				const itemId = el.dataset.itemId;
				const item = this.#state.items.find((i) => i.id === itemId);
				this.#emit('select', item);
				this.#setOpen(false);
				this.#render();
			});
		});
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
		this.#elements.input.removeEventListener('focus', this.#eventHandlers.handleFocus);
		this.#elements.input.removeEventListener('input', this.#eventHandlers.handleInput);
		this.#elements.suggestions.removeEventListener('scroll', this.#eventHandlers.handleScroll);
		document.removeEventListener('click', this.#eventHandlers.handleClick);

		this.#elements.container.remove();
		this.#subscribers.clear();
	}
}
