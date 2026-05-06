(() => {
	const videos = Array.from(document.querySelectorAll('video.lazy-video'));
	if (videos.length === 0) return;

	const initVideo = (video) => {
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

		try {
			video.load();
			const p = video.play();
			if (p && typeof p.catch === 'function') p.catch(() => {});
		} catch {
			// silencioso
		}
	};

	const setupAutoPause = (video) => {
		if (video.dataset.autoPause === '1') return;
		video.dataset.autoPause = '1';

		const safePlay = () => {
			try {
				const p = video.play();
				if (p && typeof p.catch === 'function') p.catch(() => {});
			} catch {
				// silencioso
			}
		};

		const safePause = () => {
			try {
				video.pause();
			} catch {
				// silencioso
			}
		};

		document.addEventListener('visibilitychange', () => {
			if (document.hidden) safePause();
			else safePlay();
		});

		if ('IntersectionObserver' in window) {
			const io = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) safePlay();
						else safePause();
					}
				},
				{ threshold: 0.15 }
			);
			io.observe(video);
		}
	};

	if ('IntersectionObserver' in window) {
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					initVideo(entry.target);
					setupAutoPause(entry.target);
					io.unobserve(entry.target);
				}
			},
			{ root: null, threshold: 0.15 }
		);

		for (const v of videos) io.observe(v);
	} else {
		// Fallback: inicializa luego de la carga.
		window.addEventListener('load', () => {
			for (const v of videos) {
				initVideo(v);
				setupAutoPause(v);
			}
		});
	}
})();
