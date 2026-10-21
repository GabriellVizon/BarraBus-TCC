(function () {

    var state = {
        pontos: [],
        horarios: [],
        userPosition: null,
        gpsDenied: (typeof getGpsDeniedPersisted === 'function') ? getGpsDeniedPersisted() : false,
        selectedPointId: null,
        visibleCount: 5,
        nearbyVisibleCount: 1,
        nearbyExpanded: false,
        nearbyResizeObserver: null,
        scheduleExpanded: false,
        map: null,
        markerLayer: null,
        userMarker: null,
        markers: new Map(),
        distanceCache: null,
        scheduleDiaTab: getCurrentDayType(),
        scheduleFollowsToday: true,
    };

    var els = {
        searchInput: document.getElementById('searchInput'),
        searchBox: document.getElementById('searchBox'),
        searchResults: document.getElementById('searchResults'),
        searchMobileBtn: document.getElementById('searchMobileBtn'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        pointsGrid: document.getElementById('pointsGrid'),
        nearbyPriorityGrid: document.getElementById('nearbyPriorityGrid'),
        nearbyPriorityStatus: document.getElementById('nearbyPriorityStatus'),
        nearbyPriorityActions: document.getElementById('nearbyPriorityActions'),
        circularPointsSection: document.getElementById('circularPointsSection'),
        circularPointsCount: document.getElementById('circularPointsCount'),
        pageSubtitle: document.getElementById('pageSubtitle'),
        selectedPointName: document.getElementById('selectedPointName'),
        selectedDistance: document.getElementById('selectedDistance'),
        selectedAddress: document.getElementById('selectedAddress'),
        selectedLine: document.getElementById('selectedLine'),
        selectedNext: document.getElementById('selectedNext'),
        locationStatus: document.getElementById('locationStatus'),
        scheduleTable: document.getElementById('scheduleTable'),
        scheduleNote: document.getElementById('scheduleNote'),
        scheduleDynamicContent: document.getElementById('scheduleDynamicContent'),
        routeMap: document.getElementById('routeMap'),
        mapBtn: document.getElementById('mapBtn'),
    };

    init();

    async function init() {
        state.distanceCache = createDistanceCache(
            function () { return state.pontos; },
            function () { return state.userPosition; }
        );
        bindEvents();
        setupNearbyResponsiveObserver();
        setupBackToTop();
        setupOfflineDetection();

        if (typeof Reminders !== 'undefined') {
            Reminders.init({
                onFire: function (reminder) {
                    showToast('Lembrete: ' + reminder.stopName + ' — ônibus das ' + reminder.departure + ' em ' + reminder.minutesBefore + ' min.');
                }
            });
        }
        setInterval(refreshLiveDepartures, 30000);
        observeLocationPermission(function () {
            state.gpsDenied = true;
            clearUserLocation();
            if (els.locationStatus) els.locationStatus.textContent = 'GPS INDISPONÍVEL';
        });
        setInterval(verificarPermissaoLocalizacao, 5 * 60 * 1000);

        var cached = loadCache();
        var modalInited = false;
        function initModalOnce() {
            if (modalInited) return;
            modalInited = true;
            Modal.init({
                resolvePoint: function (id) { return state.pontos.find(function (p) { return String(p.id) === String(id); }); },
                getUserPosition: function () { return state.userPosition; },
                requestLocation: requestLocation,
                onPointSelected: function (id) { selectPoint(Number(id), true); },
                onFavToggle: function () {
                    render();
                    document.querySelectorAll('.fav-btn').forEach(function (btn) {
                        var id = btn.getAttribute('data-id');
                        if (!id) return;
                        var isFav = Favorites.isFavorite(id);
                        btn.classList.toggle('favorited', isFav);
                        var icon = btn.querySelector('i');
                        if (icon) {
                            icon.classList.remove('ti-heart', 'ti-heart-filled');
                            icon.classList.add(isFav ? 'ti-heart-filled' : 'ti-heart');
                        }
                    });
                }
            });
        }

        try {
            if (cached) {
                state.pontos = Array.isArray(cached.pontos) ? cached.pontos : [];
                state.horarios = Array.isArray(cached.horarios) ? cached.horarios : [];
                if (typeof setPontosCircular === 'function') setPontosCircular(state.pontos);
                state.distanceCache.invalidate();
                initModalOnce();
                hideSplash();
            } else if (els.pointsGrid) {
                renderSkeletons(els.pointsGrid, 5);
            }

            await loadData();
            initModalOnce();
            initMap();
            renderMapMarkers();
            render();
            renderScheduleCard();
            verificarPermissaoLocalizacao();
        } catch (error) {
            console.error(error);
            if (!cached) cached = loadCache();
            if (cached) {
                state.pontos = Array.isArray(cached.pontos) ? cached.pontos : [];
                state.horarios = Array.isArray(cached.horarios) ? cached.horarios : [];
                if (typeof setPontosCircular === 'function') setPontosCircular(state.pontos);
                state.distanceCache.invalidate();
                initModalOnce();
                initMap();
                renderMapMarkers();
                render();
                renderScheduleCard();
                verificarPermissaoLocalizacao();
            } else {
                if (els.pointsGrid) els.pointsGrid.innerHTML = '<div class="empty-state">Não foi possível carregar os pontos. Verifique sua conexão e tente atualizar a página.</div>';
                if (els.pageSubtitle) els.pageSubtitle.textContent = 'Erro ao carregar os dados dos pontos.';
            }
        }
        hideSplash();
    }

    function loadData() {
        return Promise.all([fetch('./dados/pontos.json'), fetch('./dados/horarios.json')]).then(function (responses) {
            if (!responses[0].ok || !responses[1].ok) throw new Error('Falha ao carregar os arquivos de dados da Circular.');
            return Promise.all([responses[0].json(), responses[1].json()]);
        }).then(function (data) {
            state.pontos = Array.isArray(data[0]) ? data[0] : [];
            state.horarios = Array.isArray(data[1]) ? data[1] : [];
            if (typeof setPontosCircular === 'function') setPontosCircular(state.pontos);
            if (state.distanceCache) state.distanceCache.invalidate();
            saveCache(state.pontos, state.horarios);
            var validIds = state.pontos.map(function (p) { return String(p.id); });
            if (typeof Favorites !== 'undefined' && Favorites.pruneFavorites) Favorites.pruneFavorites(validIds);
            if (typeof Reminders !== 'undefined' && Reminders.pruneForStops) Reminders.pruneForStops(validIds);
        });
    }

    function refresh() {
        var splash = document.getElementById('splash');
        if (splash) splash.classList.remove('hide');
        loadData().then(function () {
            renderMapMarkers();
            render();
            renderScheduleCard();
            verificarPermissaoLocalizacao();
            hideSplash();
        }).catch(function () { hideSplash(); });
    }

    function bindEvents() {
        if (els.searchInput) {
            var searchTimer;
            els.searchInput.addEventListener('input', function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () { render(); renderSearchSuggestions(); }, 200);
            });
            els.searchInput.addEventListener('focus', renderSearchSuggestions);
        }
        if (els.searchMobileBtn) {
            els.searchMobileBtn.addEventListener('click', function () {
                toggleMobileSearch(true);
                if (els.searchInput) els.searchInput.focus();
            });
        }
        if (els.mobileMenuBtn) els.mobileMenuBtn.addEventListener('click', openSidebar);
        if (els.sidebarOverlay) els.sidebarOverlay.addEventListener('click', closeSidebar);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { closeSidebar(); hideSearchSuggestions(); }
        });
        setupMobileSearchDismiss();
        document.addEventListener('click', function (event) {
            if (!event.target.closest('.search-box, #searchMobileBtn')) {
                hideSearchSuggestions();
                toggleMobileSearch(false);
            }
            if (event.target.closest('.sidebar-link')) closeSidebar();
        });
        if (els.pointsGrid) {
            els.pointsGrid.addEventListener('click', function (event) {
                var favBtn = event.target.closest('.fav-btn');
                if (favBtn) { event.stopPropagation(); handleFavClick(favBtn); return; }
                var card = event.target.closest('[data-point-id]');
                if (!card) return;
                var tapped = Number(card.dataset.pointId);
                if (state.selectedPointId === tapped) { deselectPoint(false); return; }
                cardClickEffect(card, function () { openPointModal(tapped); });
            });
        }
        if (els.nearbyPriorityGrid) {
            els.nearbyPriorityGrid.addEventListener('click', function (event) {
                var card = event.target.closest('[data-point-id]');
                if (!card) return;
                var id = Number(card.dataset.pointId);
                if (state.selectedPointId === id) deselectPoint(false);
                else selectPoint(id, false);
            });
        }
        if (els.nearbyPriorityActions) {
            els.nearbyPriorityActions.addEventListener('click', function (event) {
                if (!event.target.closest('#nearbyPriorityToggle')) return;
                state.nearbyExpanded = !state.nearbyExpanded;
                renderNearbyPriority(getFilteredPoints());
            });
        }
        if (els.mapBtn) {
            els.mapBtn.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopImmediatePropagation();
                fitMapToPoints();
            }, true);
        }
        var fabBtn = document.getElementById('fabBtn');
        if (fabBtn) fabBtn.addEventListener('click', refresh);
        var searchIcon = document.querySelector('#searchBox .ti-search');
        if (searchIcon) searchIcon.addEventListener('click', function (event) {
            event.stopPropagation();
            if (els.searchInput) els.searchInput.focus();
        });
    }

    function handleFavClick(favBtn) {
        var id = favBtn.dataset.id;
        Favorites.toggleFavorite(id);
        var isFav = Favorites.isFavorite(id);
        favBtn.classList.toggle('favorited', isFav);
        var icon = favBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('ti-heart', 'ti-heart-filled');
            icon.classList.add(isFav ? 'ti-heart-filled' : 'ti-heart');
        }
        favBtn.classList.remove('fill', 'empty');
        void favBtn.offsetWidth;
        favBtn.classList.add(isFav ? 'fill' : 'empty');
        document.querySelectorAll('.fav-btn').forEach(function (btn) {
            if (btn === favBtn) return;
            var bid = btn.getAttribute('data-id');
            if (!bid) return;
            var bFav = Favorites.isFavorite(bid);
            btn.classList.toggle('favorited', bFav);
            var bIcon = btn.querySelector('i');
            if (bIcon) {
                bIcon.classList.remove('ti-heart', 'ti-heart-filled');
                bIcon.classList.add(bFav ? 'ti-heart-filled' : 'ti-heart');
            }
        });
    }

    function openSidebar() {
        if (els.sidebar) els.sidebar.classList.add('open');
        if (els.sidebarOverlay) els.sidebarOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (els.sidebar) els.sidebar.classList.remove('open');
        if (els.sidebarOverlay) els.sidebarOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    function renderSuggestionsList(results) {
        if (!els.searchResults) return;
        if (!results.length) {
            els.searchResults.innerHTML = '<div class="search-result-empty">Nenhum ponto encontrado</div>';
        } else {
            els.searchResults.innerHTML = results.map(function (ponto) {
                return '<div class="search-result-item" data-point-id="' + ponto.id + '">' +
                    '<div class="search-result-name"><i class="ti ti-map-pin"></i>' + escapeHtml(ponto.nome) + '</div>' +
                    '<div class="search-result-desc">' + escapeHtml(ponto.endereco || '') + ' - ' + escapeHtml(ponto.bairro || '') + '</div></div>';
            }).join('');
        }
        els.searchResults.classList.add('show');
        els.searchResults.querySelectorAll('[data-point-id]').forEach(function (item) {
            item.addEventListener('click', function () {
                openPointModal(Number(item.dataset.pointId));
                if (els.searchInput) els.searchInput.value = '';
                hideSearchSuggestions();
                render();
            });
        });
    }

    function renderSearchSuggestions() {
        if (!els.searchResults || !els.searchInput) return;
        var term = normalize(els.searchInput.value);
        var results = getFilteredPoints();
        if (term) results = results.filter(function (ponto) {
            return normalize([ponto.nome, ponto.endereco, ponto.bairro, (ponto.apelidos || []).join(' ')].join(' ')).includes(term);
        });
        else results = getDiverseSuggestions();
        renderSuggestionsList(results.slice(0, 10));
    }

    function hideSearchSuggestions() {
        if (!els.searchResults) return;
        els.searchResults.classList.remove('show');
        els.searchResults.innerHTML = '';
    }

    function clearUserLocation() {
        state.userPosition = null;
        if (state.userMarker) { state.userMarker.remove(); state.userMarker = null; }
        if (state.distanceCache) state.distanceCache.invalidate();
        render();
        if (typeof Modal !== 'undefined') Modal.refreshLocation();
        if (els.selectedDistance && state.selectedPointId) els.selectedDistance.textContent = 'Distância indisponível';
    }

    function requestLocation() {
        if (!navigator.geolocation) {
            clearUserLocation();
            if (els.locationStatus) els.locationStatus.textContent = 'SEM GPS';
            return;
        }
        if (els.locationStatus) els.locationStatus.textContent = 'PEDINDO GPS';
        navigator.geolocation.getCurrentPosition(function (position) {
            state.userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
            state.gpsDenied = false;
            if (typeof setGpsDeniedPersisted === 'function') setGpsDeniedPersisted(false);
            if (state.distanceCache) state.distanceCache.invalidate();
            if (els.locationStatus) els.locationStatus.textContent = 'GPS ATIVO';
            updateUserMarker();
            render();
            if (!state.selectedPointId) selectNearestPoint();
            Modal.refreshLocation();
            if (state.selectedPointId && els.selectedDistance) {
                var selected = state.pontos.find(function (p) { return Number(p.id) === Number(state.selectedPointId); });
                if (selected) els.selectedDistance.textContent = getDistanceText(selected);
            }
        }, function (error) {
            clearUserLocation();
            if (state.distanceCache) state.distanceCache.invalidate();
            state.gpsDenied = error && error.code === error.PERMISSION_DENIED;
            if (typeof setGpsDeniedPersisted === 'function') setGpsDeniedPersisted(state.gpsDenied);
            if (els.locationStatus) els.locationStatus.textContent = state.gpsDenied ? 'GPS NEGADO' : 'GPS INDISPONÍVEL';
            render();
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    }

    function verificarPermissaoLocalizacao() {
        if (state.userPosition) return;
        var pedir = typeof shouldRequestLocation === 'function' ? shouldRequestLocation() : Promise.resolve(true);
        pedir.then(function (podePedir) {
            if (podePedir) { requestLocation(); return; }
            clearUserLocation();
            state.gpsDenied = true;
            if (typeof setGpsDeniedPersisted === 'function') setGpsDeniedPersisted(true);
            if (els.locationStatus) els.locationStatus.textContent = 'GPS NEGADO';
            render();
        });
    }

    function render() {
        if (!els.pointsGrid) return;
        var ordered = getFilteredPoints();
        renderNearbyPriority(ordered);
        var pontos = state.userPosition ? ordered.slice(5) : ordered;
        var limit = 5;
        var expanded = pontos.length > limit && state.visibleCount >= pontos.length;
        var visible = expanded ? pontos : pontos.slice(0, limit);
        var count = document.getElementById('circularPointsCount');
        if (count) count.textContent = pontos.length + (pontos.length === 1 ? ' ponto' : ' pontos');
        if (els.pageSubtitle) els.pageSubtitle.textContent = state.userPosition ? 'Pontos ordenados pela distância da sua localização.' : 'Permita a localização para destacar os pontos mais próximos.';
        if (!pontos.length) showEmpty(els.pointsGrid, state.userPosition ? 'Não há outros pontos para mostrar.' : 'Nenhum ponto encontrado para essa busca.');
        else els.pointsGrid.innerHTML = visible.map(function (p) { return renderPointCard(p, 'circular'); }).join('');
        var container = document.getElementById('showMoreContainer');
        if (container) {
            if (pontos.length > limit) {
                container.innerHTML = '<button class="show-more-btn" id="showMoreBtn" type="button" aria-expanded="' + expanded + '"><i class="ti ti-' + (expanded ? 'minus' : 'plus') + '"></i>' + (expanded ? 'Mostrar menos pontos' : 'Mostrar mais ' + (pontos.length - limit) + ' pontos') + '</button>';
                container.querySelector('#showMoreBtn').addEventListener('click', function () {
                    state.visibleCount = expanded ? limit : pontos.length;
                    render();
                    if (expanded) document.getElementById('circularPointsSection').scrollIntoView({behavior:'smooth',block:'start'});
                });
            } else container.innerHTML = '';
        }
        markSelectedCard();
        if (state.userPosition) renderNearbyPriority(getFilteredPoints());
    }

    /* ========================================
       POINT RENDER
       ======================================== */

    function renderPointCard(ponto) {
        var next = typeof apresentarProximaCircular === 'function' ? apresentarProximaCircular(ponto.id) : { encontrado: false, label: 'Sem horário' };
        var nextClass = next.encontrado && next.situacao === 'no_ponto' ? 'now' : 'waiting';
        var selected = Number(ponto.id) === Number(state.selectedPointId) ? ' selected' : '';
        var isFav = typeof Favorites !== 'undefined' && Favorites.isFavorite(String(ponto.id));
        var distancia = getDistanceText(ponto);
        var nextLabel = next.encontrado ? next.label : (next.label || 'Sem horário');
        return [
            '<div class="point-card' + selected + '" data-point-id="' + ponto.id + '">',
            '<div class="point-card-header"><div class="point-card-title-row"><h3 class="point-card-title">' + escapeHtml(ponto.nome) + '</h3></div>',
            '<div class="card-header-right"><span class="point-distance">' + escapeHtml(distancia) + '</span>',
            '<button class="fav-btn' + (isFav ? ' favorited' : '') + '" data-id="' + ponto.id + '" aria-label="' + (isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '"><i class="ti ti-' + (isFav ? 'heart-filled' : 'heart') + '"></i></button></div></div>',
            '<p class="point-address">' + escapeHtml(ponto.endereco || '') + '</p>',
            '<div class="point-next-bus" style="border-left:3px solid ' + BUS_COLOR + '"><span class="point-next-label"><i class="ti ti-bus" style="color:' + BUS_COLOR + '"></i> Próximo horário</span><span class="point-next-time ' + nextClass + '">' + escapeHtml(nextLabel) + '</span></div>',
            '<div class="point-meta"><span class="point-chip">' + escapeHtml(ponto.bairro || '—') + '</span></div>',
            '</div>'
        ].join('');
    }

    function getDistanceText(ponto) {
        if (!state.userPosition) return 'Distância indisponível';
        var withDist = state.distanceCache && ponto ? state.distanceCache.forSingle(ponto) : ponto;
        if (!withDist || withDist.distancia === undefined) {
            var arranged = pontosComDistancia([ponto], state.userPosition);
            withDist = arranged && arranged[0] ? arranged[0] : ponto;
        }
        return typeof withDist.distancia === 'number' ? formatDistance(withDist.distancia) : 'Distância indisponível';
    }

    function openPointModal(pointId) {
        var ponto = state.pontos.find(function (p) { return Number(p.id) === Number(pointId); });
        if (!ponto) return;
        var pass = typeof encontrarPassagens === 'function' ? encontrarPassagens(ponto.id) : { encontrado: false, mensagem: 'Sem horário' };
        var next = pass.encontrado
            ? { time: pass.horario, label: pass.label, minutes: pass.minutosRestantes, faixa: pass.faixa, aviso: pass.aviso, tipo: pass.tipo, situacao: pass.situacao }
            : { time: '--', label: pass.mensagem || 'Sem horário', minutes: Infinity, faixa: null };
        var distancia = state.userPosition && hasCoords(ponto)
            ? distanceKm(state.userPosition.lat, state.userPosition.lng, Number(ponto.lat), Number(ponto.lng))
            : null;
        var allLinePoints = state.pontos.slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
        Modal.open({
            ponto: ponto,
            next: next,
            horarios: obterHorariosDoPonto(ponto.id),
            lineColor: BUS_COLOR,
            distancia: distancia,
            isFav: typeof Favorites !== 'undefined' && Favorites.isFavorite(String(ponto.id)),
            allLinePoints: allLinePoints,
            onMainMapFocus: function (p) {
                if (hasCoords(p) && state.map) {
                    state.map.invalidateSize();
                    state.map.setView([Number(p.lat), Number(p.lng)], 16, { animate: true });
                    var marker = state.markers.get(String(p.id));
                    if (marker) marker.openPopup();
                }
            }
        });
        selectPoint(Number(pointId), true);
    }

    function selectPoint(pointId, silent) {
        var ponto = state.pontos.find(function (item) { return Number(item.id) === Number(pointId); });
        if (!ponto) return;
        state.selectedPointId = Number(pointId);
        state.scheduleDiaTab = getCurrentDayType();
        state.scheduleFollowsToday = true;
        if (els.selectedPointName) els.selectedPointName.textContent = ponto.nome;
        if (els.selectedDistance) els.selectedDistance.textContent = getDistanceText(ponto);
        if (els.selectedAddress) els.selectedAddress.textContent = (ponto.endereco || '') + ' - ' + (ponto.bairro || '');
        renderScheduleCard();
        markSelectedCard();
        focusPointOnMap(ponto);
        if (!silent) {
            var detailCard = document.querySelector('.line-detail-card');
            if (detailCard) detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function deselectPoint(silent) {
        if (state.selectedPointId == null) return;
        state.selectedPointId = null;
        state.scheduleDiaTab = getCurrentDayType();
        state.scheduleFollowsToday = true;
        if (els.selectedPointName) els.selectedPointName.textContent = 'Nenhum ponto selecionado';
        if (els.selectedDistance) els.selectedDistance.textContent = 'Aguardando localização';
        if (els.selectedAddress) els.selectedAddress.textContent = 'Permita o GPS para ordenar por proximidade.';
        renderScheduleCard();
        markSelectedCard();
        if (!silent) {
            var detailCard = document.querySelector('.line-detail-card');
            if (detailCard) detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function initMap() {
        if (!els.routeMap || typeof L === 'undefined') return;

        state.map = L.map(els.routeMap, {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([-22.4946, -48.5588], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(state.map);

        state.markerLayer = L.layerGroup().addTo(state.map);
        setTimeout(function () {
            state.map.invalidateSize();
            fitMapToPoints();
        }, 100);
    }

    function createLineMarker(lat, lng, color) {
        var c = color || BUS_COLOR;
        var svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">',
            '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="' + c + '"/>',
            '<circle cx="12" cy="12" r="4.5" fill="#fff"/>',
            '</svg>'
        ].join('');
        return L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml,' + encodeURIComponent(svg),
                iconSize: [24, 36],
                iconAnchor: [12, 36],
                popupAnchor: [0, -36]
            })
        });
    }

    function enableMarkerKeyboard(marker, ponto, onActivate) {
        marker.on('add', function () {
            var el = marker.getElement();
            if (!el) return;
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', ponto.nome + ' - ' + ponto.endereco);
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(ponto.id); }
            });
        });
    }

    function renderMapMarkers() {
        if (!state.map || !state.markerLayer) return;
        state.markerLayer.clearLayers();
        state.markers.clear();
        state.pontos.filter(hasCoords).forEach(function (ponto) {
            var marker = createLineMarker(Number(ponto.lat), Number(ponto.lng), BUS_COLOR)
                .bindPopup('<strong>' + escapeHtml(ponto.nome) + '</strong><br>' + escapeHtml(ponto.endereco || '') + '<br>' + escapeHtml(ponto.bairro || ''))
                .on('click', function () { openPointModal(ponto.id); });
            enableMarkerKeyboard(marker, ponto, openPointModal);
            marker.addTo(state.markerLayer);
            state.markers.set(String(ponto.id), marker);
        });
    }

    function focusPointOnMap(ponto) {
        if (!state.map || !hasCoords(ponto)) return;
        var latLng = [Number(ponto.lat), Number(ponto.lng)];
        state.map.invalidateSize();
        state.map.setView(latLng, 16, { animate: true });
        var marker = state.markers.get(String(ponto.id));
        if (marker) marker.openPopup();
    }

    function fitMapToPoints() {
        if (!state.map) return;
        var allPoints = state.pontos.filter(hasCoords);
        if (!allPoints.length) return;
        state.map.invalidateSize();
        var bounds = L.latLngBounds(allPoints.map(function (ponto) { return [Number(ponto.lat), Number(ponto.lng)]; }));
        if (state.userPosition) bounds.extend([state.userPosition.lat, state.userPosition.lng]);
        state.map.fitBounds(bounds, { padding: [22, 22], maxZoom: 15 });
    }

    function updateUserMarker() {
        if (!state.map || !state.userPosition) return;

        var latLng = [state.userPosition.lat, state.userPosition.lng];
        if (state.userMarker) {
            state.userMarker.setLatLng(latLng);
            return;
        }

        state.userMarker = L.circleMarker(latLng, {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: '#22c55e',
            fillOpacity: 1
        }).addTo(state.map).bindPopup('<strong>Sua localização</strong>');
    }

    /* ========================================
       NEARBY PRIORITY
       ======================================== */
    function selectNearestPoint() {
        if (!state.userPosition) return;
        var nearest = getFilteredPoints().filter(function (p) { return hasCoords(p) && typeof p.distancia === 'number'; })[0];
        if (nearest) selectPoint(nearest.id, true);
    }

    function getNearbyColumnCount(width) {
        if (width < 600) return 1;
        if (width < 1000) return 2;
        if (width < 1250) return 3;
        if (width < 1500) return 4;
        return 5;
    }

    function setupNearbyResponsiveObserver() {
        if (!els.nearbyPriorityGrid || typeof ResizeObserver === 'undefined') return;
        var scheduled = false;
        state.nearbyResizeObserver = new ResizeObserver(function (entries) {
            if (scheduled || !entries.length) return;
            scheduled = true;
            requestAnimationFrame(function () {
                scheduled = false;
                var width = entries[0].contentRect.width || els.nearbyPriorityGrid.clientWidth;
                var nextCount = getNearbyColumnCount(width);
                if (nextCount !== state.nearbyVisibleCount) {
                    state.nearbyVisibleCount = nextCount;
                    renderNearbyPriority(getFilteredPoints());
                }
            });
        });
        state.nearbyResizeObserver.observe(els.nearbyPriorityGrid);
        state.nearbyVisibleCount = getNearbyColumnCount(els.nearbyPriorityGrid.clientWidth);
    }

    function renderNearbyPriority(ordered) {
        if (!els.nearbyPriorityGrid) return;
        if (!state.userPosition) {
            els.nearbyPriorityGrid.style.setProperty('--nearby-columns', '1');
            var gpsMsg = state.gpsDenied
                ? gpsDeniedHelp()
                : 'Você pode pesquisar pontos e consultar horários. Ative a localização para ver as distâncias.';
            els.nearbyPriorityGrid.innerHTML = '<div class="nearby-priority-empty"><i class="ti ti-location"></i><span>' + escapeHtml(gpsMsg) + '</span></div>';
            if (els.nearbyPriorityStatus) els.nearbyPriorityStatus.textContent = state.gpsDenied ? 'GPS negado' : 'Localização indisponível';
            if (els.nearbyPriorityActions) {
                els.nearbyPriorityActions.innerHTML = '<button type="button" class="nearby-toggle-btn" id="nearbyGpsRetry"><i class="ti ti-refresh"></i>Tentar novamente</button>';
                var retry = els.nearbyPriorityActions.querySelector('#nearbyGpsRetry');
                if (retry) retry.addEventListener('click', function () { requestLocation(); });
            }
            return;
        }
        var allNearby = ordered.filter(function (p) {
            return hasCoords(p) && typeof p.distancia === 'number';
        }).slice(0, 5);
        var fitCount = Math.max(1, Math.min(5, state.nearbyVisibleCount || 1));
        var visible = state.nearbyExpanded ? allNearby : allNearby.slice(0, fitCount);
        var hiddenCount = Math.max(0, allNearby.length - visible.length);
        var columns = state.nearbyExpanded ? Math.min(fitCount, allNearby.length) : Math.min(fitCount, visible.length);
        els.nearbyPriorityGrid.style.setProperty('--nearby-columns', String(Math.max(1, columns)));
        if (els.nearbyPriorityStatus) {
            els.nearbyPriorityStatus.textContent = 'Mostrando ' + visible.length + ' de ' + allNearby.length;
        }
        els.nearbyPriorityGrid.innerHTML = visible.map(function (p, index) {
            var badge = index === 0
                ? '<span class="nearby-rank nearest">Mais próximo</span>'
                : '<span class="nearby-rank">' + (index + 1) + 'º mais próximo</span>';
            return '<button type="button" class="nearby-card' + (p.id === state.selectedPointId ? ' selected' : '') + '" data-point-id="' + p.id + '" aria-label="Selecionar ' + escapeAttr(p.nome) + '">' +
                '<span class="nearby-card-top">' + badge + '<strong>' + escapeHtml(formatDistance(p.distancia)) + '</strong></span>' +
                '<span class="nearby-card-name">' + escapeHtml(p.nome) + '</span>' +
                '<span class="nearby-card-address">' + escapeHtml(p.endereco || '') + '</span></button>';
        }).join('');
        if (els.nearbyPriorityActions) {
            if (allNearby.length > fitCount) {
                els.nearbyPriorityActions.innerHTML = '<button type="button" class="nearby-toggle-btn" id="nearbyPriorityToggle" aria-expanded="' + state.nearbyExpanded + '">' +
                    '<i class="ti ti-' + (state.nearbyExpanded ? 'minus' : 'plus') + '"></i>' +
                    (state.nearbyExpanded ? 'Mostrar menos' : 'Mostrar mais ' + hiddenCount) + '</button>';
            } else {
                els.nearbyPriorityActions.innerHTML = '';
            }
        }
    }

    /* ========================================
       SCHEDULE CARD (Circular)
       ======================================== */

    function computeNextForSchedule() {
        if (state.selectedPointId && typeof encontrarPassagens === 'function') {
            var pass = encontrarPassagens(state.selectedPointId, null, state.scheduleDiaTab);
            if (pass.encontrado) return { time: pass.horario, label: pass.label, minutes: pass.minutosRestantes, situacao: pass.situacao };
            return { time: '--', label: pass.mensagem || 'Sem horário', minutes: Infinity };
        }
        return { time: '--', label: 'Selecione um ponto', minutes: Infinity };
    }

    function renderScheduleCard() {
        var next = computeNextForSchedule();
        var heading = document.getElementById('selectedNextHeading');
        if (heading) heading.textContent = 'PRÓXIMO HORÁRIO';
        if (els.selectedLine) els.selectedLine.textContent = 'Rota Circular';
        if (els.selectedNext) els.selectedNext.textContent = state.selectedPointId ? next.label : 'Selecione um ponto';
        renderScheduleTable();
        if (els.scheduleNote) {
            if (state.selectedPointId && next.time && next.time !== '--') els.scheduleNote.textContent = 'Horário destacado indica a próxima saída.';
            else if (!state.selectedPointId) els.scheduleNote.textContent = 'Horários gerais da linha. Selecione um ponto para ver a próxima saída.';
            else els.scheduleNote.textContent = 'Selecione um ponto para ver a próxima saída.';
        }
    }

    function renderScheduleTable() {
        var container = els.scheduleDynamicContent;
        if (!container) return;
        var previousDetails = container.querySelector('details');
        var wasOpen = previousDetails && previousDetails.open;
        var days = diasComHorariosCircular();
        var html = '<div class="schedule-day-tabs">' + days.map(function (day) {
            return '<button type="button" class="schedule-day-tab' + (day.id === state.scheduleDiaTab ? ' active' : '') + '" aria-pressed="' + (day.id === state.scheduleDiaTab) + '" data-dia="' + day.id + '">' + escapeHtml(day.nome) + '</button>';
        }).join('') + '</div><div class="circular-schedule-body">' + CircularUI.schedule(state.selectedPointId, state.scheduleDiaTab, state.scheduleExpanded) + '</div>';
        container.innerHTML = html;
        var details = container.querySelector('details');
        if (details && wasOpen) details.open = true;
        container.querySelectorAll('[data-dia]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                state.scheduleFollowsToday = false;
                state.scheduleDiaTab = btn.dataset.dia;
                state.scheduleExpanded = false;
                renderScheduleCard();
            });
        });
        var expand = container.querySelector('#scheduleFutureToggle');
        if (expand) expand.addEventListener('click', function () {
            state.scheduleExpanded = !state.scheduleExpanded;
            renderScheduleTable();
        });
    }


    function getFilteredPoints() {
        var term = normalize(els.searchInput ? els.searchInput.value : '');
        var lista = state.distanceCache ? state.distanceCache.getAll() : pontosComDistancia(state.pontos, state.userPosition);

        if (term) {
            lista = lista.filter(function (ponto) {
                return normalize([ponto.nome, ponto.endereco, ponto.bairro, (ponto.apelidos || []).join(" ")].join(' ')).includes(term);
            });
        }

        var sortMode = state.distanceCache ? state.distanceCache.getSortMode() : 'ordem';
        return sortPointsByContext(lista, sortMode);
    }

    function getDiverseSuggestions() {
        var lista = getFilteredPoints();
        var seenBairros = {};
        var result = [];
        for (var i = 0; i < lista.length; i++) {
            if (result.length >= 10) break;
            var ponto = lista[i];
            var bairroKey = normalize(ponto.bairro || ponto.nome);
            if (!seenBairros[bairroKey]) { result.push(ponto); seenBairros[bairroKey] = true; }
        }
        return result.slice(0, 10);
    }

    function markSelectedCard() {
        document.querySelectorAll('[data-point-id]').forEach(function (card) {
            card.classList.toggle('selected', Number(card.dataset.pointId) === state.selectedPointId);
        });
    }

    function refreshLiveDepartures() {
        if (state.scheduleFollowsToday && state.scheduleDiaTab !== getCurrentDayType()) {
            state.scheduleDiaTab = getCurrentDayType();
            renderScheduleCard();
        }
        var body = els.scheduleDynamicContent && els.scheduleDynamicContent.querySelector('.circular-schedule-body');
        if (body) {
            var oldDetails = body.querySelector('details');
            var opened = oldDetails && oldDetails.open;
            body.innerHTML = CircularUI.schedule(state.selectedPointId, state.scheduleDiaTab, state.scheduleExpanded);
            var newDetails = body.querySelector('details');
            if (newDetails && opened) newDetails.open = true;
            var expand = body.querySelector('#scheduleFutureToggle');
            if (expand) expand.addEventListener('click', function () { state.scheduleExpanded = !state.scheduleExpanded; renderScheduleTable(); });
        }
        if (state.selectedPointId != null) {
            var ponto = state.pontos.find(function (p) { return Number(p.id) === Number(state.selectedPointId); });
            if (ponto) {
                var next = computeNextForSchedule();
                if (els.selectedNext) els.selectedNext.textContent = next.label;
                if (els.scheduleDynamicContent) els.scheduleDynamicContent.querySelectorAll('.schedule-time').forEach(function (el) {
                    el.classList.toggle('active-time', el.textContent.trim() === next.time);
                });
            }
        }
        document.querySelectorAll('.point-card').forEach(function (card) {
            var cardId = Number(card.getAttribute('data-point-id'));
            var timeEl = card.querySelector('.point-next-time');
            var rangeEl = card.querySelector('.range-chip');
            var next = typeof apresentarProximaCircular === 'function' ? apresentarProximaCircular(cardId) : null;
            if (timeEl) {
                timeEl.textContent = next && next.encontrado ? next.label : (next ? next.label : 'Sem horário');
                timeEl.className = 'point-next-time ' + (next && next.situacao === 'no_ponto' ? 'now' : 'waiting');
            }
            if (rangeEl) rangeEl.textContent = next && next.encontrado && next.faixa ? '≈ ' + next.faixa.label : '';
        });
    }


})();
