export function formatTimestamp(timestamp) {
	const now = Date.now();
	const diff = now - timestamp;
	const hours = diff / (1000 * 60 * 60);

	if (hours < 24) {
		// Show relative time for items less than 24 hours old
		return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.floor(hours), 'hour');
	} else {
		// Show full date/time for older items
		return new Intl.DateTimeFormat('en', {
			dateStyle: 'short',
			timeStyle: 'short',
		}).format(new Date(timestamp));
	}
}
