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

    let activeGhost = null, activeTooltip = null, ghostIdCounter = 0;

    const close = () => {
        if (activeGhost) {
            activeGhost.remove();
            if (activeTooltip) {
                activeTooltip.setAttribute('aria-expanded', 'false');
                activeTooltip.removeAttribute('aria-describedby');
            }
            activeGhost = null;
            activeTooltip = null;
        }
    };

    function openTooltip( tooltip ) {
        if (activeTooltip === tooltip) return close();
        const rawText = tooltip.getAttribute('data-tooltip'); if (!rawText) return;

        // Decodeer entiteiten → echte HTML, dan bare URLs ook klikbaar maken
        const decoded = htmlDecode( rawText );
        const linked  = autoLink( decoded );

        const ghost = document.createElement('span');
        const ghostId = 'sfp-tooltip-ghost-' + (++ghostIdCounter);
        ghost.id = ghostId;
        ghost.className = 'tooltiptext';
        ghost.setAttribute('role', 'tooltip');
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

        close();
        activeGhost = ghost;
        activeTooltip = tooltip;
        tooltip.setAttribute('aria-expanded', 'true');
        tooltip.setAttribute('aria-describedby', ghostId);
    }

    document.querySelectorAll('.tooltip').forEach(tooltip => {
        // Accessibility: maak tooltip toetsenbord-bedienbaar en aankondigbaar voor schermlezers
        if (!tooltip.hasAttribute('tabindex')) tooltip.setAttribute('tabindex', '0');
        if (!tooltip.hasAttribute('role')) tooltip.setAttribute('role', 'button');
        if (!tooltip.hasAttribute('aria-label')) {
            tooltip.setAttribute('aria-label', 'Toon definitie van ' + (tooltip.textContent || '').trim().substring(0, 80));
        }
        tooltip.setAttribute('aria-expanded', 'false');

        tooltip.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            e.preventDefault(); e.stopPropagation();
            openTooltip(tooltip);
        });

        tooltip.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest && e.target.tagName === 'A') return;
                e.preventDefault();
                openTooltip(tooltip);
            }
        });
    });

    document.addEventListener('click', (e) => { if (activeGhost && !activeGhost.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && activeGhost) { const tt = activeTooltip; close(); if (tt) tt.focus(); } });
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close, { passive: true });
    portal.addEventListener('click', (e) => { if (!e.target.closest('a')) e.stopPropagation(); });
});
