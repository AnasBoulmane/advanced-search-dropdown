// helper function to setup virtual scroll on an element
export class VirtualScroller {
	constructor(options) {
		this.itemHeight = options.itemHeight || 40;
		this.containerHeight = options.containerHeight || 400;
		this.bufferSize = options.bufferSize || 5;
		this.totalItems = 0;
		this.scrollTop = 0;
	}

	updateConfig({ scrollTop, totalItems } = {}) {
		this.scrollTop = scrollTop ?? this.scrollTop;
		this.totalItems = totalItems ?? this.totalItems;
	}

	getVisibleRange() {
		const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
		const startIndex = Math.floor(this.scrollTop / this.itemHeight);
		const start = Math.max(0, startIndex - this.bufferSize);
		const end = Math.min(this.totalItems, startIndex + visibleCount + this.bufferSize);

		return {
			start,
			end,
			total: this.totalItems,
			visibleCount,
			scrollTop: this.scrollTop,
		};
	}

	getScrollHeight() {
		return this.totalItems * this.itemHeight;
	}

	getItemStyle(index) {
		return {
			position: 'absolute',
			top: `${index * this.itemHeight}px`,
			height: `${this.itemHeight}px`,
			left: 0,
			right: 0,
		};
	}
}
