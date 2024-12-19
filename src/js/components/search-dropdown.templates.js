import { formatTimestamp } from '../utils/date';

export class SearchDropdownTemplates {
	static container() {
		return `
			<div class="relative w-full">
				${this.inputWrapper()}
				${this.dropdownPanel()}
			</div>
    `;
	}

	static inputWrapper() {
		return `
			<div class="input-wrapper relative flex items-center">
				<span class="absolute left-2 text-slate-400 material-symbols-rounded">search</span>
				${this.searchInput()}
				<div class="selected-container absolute right-2 top-0 h-full flex items-center gap-1"></div>
			</div>
    `;
	}

	static searchInput() {
		return `
      <input
        type="text"
        class="search-input w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-800 text-white border-slate-600"
        role="combobox"
        aria-expanded="false"
        aria-autocomplete="list"
      />
    `;
	}

	static dropdownPanel() {
		return `
			<div
				class="dropdown-panel absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg hidden"
				role="listbox"
			>
				<div class="recent-items-container"></div>
				<div class="suggestions-container relative h-60 overflow-hidden hidden">
					<div class="viewport absolute inset-1 overflow-auto rounded">
						<div class="items-container absolute w-full"></div>
					</div>
				</div>
			</div>
    `;
	}

	static preview() {
		return `
			<div
				class="fixed hidden z-[100] bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-600 pointer-events-none"
				role="tooltip"
			></div>
    `;
	}

	static previewImage(src) {
		return `
			<img class="w-48 h-48 object-cover rounded" src="${src}" />
		`;
	}

	static itemTemplate(item, isSelected = false, style = '') {
		return `
			<div
				style="${style}"
				class="group absolute w-full flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-slate-700 data-[selected]:bg-slate-700"
				data-item-id="${item.id}"
				${isSelected ? 'data-selected="true"' : ''}
			>
				<img class="w-5 h-5 rounded border-slate-500" src="${item.images?.icon}" alt="${item.label}">
				<span class="text-sm text-white flex-1">${item.label}</span>
				<span class="material-symbols-rounded text-[18px] text-white hidden group-[[data-selected]]:block">check</span>
			</div>
    `;
	}

	static selectedItemTemplate(item) {
		return `
      <span class="text-xs text-slate-200 px-2 py-1 flex items-center gap-1 bg-slate-700 rounded" data-item-id="${item.id}">
        ${item.label}
        <span class="material-symbols-rounded text-[14px]">close</span>
      </span>
    `;
	}

	static loadingIndicator(style = '') {
		return `
      <div class="w-full flex justify-center p-4" style="${style}">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;
	}

	/// history panel

	static recentSection(items) {
		return `
      <div class="p-2 border-b border-slate-600">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-300">Recent</span>
          <button class="text-xs text-blue-400 hover:text-blue-300" data-action="toggle-history">
            View History
          </button>
        </div>
        <div class="flex gap-2 overflow-x-auto pb-2">
          ${items.map((item) => this.recentItem(item)).join('')}
        </div>
      </div>
    `;
	}

	static recentItem(item) {
		return `
      <div
        class="flex flex-col items-center gap-2 w-1/5 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-600"
        data-item-id="${item.id}"
        data-recent-item
      >
        <img src="${item.images?.icon}" class="w-7 h-7" alt="">
        <span class="text-sm text-white whitespace-nowrap">${item.label}</span>
      </div>
    `;
	}

	static historySection(items) {
		return `
			<div class="p-2 border-b border-slate-600">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-slate-300 flex items-center gap-1">
						<span class="material-symbols-rounded text-[16px]" role="button" data-action="toggle-history" >arrow_back</span>
						History
					</span>
					<button class="text-xs text-blue-400 hover:text-blue-300" data-action="clear-history">
						Clear History
					</button>
				</div>
				${
					items.length > 0
						? `
						<div class="space-y-1 h-60 overflow-auto">
							${items.map((item) => this.historyItem(item)).join('')}
						</div>
					`
						: ''
				}
			</div>
    `;
	}

	static historyItem(item) {
		return `
      <div
        class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-700"
        data-item-id="${item.id}"
        data-history-item
      >
        <img src="${item.images?.icon}" class="w-5 h-5 rounded border-slate-500" alt="">
        <span class="text-sm text-white">${item.label}</span>
        <span class="ml-auto text-xs text-slate-400">
          ${formatTimestamp(item.timestamp)}
        </span>
      </div>
    `;
	}
}
