/**
 * @class StateManager
 **/
export class StateManager {
	#state;
	#subscribers = new Map(); // Store subscribers with their dependencies
	#pendingRaf = null;
	#pendingUpdates = new Set();

	constructor(initialState) {
		this.#state = { ...initialState };
	}

	get state() {
		return { ...this.#state };
	}

	/**
	 * Updates state while batching notifications for better performance.
	 */
	setState(updates) {
		Object.entries(updates).forEach(([key, value]) => {
			this.#state[key] = value;
			this.#pendingUpdates.add(key);
		});

		this.#scheduleUpdate();
	}

	/**
	 * Subscribes to state changes with optional dependency tracking.
	 * Dependencies array allows filtering updates to only relevant state changes.
	 */
	subscribe(listener, dependencies = null) {
		// Create subscriber object that tracks both the listener and its dependencies
		const subscriber = {
			listener,
			dependencies: dependencies ? new Set(dependencies) : null,
		};

		// Generate unique identifier for this subscription
		const subscriptionId = Symbol('subscription');
		this.#subscribers.set(subscriptionId, subscriber);

		// Return unsubscribe function
		return () => {
			this.#subscribers.delete(subscriptionId);
		};
	}

	/**
	 * Using request animation frame to batch the notifications,
	 * so that the subscribers are notified only once per frame.
	 */
	#scheduleUpdate() {
		if (this.#pendingRaf) return;

		this.#pendingRaf = requestAnimationFrame(() => {
			const changedKeys = Array.from(this.#pendingUpdates);
			this.#pendingUpdates.clear();
			this.#pendingRaf = null;

			this.#notifySubscribers(changedKeys);
		});
	}

	#notifySubscribers(changedKeys) {
		const stateSnapshot = { ...this.#state };

		this.#subscribers.forEach(({ listener, dependencies }) => {
			// If no dependencies specified, always notify
			if (!dependencies) {
				listener(stateSnapshot, changedKeys);
				return;
			}

			// Check if any changed keys match subscriber's dependencies
			const hasRelevantChanges = changedKeys.some((key) => dependencies.has(key));
			if (hasRelevantChanges) {
				// Only pass the relevant changes to the listener
				const relevantChanges = changedKeys.filter((key) => dependencies.has(key));
				listener(stateSnapshot, relevantChanges);
			}
		});
	}
}
