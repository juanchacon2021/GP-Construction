(() => {
	const video = document.getElementById('heroVideo');
	if (!video) return;

	const prefersReducedMotion =
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// En móviles lentos o con ahorro de datos, no cargamos el video.
	const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	const saveData = !!(conn && conn.saveData);
	const effectiveType = conn && typeof conn.effectiveType === 'string' ? conn.effectiveType : '';
	const slowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

	if (prefersReducedMotion || saveData || slowNetwork) {
		return;
	}

	const init = () => {
		if (video.dataset.inited === '1') return;
		video.dataset.inited = '1';

		const optSrc = video.dataset.srcOpt;
		const fallbackSrc = video.dataset.src;

		if (optSrc) {
			const s1 = document.createElement('source');
			s1.src = optSrc;
			s1.type = 'video/mp4';
			video.appendChild(s1);
		}
		if (fallbackSrc) {
			const s2 = document.createElement('source');
			s2.src = fallbackSrc;
			s2.type = 'video/mp4';
			video.appendChild(s2);
		}

		// Forzar carga luego de insertar sources
		try {
			video.load();
			const p = video.play();
			if (p && typeof p.catch === 'function') p.catch(() => {});
		} catch {
			// silencioso
		}
	};

	// Dejar que el primer render ocurra y luego inicializar.
	if ('requestIdleCallback' in window) {
		window.requestIdleCallback(init, { timeout: 2500 });
	} else {
		window.setTimeout(init, 1200);
	}
})();
