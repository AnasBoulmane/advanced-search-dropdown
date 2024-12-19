import { createElement } from '../utils/dom';
import { SearchDropdownTemplates } from './search-dropdown.templates';

export class SearchDropdownViewManager {
	#elements = {};
	#templates;
	#virtualScroller;
	#renderTimeout;
	#options;

	constructor(virtualScroller, options) {
		this.#virtualScroller = virtualScroller;
		this.#options = options;
		this.#templates = options.templates || SearchDropdownTemplates;
		this.#elements = this.#buildElements();
	}

	get elements() {
		return this.#elements;
	}

	#buildElements() {
		const elements = {};
		const container = createElement(this.#templates.container());

		// Cache all necessary element references
		elements.container = container;
		elements.inputWrapper = container.querySelector('.input-wrapper');
		elements.input = container.querySelector('input');
		elements.dropdown = container.querySelector('.dropdown-panel');
		elements.recentSection = container.querySelector('.recent-items-container');
		elements.suggestions = container.querySelector('.suggestions-container');
		elements.viewport = container.querySelector('.viewport');
		elements.content = container.querySelector('.items-container');
		elements.selectedContainer = container.querySelector('.selected-container');

		// Create preview element
		elements.preview = createElement(this.#templates.preview());
		document.body.appendChild(elements.preview);

		// Set initial input placeholder
		elements.input.placeholder = this.#options.placeholder;

		return elements;
	}

	renderDropdownContent(state) {
		const { recentItems, historyItems, isHistoryVisible } = state;

		// Render recent section if we have items
		if (recentItems?.length > 0) {
			this.#elements.recentSection.innerHTML = this.#templates.recentSection(recentItems);
		} else {
			this.#elements.recentSection.innerHTML = '';
		}

		// Render history section if visible
		if (isHistoryVisible) {
			console.log('Rendering history section:');
			this.#elements.recentSection.innerHTML = '';
			const historySection = createElement(this.#templates.historySection(historyItems));
			this.#elements.recentSection.appendChild(historySection);
			this.#elements.suggestions.style.display = 'none';
			return; // Don't show suggestions when history is visible
		}

		// Render suggestions section
		this.#elements.suggestions.style.display = state.items.length > 0 ? 'block' : 'none';
		this.#virtualScroller.updateConfig({ totalItems: state.items.length });
		this.renderVisibleItems(state);
	}

	renderVisibleItems(state) {
		const { start, end } = this.#virtualScroller.getVisibleRange();
		const visibleItems = state.items.slice(start, end);

		// Render only visible items
		let content = visibleItems
			.map((item, idx) => {
				const itemStyle = this.#virtualScroller.getItemStyle(start + idx);
				const styleString = Object.entries(itemStyle)
					.map(([key, value]) => `${key}:${value}`)
					.join(';');

				return this.#templates
					.itemTemplate(item, state.selectedItems.has(item.id))
					.replace('style=""', `style="${styleString}"`);
			})
			.join('');

		// Add loading indicator if needed
		if (state.loading) {
			const loadingStyle = this.#virtualScroller.getItemStyle(Math.max(end, start + visibleItems.length));
			const loadingStyleString = Object.entries(loadingStyle)
				.map(([key, value]) => `${key}:${value}`)
				.join(';');

			content += this.#templates.loadingIndicator(loadingStyleString);
		}

		// Update content & height
		this.#elements.content.innerHTML = content;
		this.#elements.content.style.height = `${this.#virtualScroller.getScrollHeight()}px`;
	}

	renderSelectedPreview(selectedItems) {
		const selectedPreview = selectedItems.length > 2 ? selectedItems.slice(0, 1) : selectedItems.slice(0, 2);

		this.#elements.selectedContainer.innerHTML =
			selectedItems.length > 0
				? `
        ${selectedPreview.map((item) => this.#templates.selectedItemTemplate(item)).join('')}
        ${
					selectedItems.length > 2
						? `<span class="text-xs text-slate-200 px-2 py-1 bg-slate-700 rounded">
               +${selectedItems.length - selectedPreview.length} selected
             </span>`
						: ''
				}`
				: '';
	}

	showPreview(item, rect) {
		if (!item?.images?.preview) return;

		// Position preview
		this.#elements.preview.style.left = `${rect.right + 8}px`;
		this.#elements.preview.style.top = `${rect.top}px`;
		this.#elements.preview.classList.remove('hidden');

		// Load image
		const img = new Image();
		img.className = 'w-48 h-48 object-cover rounded';
		img.src = item.images.preview;
		this.#elements.preview.innerHTML = this.#templates.previewImage(item.images.icon);

		img.onload = () => {
			if (!this.#elements.preview.classList.contains('hidden')) {
				this.#elements.preview.innerHTML = '';
				this.#elements.preview.appendChild(img);
			}
		};
	}

	hidePreview() {
		this.#elements.preview.classList.add('hidden');
	}

	setDropdownVisibility(isVisible) {
		this.#elements.dropdown.classList.toggle('hidden', !isVisible);
	}

	scheduleRender(callback) {
		if (this.#renderTimeout) {
			cancelAnimationFrame(this.#renderTimeout);
		}
		this.#renderTimeout = requestAnimationFrame(callback);
	}

	destroy() {
		if (this.#renderTimeout) {
			cancelAnimationFrame(this.#renderTimeout);
		}
		this.#elements.preview.remove();
		this.#elements.container.remove();
	}
}
