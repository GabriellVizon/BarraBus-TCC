const BARRA_BONITA_CENTER = [-22.4946, -48.5588];

const state = {
  pontos: [],
  horarios: [],
  userPosition: null,
  gpsDenied: (typeof getGpsDeniedPersisted === 'function') ? getGpsDeniedPersisted() : false,
  selectedStopId: null,
  map: null,
  markerLayer: null,
  userMarker: null,
  markers: new Map(),
  distanceCache: null,
};

const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  heroBtn: document.getElementById('heroBtn'),
  searchInput: document.getElementById('searchInput'),
  searchMobileBtn: document.getElementById('searchMobileBtn'),
  searchResults: document.getElementById('searchResults'),
  nearbyStops: document.getElementById('nearbyStops'),
  nearbySubtitle: document.getElementById('nearbySubtitle'),
  favStops: document.getElementById('favoriteStops'),
  favSubtitle: document.getElementById('favSubtitle'),
  userLocationText: document.getElementById('userLocationText'),
  nearestStopText: document.getElementById('nearestStopText'),
  nextDepartureText: document.getElementById('nextDepartureText'),
  mapStatusText: document.getElementById('mapStatusText'),
  selectedStopName: document.getElementById('selectedStopName'),
  selectedStopDetails: document.getElementById('selectedStopDetails'),
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  state.distanceCache = createDistanceCache(
    function () { return state.pontos; },
    function () { return state.userPosition; }
  );
  setupNavigation();
  setupInteractions();
  initMap();
  setupSearch();
  setupBackToTop();
  setupOfflineDetection();
  observeLocationPermission(function () {
    state.gpsDenied = true;
    clearUserLocation();
    setLocationStatus('Localização indisponível', 'Busca manual disponível', '--');
  });

  if (!loadCache()) {
    renderSkeletons(els.favStops, 3);
    renderSkeletons(els.nearbyStops, 3);
  }

  if (typeof Reminders !== 'undefined') {
    Reminders.init({
      onFire: function (reminder) {
        showToast('Lembrete: ' + reminder.stopName + ' — ônibus das ' + reminder.departure + ' em ' + reminder.minutesBefore + ' min.');
      }
    });
  }
  setInterval(refreshLiveDepartures, 30000);
  setInterval(reperguntarLocalizacao, 5 * 60 * 1000);

  var cached = loadCache();
  var modalInited = false;
  function initModalOnce() {
    if (modalInited) return;
    modalInited = true;
    Modal.init({
      resolvePoint: function (id) {
        return state.pontos.find(function (p) { return p.id === id; });
      },
      getUserPosition: function () { return state.userPosition; },
      requestLocation: requestUserLocation,
      onPointSelected: selectStop,
      onFavToggle: function () {
        renderFavoriteStops();
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
      state.pontos = cached.pontos || [];
      state.horarios = cached.horarios || [];
      if (typeof setPontosCircular === 'function') setPontosCircular(state.pontos);
      if (state.distanceCache) state.distanceCache.invalidate();
      initModalOnce();
      renderAll();
      hideSplash();
    }
    await carregarDados();
    if (state.distanceCache) state.distanceCache.invalidate();
    saveCache(state.pontos, state.horarios);
    var validIds = state.pontos.map(function (p) { return String(p.id); });
    if (typeof Favorites !== 'undefined' && Favorites.pruneFavorites) Favorites.pruneFavorites(validIds);
    if (typeof Reminders !== 'undefined' && Reminders.pruneForStops) Reminders.pruneForStops(validIds);
    initModalOnce();
    renderAll();
    reperguntarLocalizacao();
  } catch (error) {
    console.error(error);
    if (!cached) showEmpty(els.nearbyStops, 'Não foi possível carregar os dados dos pontos.');
  }
  hideSplash();
}

async function carregarDados() {
  const [pontosRes, horariosRes] = await Promise.all([
    fetch('./dados/pontos.json'),
    fetch('./dados/horarios.json')
  ]);
  if (!pontosRes.ok || !horariosRes.ok) throw new Error('Falha ao buscar os arquivos principais da Circular.');
  const [pontos, horarios] = await Promise.all([pontosRes.json(), horariosRes.json()]);
  state.pontos = pontos;
  state.horarios = horarios;
  if (typeof setPontosCircular === 'function') setPontosCircular(state.pontos);
}

function setupNavigation() {
  const openSidebar = () => {
    els.sidebar?.classList.add('open');
    els.sidebarOverlay?.classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  const closeSidebar = () => {
    els.sidebar?.classList.remove('open');
    els.sidebarOverlay?.classList.remove('show');
    document.body.style.overflow = '';
  };

  els.mobileMenuBtn?.addEventListener('click', openSidebar);
  els.sidebarOverlay?.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebar();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeSidebar();
  });

  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href') || '';

      if (!href.startsWith('#')) {
        return;
      }

      event.preventDefault();
      document.querySelectorAll('.sidebar-link').forEach((item) => {
        item.classList.remove('active');
      });
      link.classList.add('active');
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      closeSidebar();
    });
  });
}

function setupInteractions() {
  els.heroBtn?.addEventListener('click', () => reperguntarLocalizacao({ scrollToNearby: true }));

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    const stopCard = event.target.closest('.stop-card');

    if (action?.dataset.action === 'focus-map' && stopCard) {
      event.preventDefault();
      selectStop(Number(stopCard.dataset.stopId), { scrollToMap: true });
      return;
    }

    const favBtn = event.target.closest('.fav-btn');
    if (favBtn) {
      event.stopPropagation();
      const id = favBtn.dataset.id;
      Favorites.toggleFavorite(id);
      const isFav = Favorites.isFavorite(id);
      favBtn.classList.toggle('favorited', isFav);
      const icon = favBtn.querySelector('i');
      if (icon) {
        icon.classList.remove('ti-heart', 'ti-heart-filled');
        icon.classList.add(isFav ? 'ti-heart-filled' : 'ti-heart');
      }
      favBtn.classList.remove('fill', 'empty');
      void favBtn.offsetWidth;
      favBtn.classList.add(isFav ? 'fill' : 'empty');
      renderFavoriteStops();
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
      return;
    }

    if (stopCard && !event.target.closest('a')) {
      cardClickEffect(stopCard, function () {
        openStopModal(Number(stopCard.dataset.stopId));
      });
    }
  });
}

function setupSearch() {
  if (!els.searchInput || !els.searchResults ) return;

  els.searchMobileBtn?.addEventListener('click', () => {
    toggleMobileSearch(true);
    els.searchInput?.focus();
  });

  let debounceTimer;

  els.searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const term = normalize(els.searchInput.value);
    if (!term || state.pontos.length === 0) {
      hideSearchSuggestions();
      return;
    }
    debounceTimer = setTimeout(() => {
      renderSearchSuggestions(getSearchSuggestions(term));
    }, 200);
  });

  els.searchInput.addEventListener('focus', () => {
    const term = normalize(els.searchInput.value);
    if (state.pontos.length === 0) return;
    debounceTimer = setTimeout(() => {
      if (term) {
        renderSearchSuggestions(getSearchSuggestions(term));
      } else {
        renderSearchSuggestions(getDiverseSuggestions());
      }
    }, 200);
  });

  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideSearchSuggestions();
      els.searchInput.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box, #searchMobileBtn')) {
      hideSearchSuggestions();
      toggleMobileSearch(false);
    }
  });

  setupMobileSearchDismiss();

  const searchIcon = document.querySelector('#searchBox .ti-search');
  searchIcon?.addEventListener('click', (e) => {
    e.stopPropagation();
    els.searchInput?.focus();
  });
}



function getHomePoints() {
  return state.pontos;
}

function getHomePointsWithDistance() {
  return getHomePoints().map(function (ponto) {
    const withDistance = state.distanceCache
      ? state.distanceCache.forSingle(ponto)
      : pontosComDistancia([ponto], state.userPosition)[0];
    return withDistance || ponto;
  });
}



function getSearchSuggestions(term) {
  const sortMode = state.userPosition ? 'distancia' : 'ordem';
  return sortPointsByContext(
    getHomePointsWithDistance().filter(function (ponto) {
      return normalize([ponto.nome, (ponto.apelidos || []).join(' '), ponto.endereco, ponto.bairro, 'circular'].join(' ')).includes(term);
    }),
    sortMode
  ).slice(0, 10);
}

function getDiverseSuggestions() {
  const sorted = sortPointsByContext(getHomePointsWithDistance(), state.userPosition ? 'distancia' : 'ordem');
  const seen = new Set();
  const result = [];
  for (const ponto of sorted) {
    if (result.length >= 10) break;
    const key = normalize(ponto.bairro || ponto.nome);
    if (!seen.has(key)) {
      result.push(ponto);
      seen.add(key);
    }
  }
  return result.slice(0, 10);
}

function renderSearchSuggestions(results) {
  if (results.length === 0) {
    els.searchResults.innerHTML = '<div class="search-result-empty">Nenhum ponto encontrado</div>';
    els.searchResults.classList.add('show');
    return;
  }
  els.searchResults.innerHTML = results.map(function (ponto) {
    const distanceText = typeof ponto.distancia === 'number'
      ? '<span><i class="ti ti-navigation"></i> ' + formatDistance(ponto.distancia) + '</span>'
      : '';
    const address = ponto.endereco || 'Localização exata ainda não informada';
    return '<div class="search-result-item" style="z-index:0" data-stop-id="' + ponto.id + '">' +
      '<div class="search-result-name"><i class="ti ti-map-pin"></i>' + escapeHtml(ponto.nome) + '</div>' +
      '<div class="search-result-desc"><span>' + escapeHtml(address) + (ponto.bairro ? ' - ' + escapeHtml(ponto.bairro) : '') + '</span>' + distanceText + '</div>' +
      '</div>';
  }).join('');
  els.searchResults.classList.add('show');
  els.searchResults.querySelectorAll('.search-result-item').forEach(function (item) {
    item.addEventListener('click', function () {
      openStopModal(Number(item.dataset.stopId));
      els.searchInput.value = '';
      hideSearchSuggestions();
    });
  });
}

function hideSearchSuggestions() {
  els.searchResults?.classList.remove('show');
  if (els.searchResults) els.searchResults.innerHTML = '';
}

function renderAll() {
  renderFavoriteStops();
  renderNearbyStops();
  renderMapMarkers();
}

function renderFavoriteStops() {
  if (!els.favStops) return;
  const favIds = typeof Favorites !== 'undefined' ? Favorites.getFavorites() : [];
  if (favIds.length === 0) {
    els.favStops.innerHTML = '<div class="empty-fav">Você ainda não favoritou nenhum ponto. Clique no <i class="ti ti-heart"></i> para adicionar.</div>';
    if (els.favSubtitle) els.favSubtitle.textContent = 'Nenhum favorito ainda.';
    return;
  }
  if (els.favSubtitle) els.favSubtitle.textContent = 'Seus pontos favoritos.';
  const lista = getHomePointsWithDistance();
  const favPontos = sortPointsByContext(
    lista.filter(function (p) { return favIds.indexOf(String(p.id)) !== -1; }),
    state.userPosition ? 'distancia' : 'ordem'
  );
  if (!favPontos.length) {
    els.favStops.innerHTML = '<div class="empty-fav">Seus favoritos salvos não estão disponíveis nos dados atuais.</div>';
    return;
  }
  els.favStops.innerHTML = favPontos.map(function (p) { return renderStopCard(p); }).join('');
}

function renderNearbyStops() {
  if (!els.nearbyStops) return;
  if (!state.userPosition) {
    var msg = state.gpsDenied ? gpsDeniedHelp() : 'Permita o acesso à localização para ver os 3 pontos mais próximos de você.';
    showEmpty(els.nearbyStops, msg);
    if (els.nearbySubtitle) els.nearbySubtitle.textContent = 'A busca e o mapa continuam disponíveis mesmo sem GPS.';
    return;
  }
  const nearby = getHomePointsWithDistance()
    .filter(function (ponto) { return hasCoords(ponto) && typeof ponto.distancia === 'number'; })
    .sort(function (a, b) { return a.distancia - b.distancia; })
    .slice(0, 3);
  if (els.nearbySubtitle) els.nearbySubtitle.textContent = 'Os 3 pontos mais próximos de você.';
  els.nearbyStops.innerHTML = nearby.map(function (ponto) { return renderStopCard(ponto); }).join('');
}

function renderStopCard(ponto) {
  const nextInfo = encontrarPassagens(ponto.id);
  const agora = new Date();
  const agoraHoje = agora.getHours() * 60 + agora.getMinutes();
  const scheduleTimes = calcularPassagensDoPonto(ponto.id)
    .filter(function (p) { return p.embarque && p.minutosFim >= agoraHoje; })
    .map(function (p) { return p.horario; });
  const activeTime = nextInfo.encontrado ? nextInfo.horario : null;
  const distanceText = typeof ponto.distancia === 'number' ? formatDistance(ponto.distancia) : hasCoords(ponto) ? 'No mapa' : 'Sem GPS';
  const selected = state.selectedStopId === ponto.id ? 'selected' : '';
  const mapDisabled = hasCoords(ponto) ? '' : 'disabled';
  const routeUrl = hasCoords(ponto) ? 'https://www.google.com/maps/dir/?api=1&destination=' + ponto.lat + ',' + ponto.lng : '';
  const isFav = typeof Favorites !== 'undefined' && Favorites.isFavorite(String(ponto.id));
  const nextClass = nextInfo.encontrado ? (nextInfo.situacao === 'no_ponto' ? 'now' : 'waiting') : 'waiting';
  const nextTimeText = nextInfo.encontrado ? nextInfo.label : (nextInfo.mensagem || 'Sem horário');
  const chipsVisiveis = scheduleTimes.slice(0, 4);
  const chipsExtras = Math.max(0, scheduleTimes.length - 4);
  const addressText = ponto.endereco || 'Localização exata ainda não informada';
  return '<div class="card stop-card ' + selected + '" data-stop-id="' + ponto.id + '">' +
    '<div class="card-header"><div class="card-icon"><i class="ti ti-map-pin"></i></div>' +
    '<div class="card-header-right"><span class="card-distance">' + escapeHtml(distanceText) + '</span>' +
    '<button class="fav-btn ' + (isFav ? 'favorited' : '') + '" data-id="' + ponto.id + '" aria-label="' + (isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '"><i class="ti ti-' + (isFav ? 'heart-filled' : 'heart') + '"></i></button></div></div>' +
    '<div class="home-card-title-row"><h3 class="card-title">' + escapeHtml(ponto.nome) + '</h3></div>' +
    '<p class="card-address">' + escapeHtml(addressText) + '</p>' +
    '<div class="card-next-bus"><span class="card-next-label"><i class="ti ti-bus"></i> Próximo horário</span><span class="card-next-time ' + nextClass + '">' + escapeHtml(nextTimeText) + '</span></div>' +
    '<div class="card-meta"><span class="meta-chip">' + escapeHtml(ponto.bairro || 'Local não informado') + '</span></div>' +
    '<div class="card-horarios">' + chipsVisiveis.map(function (time) {
      return '<span class="time-chip ' + (activeTime && time === activeTime ? 'active' : 'inactive') + '">' + escapeHtml(time) + '</span>';
    }).join('') + (chipsExtras > 0 ? '<span class="time-chip more-chip">+' + chipsExtras + '</span>' : '') + '</div>' +
    '<div class="card-actions"><button class="card-action" type="button" data-action="focus-map" ' + mapDisabled + '><i class="ti ti-map"></i> Ver mapa</button>' +
    (routeUrl ? '<a class="card-action" href="' + routeUrl + '" target="_blank" rel="noopener"><i class="ti ti-route"></i> Traçar rota</a>' : '<button class="card-action" type="button" disabled><i class="ti ti-route-off"></i> Sem rota</button>') +
    '</div></div>';
}

function initMap() {
  if (!document.getElementById('map') || typeof L === 'undefined') {
    if (els.mapStatusText) els.mapStatusText.textContent = 'Mapa indisponível';
    return;
  }

  state.map = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(BARRA_BONITA_CENTER, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(state.map);

  state.markerLayer = L.layerGroup().addTo(state.map);
}

function createLineMarker(lat, lng, color) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">',
    '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="' + (color || BUS_COLOR) + '"/>',
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
    const el = marker.getElement();
    if (!el) return;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', ponto.nome + ' - ' + ponto.endereco);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(ponto);
      }
    });
  });
}

function renderMapMarkers() {
  if (!state.map || !state.markerLayer) return;
  state.markerLayer.clearLayers();
  state.markers.clear();
  const points = state.pontos.filter(hasCoords);
  points.forEach(function (ponto) {
    const marker = createLineMarker(ponto.lat, ponto.lng, BUS_COLOR)
      .bindPopup('<strong>' + escapeHtml(ponto.nome) + '</strong><br>' +
        escapeHtml(ponto.endereco || 'Localização não informada') + '<br>' + escapeHtml(ponto.bairro || ''))
      .on('click', function () { openStopModal(ponto.id); });
    enableMarkerKeyboard(marker, ponto, function () { openStopModal(ponto.id); });
    marker.addTo(state.markerLayer);
    state.markers.set(String(ponto.id), marker);
  });
  if (els.mapStatusText) els.mapStatusText.textContent = points.length + (points.length === 1 ? ' ponto da Circular' : ' pontos da Circular');
}

function reperguntarLocalizacao(options = {}) {
  if (state.userPosition) return;

  shouldRequestLocation().then(function (podePedir) {
    if (podePedir) {
      requestUserLocation(options);
      return;
    }
    // Navegador persistiu a recusa: mantém o estado e o banner sem chamada inútil.
    clearUserLocation();
    state.gpsDenied = true;
    if (typeof setGpsDeniedPersisted === 'function') setGpsDeniedPersisted(true);
    setLocationStatus('Permissão negada', 'Libere pelo cadeado e tente novamente', '--');
    renderNearbyStops();
  });
}

function clearUserLocation() {
  state.userPosition = null;
  if (state.userMarker) { state.userMarker.remove(); state.userMarker = null; }
  if (state.distanceCache) state.distanceCache.invalidate();
  renderNearbyStops();
  renderFavoriteStops();
  if (typeof Modal !== 'undefined') Modal.refreshLocation();
}

function requestUserLocation(options = {}) {
  if (!navigator.geolocation) {
    clearUserLocation();
    setLocationStatus('GPS indisponível', 'Use a busca manual', '--');
    renderNearbyStops();
    return;
  }
  setLocationStatus('Pedindo permissão...', 'Calculando ponto próximo', '--');
  navigator.geolocation.getCurrentPosition(function (position) {
    state.userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
    state.gpsDenied = false;
    if (typeof setGpsDeniedPersisted === 'function') setGpsDeniedPersisted(false);
    if (state.distanceCache) state.distanceCache.invalidate();
    setLocationStatus('Localização detectada', 'Calculando...', '--');
    renderNearbyStops();
    updateUserMarker();
    updateLocationSummary();
    renderFavoriteStops();
    Modal.refreshLocation();
    if (options.scrollToNearby) document.getElementById('pontos')?.scrollIntoView({ behavior: 'smooth' });
  }, function (error) {
    clearUserLocation();
    if (state.distanceCache) state.distanceCache.invalidate();
    state.gpsDenied = error.code === error.PERMISSION_DENIED;
    if (typeof setGpsDeniedPersisted === 'function') setGpsDeniedPersisted(state.gpsDenied);
    setLocationStatus(state.gpsDenied ? 'Permissão negada' : 'Não foi possível localizar', 'Busca manual disponível', '--');
    renderNearbyStops();
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}

function updateUserMarker() {
  if (!state.map || !state.userPosition) return;

  const latLng = [state.userPosition.lat, state.userPosition.lng];
  if (state.userMarker) {
    state.userMarker.setLatLng(latLng);
    return;
  }

  state.userMarker = L.marker(latLng, {
    icon: L.icon({
      iconUrl: 'img/do-utilizador.png',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    }),
    zIndexOffset: 1000,
    title: 'Sua localização',
  }).addTo(state.map).bindPopup('<strong>Sua localização</strong>');
}

function updateLocationSummary() {
  if (!state.userPosition) return;
  const nearest = getHomePointsWithDistance()
    .filter(function (p) { return hasCoords(p) && typeof p.distancia === 'number'; })
    .sort(function (a, b) { return a.distancia - b.distancia; })[0];
  if (!nearest) {
    setLocationStatus('Localização detectada', 'Nenhum ponto com GPS', '--');
    return;
  }
  const pass = encontrarPassagens(nearest.id);
  const nextTime = pass.encontrado ? pass.label : (pass.mensagem || '--');
  setLocationStatus('Localização detectada', nearest.nome + ' (' + formatDistance(nearest.distancia) + ')', nextTime);
  if (!state.selectedStopId) selectStop(nearest.id);
}

function openStopModal(stopId) {
  const ponto = state.pontos.find(function (p) { return String(p.id) === String(stopId); });
  if (!ponto) return;
  const pass = encontrarPassagens(ponto.id);
  const next = pass.encontrado
    ? { time: pass.horario, label: pass.label, minutes: pass.minutosRestantes, faixa: pass.faixa, situacao: pass.situacao, aviso: pass.aviso, tipo: pass.tipo }
    : { time: '--', label: pass.mensagem || 'Sem horário', minutes: Number.POSITIVE_INFINITY, faixa: null, situacao: pass.situacao };
  const distancia = state.userPosition && hasCoords(ponto)
    ? distanceKm(state.userPosition.lat, state.userPosition.lng, ponto.lat, ponto.lng)
    : null;
  const allLinePoints = state.pontos.slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
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
        state.map.setView([p.lat, p.lng], 16, { animate: true });
        var marker = state.markers.get(String(p.id));
        if (marker) marker.openPopup();
      }
      document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
  selectStop(stopId);
}

function selectStop(stopId, options = {}) {
  const ponto = state.pontos.find(function (item) { return String(item.id) === String(stopId); });
  if (!ponto) return;
  state.selectedStopId = Number(stopId);
  const next = encontrarPassagens(ponto.id);
  const nextText = next.encontrado ? 'previsão ' + next.label : (next.mensagem || 'sem referência disponível');
  document.querySelectorAll('[data-stop-id]').forEach(function (card) {
    card.classList.toggle('selected', Number(card.dataset.stopId) === Number(stopId));
  });
  if (els.selectedStopName) els.selectedStopName.textContent = ponto.nome;
  if (els.selectedStopDetails) {
    const address = ponto.endereco || 'Localização exata ainda não informada';
    els.selectedStopDetails.textContent = hasCoords(ponto) ? address + ' - ' + nextText : address + ' - sem coordenadas cadastradas.';
  }
  if (hasCoords(ponto) && state.map) {
    state.map.setView([ponto.lat, ponto.lng], 16, { animate: true });
    var marker = state.markers.get(String(ponto.id));
    if (marker) marker.openPopup();
  }
  if (options.scrollToMap) document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth' });
}

function setLocationStatus(location, nearest, departure) {
  if (els.userLocationText) els.userLocationText.textContent = location;
  if (els.nearestStopText) els.nearestStopText.textContent = nearest;
  if (els.nextDepartureText) els.nextDepartureText.textContent = departure;
}

function refreshLiveDepartures() {
  updateLocationSummary();
  document.querySelectorAll('.stop-card').forEach(function (card) {
    const stopId = Number(card.dataset.stopId);
    const timeEl = card.querySelector('.card-next-time');
    const chipsWrap = card.querySelector('.card-horarios');
    const pass = encontrarPassagens(stopId);
    if (timeEl) {
      timeEl.classList.remove('now', 'waiting');
      timeEl.textContent = pass.encontrado ? pass.label : (pass.mensagem || 'Sem horário');
      timeEl.classList.add(pass.encontrado && pass.situacao === 'no_ponto' ? 'now' : 'waiting');
      timeEl.title = pass.faixa ? 'Previsto entre ' + pass.faixa.label : '';
    }
    if (chipsWrap) {
      const now = new Date();
      const minuto = now.getHours() * 60 + now.getMinutes();
      const future = calcularPassagensDoPonto(stopId).filter(function (p) { return p.embarque && p.minutosFim >= minuto; });
      const visible = future.slice(0, 4);
      const extra = Math.max(0, future.length - visible.length);
      chipsWrap.innerHTML = visible.map(function (p) {
        const active = pass.encontrado && p.horario === pass.horario;
        return '<span class="time-chip ' + (active ? 'active' : 'inactive') + '">' + escapeHtml(rotuloPassagemCircular(p)) + '</span>';
      }).join('') + (extra ? '<span class="time-chip more-chip">+' + extra + '</span>' : '');
    }
  });
  if (state.selectedStopId && els.selectedStopDetails) {
    const ponto = state.pontos.find(function (p) { return Number(p.id) === Number(state.selectedStopId); });
    if (ponto) {
      const pass = encontrarPassagens(ponto.id);
      const address = ponto.endereco || 'Localização exata ainda não informada';
      els.selectedStopDetails.textContent = pass.encontrado
        ? address + ' - previsão ' + pass.label
        : address + ' - ' + (pass.mensagem || 'sem referência disponível');
    }
  }
}

