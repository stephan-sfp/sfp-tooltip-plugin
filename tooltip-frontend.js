document.addEventListener('DOMContentLoaded', () => {

    function htmlDecode( str ) {
        var txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value;
    }

    // Bare URLs klikbaar maken, maar NIET als ze al in een href-attribuut zitten
    function autoLink( str ) {
        return str.replace(
            /(?<![="'])(https?:\/\/[^\s<>"']+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
    }

    const portal = document.createElement('div');
    portal.id = 'tooltip-portal';
    document.body.appendChild(portal);

    let activeGhost = null, activeTooltip = null;

    const close = () => {
        if (activeGhost) { activeGhost.remove(); activeGhost = null; activeTooltip = null; }
    };

    document.querySelectorAll('.tooltip').forEach(tooltip => {
        tooltip.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            e.preventDefault(); e.stopPropagation();
            if (activeTooltip === tooltip) return close();
            const rawText = tooltip.getAttribute('data-tooltip'); if (!rawText) return;

            // Decodeer entiteiten → echte HTML, dan bare URLs ook klikbaar maken
            const decoded = htmlDecode( rawText );
            const linked  = autoLink( decoded );

            const ghost = document.createElement('span');
            ghost.className = 'tooltiptext';
            ghost.innerHTML = linked;
            ghost.style.display = 'block';
            ghost.style.opacity = '0';
            portal.appendChild(ghost);

            requestAnimationFrame(() => {
                const w = tooltip.getBoundingClientRect(), g = ghost.getBoundingClientRect(), y = window.pageYOffset;
                let t = w.top + y - g.height - 12;
                if (w.top < (g.height + 110)) { t = w.bottom + y + 12; ghost.classList.add('is-bottom'); }
                let l = w.left + (w.width/2) - (g.width/2), p = 20, o = 0;
                if (l < p) { o = p - l; l = p; }
                else if (l + g.width > window.innerWidth - p) { o = (window.innerWidth - p) - (l + g.width); l = window.innerWidth - p - g.width; }
                ghost.style.cssText += `left:${l}px; top:${t}px; opacity:1; pointer-events:auto;`;
                ghost.style.setProperty('--arrow-position', `calc(50% - ${o}px)`);
            });
            close(); activeGhost = ghost; activeTooltip = tooltip;
        });
    });

    document.addEventListener('click', (e) => { if (activeGhost && !activeGhost.contains(e.target)) close(); });
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close, { passive: true });
    portal.addEventListener('click', (e) => { if (!e.target.closest('a')) e.stopPropagation(); });
});
