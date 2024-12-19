import { debounce } from './debounce.js';

export class StateManager {
	#state;
	#listeners = new Set();

	constructor(initialState) {
		this.#state = new Proxy(
			{ ...initialState },
			{
				set: (target, property, value) => {
					target[property] = value;
					// simple workaround to batch updates,
					// TODO: use a more sophisticated approach for batching updates like
					// requestAnimationFrame to match the browser's rendering cycle (best)
					// transactional updates
					// microtask queue
					debounce(() => this.#notifyListeners(), 0)();
					return true;
				},
			}
		);
	}

	get state() {
		return { ...this.#state };
	}

	setState(updates) {
		Object.entries(updates).forEach(([key, value]) => {
			this.#state[key] = value;
		});
	}

	subscribe(listener) {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	#notifyListeners() {
		this.#listeners.forEach((listener) => listener(this.state));
	}
}
