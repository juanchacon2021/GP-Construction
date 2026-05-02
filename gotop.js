const goTopContainer = document.querySelector('.go-top-container');

if (goTopContainer) {
    let ticking = false;

    const updateVisibility = () => {
        const shouldShow = document.documentElement.scrollTop > 100;
        goTopContainer.classList.toggle('show', shouldShow);
    };

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            updateVisibility();
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateVisibility();

    goTopContainer.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}