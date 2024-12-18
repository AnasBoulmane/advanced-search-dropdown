// helper function to setup virtual scroll on an element
export class VirtualScroller {
	constructor(options) {
		this.itemHeight = options.itemHeight || 40;
		this.containerHeight = options.containerHeight || 400;
		this.bufferSize = options.bufferSize || 5;
		this.itemGap = options.itemGap || 0;
		this.totalItems = 0;
		this.scrollTop = 0;
	}

	get itemVirtualHeight() {
		return this.itemHeight + this.itemGap;
	}

	updateConfig({ scrollTop, totalItems } = {}) {
		this.scrollTop = scrollTop ?? this.scrollTop;
		this.totalItems = totalItems ?? this.totalItems;
	}

	getVisibleRange() {
		const visibleCount = Math.ceil(this.containerHeight / this.itemVirtualHeight);
		const startIndex = Math.floor(this.scrollTop / this.itemVirtualHeight);
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
		return this.totalItems * this.itemVirtualHeight;
	}

	getItemStyle(index) {
		return {
			position: 'absolute',
			top: `${index * this.itemVirtualHeight}px`,
			height: `${this.itemHeight}px`,
			left: 0,
			right: 0,
		};
	}
}
