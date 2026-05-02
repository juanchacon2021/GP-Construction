(() => {
	if (!('serviceWorker' in navigator)) return;

	// Service workers requieren http(s) o localhost.
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js').catch(() => {
			// Silencioso: si falla, el sitio igual funciona.
		});
	});
})();
