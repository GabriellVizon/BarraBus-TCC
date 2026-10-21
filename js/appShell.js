(function () {
    'use strict';

    var ESCAPE_MAP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    function _esc(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, function (c) { return ESCAPE_MAP[c]; });
    }

    function _sidebarLinks(page) {
        var links = [
            { href: 'index.html', icon: 'ti-home', label: 'INÍCIO', key: 'home' },
            { href: 'pontos.html', icon: 'ti-map-pin', label: 'PONTOS', key: 'points' }
        ];
        return links.map(function (l) {
            var active = (l.key === page) ? ' active' : '';
            return '<a href="' + _esc(l.href) + '" class="sidebar-link' + active + '">' +
                '<i class="ti ' + _esc(l.icon) + '"></i> ' + _esc(l.label) +
                '</a>';
        }).join('');
    }

    function _buildFooter() {
        return '<footer class="footer">' +
            '<div class="footer-grid">' +
                '<div class="footer-brand">' +
                    '<div class="footer-logo">' +
                        '<div class="footer-logo-icon"><i class="ti ti-bus"></i></div>' +
                        '<span>BarraBus</span>' +
                    '</div>' +
                    '<p class="footer-desc">Simplificando o transporte público em Barra Bonita com pontos, percursos e horários previstos.</p>' +
                '</div>' +
                '<div class="footer-links-group">' +
                    '<div class="footer-link-col">' +
                        '<span class="footer-link-title">NAVEGAÇÃO</span>' +
                        '<a href="index.html" class="footer-link">Home</a>' +
                        '<a href="pontos.html" class="footer-link">Horários</a>' +
                        '<a href="index.html#mapa" class="footer-link">Mapa</a>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="footer-bottom">' +
                '<span>© <span id="footerYear">' + new Date().getFullYear() + '</span> BarraBus. Todos os direitos reservados.</span>' +
                '<span>Desenvolvido para Barra Bonita, SP</span>' +
            '</div>' +
        '</footer>';
    }

    function _buildFab() {
        return '<button class="fab" id="fabBtn" aria-label="Atualizar">' +
            '<i class="ti ti-refresh"></i>' +
        '</button>';
    }

    function render(config) {
        var page = config.page || 'home';
        var contentHtml = config.contentHtml || '';
        var options = config.options || {};
        var showFooter = !!options.showFooter;
        var showFab = !!options.showFab;

        var bodyShell =
            '<a href="#main-content" class="skip-link">Pular para o conteúdo principal</a>' +

            '<div id="splash" class="splash">' +
                '<div class="splash-content">' +
                    '<div class="splash-logo">' +
                        '<img src="img/realista-point.png" alt="BarraBus" class="splash-logo-img">' +
                        '<div class="splash-ring"></div>' +
                    '</div>' +
                    '<h1 class="splash-title"><span class="splash-brand">Barra</span><span class="splash-brand red">Bus</span></h1>' +
                    '<p class="splash-sub">Carregando sua jornada<span class="splash-dots"></span></p>' +
                    '<div class="splash-progress"><div class="splash-progress-bar"></div></div>' +
                '</div>' +
            '</div>' +

            '<div id="offlineBanner" class="offline-banner" style="display:none">Você está offline</div>' +

            '<button id="backToTop" class="back-to-top" aria-label="Voltar ao topo">' +
                '<i class="ti ti-chevron-up"></i>' +
            '</button>' +

            '<div class="app-layout">' +
                '<div class="sidebar-overlay" id="sidebarOverlay"></div>' +

                '<aside class="sidebar" id="sidebar">' +
                
                    '<div class="sidebar-logo">' +
                        '<div class="sidebar-logo-icon">' +
                            '<img src="img/realista-point.png" alt="" loading="lazy" decoding="async">' +
                        '</div>' +
                    '</div>' +
                    '<div class="sidebar-label"></div>' +
                    '<nav class="sidebar-nav">' +
                        _sidebarLinks(page) +
                    '</nav>' +
                '</aside>' +

                '<main class="main" id="main-content">' +
                    '<header class="topbar">' +
                        '<button class="mobile-menu-btn" id="mobileMenuBtn" type="button" aria-label="Abrir menu">' +
                            '<i class="ti ti-menu-2"></i>' +
                        '</button>' +
                        '<a href="index.html" class="topbar-brand">' +
                            '<div class="topbar-brand-icon">' +
                                '<i class="ti ti-bus"></i>' +
                            '</div>' +
                            '<span>BarraBus</span>' +
                        '</a>' +
                        '<div class="topbar-right">' +
                            '<button class="theme-toggle" id="themeToggle" type="button" aria-label="Modo claro">' +
                                '<i class="ti ti-sun"></i>' +
                            '</button>' +
                            '<div class="search-box" id="searchBox">' +
                                '<i class="ti ti-search"></i>' +
                                '<input type="search" id="searchInput" placeholder="Buscar ponto ou bairro..." autocomplete="off" aria-label="Buscar ponto ou bairro">' +
                                '<div class="search-results" id="searchResults"></div>' +
                            '</div>' +
                            '<div class="search-icon-btn">' +
                                '<i class="ti ti-search search-icon-mobile" id="searchMobileBtn"></i>' +
                            '</div>' +
                        '</div>' +
                    '</header>' +

                    contentHtml +

                    (showFooter ? _buildFooter() : '') +
                '</main>' +
            '</div>' +

            (showFab ? _buildFab() : '');

        document.body.innerHTML = bodyShell;
        window.__splashStart = Date.now();

        if (showFooter) {
            var yearEl = document.getElementById('footerYear');
            if (yearEl) yearEl.textContent = new Date().getFullYear();
        }

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('sw.js').catch(function () { });
            });
        }
    }

    window.AppShell = {
        render: render
    };
})();
