function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

var BUS_COLOR = '#e74c3c';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toRad(value) {
  return value * Math.PI / 180;
}

function hasCoords(ponto) {
  return !!ponto && ponto.lat !== null
    && ponto.lng !== null
    && ponto.lat !== undefined
    && ponto.lng !== undefined
    && ponto.lat !== ''
    && ponto.lng !== ''
    && Number.isFinite(Number(ponto.lat))
    && Number.isFinite(Number(ponto.lng))
    && Math.abs(Number(ponto.lat)) <= 90
    && Math.abs(Number(ponto.lng)) <= 180;
}

function getCurrentDayType() {
  var day = new Date().getDay();
  if (day === 0) return 'domingo';
  if (day === 6) return 'sabado';
  return 'uteis';
}

function getHorario(horarios, dayType) {
  if (!horarios) return [];
  if (Array.isArray(horarios)) return horarios;
  var day = dayType || getCurrentDayType();
  return (horarios[day] && Array.isArray(horarios[day])) ? horarios[day] : [];
}

function getNextDepartures(horarios, count) {
  var horariosLinha = getHorario(horarios);
  if (horariosLinha.length === 0) {
    var dayType = getCurrentDayType();
    var label = dayType === 'domingo' ? 'Não opera aos domingos' : 'Sem horário';
    return [{ time: '--', label: label, minutes: Number.POSITIVE_INFINITY }];
  }

  var now = new Date();
  var currentMinutes = now.getHours() * 60 + now.getMinutes();
  var departures = horariosLinha
    .map(function (horario) {
      var parts = horario.split(':').map(Number);
      var total = parts[0] * 60 + parts[1];
      return {
        time: horario,
        diff: total >= currentMinutes ? total - currentMinutes : total + 1440 - currentMinutes,
      };
    })
    .sort(function (a, b) { return a.diff - b.diff; });

  var limit = typeof count === 'number' && Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 3;
  return departures.slice(0, limit).map(function (next) {
    return {
      time: next.time,
      label: formatMinutes(next.diff, next.time),
      minutes: next.diff,
    };
  });
}

function getNextDeparture(horarios) {
  return getNextDepartures(horarios, 1)[0];
}

function timeToMinutes(timeStr) {
  var parts = String(timeStr || '').split(':').map(Number);
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function nextOccurrenceDate(minutesOfDay, from) {
  var base = from instanceof Date ? new Date(from.getTime()) : new Date();
  var total = ((Math.floor(minutesOfDay) % 1440) + 1440) % 1440;
  var candidate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(total / 60), total % 60, 0, 0);
  if (candidate.getTime() <= base.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

function reminderTriggerDate(departureTime, minutesBefore) {
  var dep = timeToMinutes(departureTime);
  var before = Number(minutesBefore);
  if (dep == null || !Number.isFinite(before)) return null;
  var triggerMinutes = ((dep - Math.max(0, Math.floor(before))) % 1440 + 1440) % 1440;
  return nextOccurrenceDate(triggerMinutes);
}

function formatMinutes(minutes, time) {
  if (minutes <= 1) return 'Agora';
  if (minutes < 60) return minutes + ' min';
  if (minutes < 1440) {
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return rest === 0 ? hours + 'h' : hours + 'h ' + rest + 'min';
  }
  return 'Amanhã ' + time;
}

function formatDistance(distanceKm) {
  if (distanceKm < 1) return Math.round(distanceKm * 1000) + 'm';
  return distanceKm.toFixed(1).replace('.', ',') + 'km';
}

function distanceKm(lat1, lng1, lat2, lng2) {
  var earthRadiusKm = 6371;
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function pontosComDistancia(pontos, userPosition) {
  return pontos.map(function (ponto) {
    if (!userPosition || !hasCoords(userPosition) || !hasCoords(ponto)) {
      var copy = Object.assign({}, ponto);
      delete copy.distancia;
      return copy;
    }
    return Object.assign({}, ponto, {
      distancia: distanceKm(
        userPosition.lat,
        userPosition.lng,
        Number(ponto.lat),
        Number(ponto.lng),
      ),
    });
  });
}

function hexToRgba(hex, alpha) {
  var clean = String(hex || '').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(function (char) { return char + char; }).join('');
  }
  var value = parseInt(clean, 16);
  if (!Number.isFinite(value)) return 'rgba(229, 57, 53, ' + alpha + ')';
  var r = (value >> 16) & 255;
  var g = (value >> 8) & 255;
  var b = value & 255;
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function loadCache() {
  try {
    var data = localStorage.getItem('busCacheTccCircularV1');
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
}

function saveCache(pontos, horarios) {
  try {
    localStorage.setItem('busCacheTccCircularV1', JSON.stringify({
      pontos: Array.isArray(pontos) ? pontos : [],
      horarios: Array.isArray(horarios) ? horarios : []
    }));
  } catch (e) {}
}

var MIN_SPLASH_VISIBLE = 2200;

function hideSplash() {
  var elapsed = window.__splashStart ? (Date.now() - window.__splashStart) : 0;
  var wait = Math.max(0, MIN_SPLASH_VISIBLE - elapsed);
  setTimeout(function () {
    var el = document.getElementById('splash');
    if (el) el.classList.add('hide');
  }, wait);
}

function setupBackToTop() {
  var btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', function () {
    btn.classList.toggle('show', window.scrollY > 300);
  });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function setupOfflineDetection() {
  function toggleBanner(offline) {
    var banner = document.getElementById('offlineBanner');
    if (banner) banner.style.display = offline ? 'block' : 'none';
  }
  window.addEventListener('online', function () { toggleBanner(false); });
  window.addEventListener('offline', function () { toggleBanner(true); });
  toggleBanner(!navigator.onLine);
}

function showEmpty(container, message) {
  if (!container) return;
  container.innerHTML = '<div class="empty-state">' + escapeHtml(message) + '</div>';
}

function showToast(message) {
  var toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'app-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 4000);
}

function sortPointsByContext(lista, sortMode) {
  var arr = Array.isArray(lista) ? lista.slice() : [];
  if (sortMode === 'distancia') {
    arr.sort(function (a, b) {
      var ad = typeof a.distancia === 'number' ? a.distancia : Number.POSITIVE_INFINITY;
      var bd = typeof b.distancia === 'number' ? b.distancia : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return (a.ordem || 0) - (b.ordem || 0);
    });
  } else {
    arr.sort(function (a, b) {
      return (a.ordem || 0) - (b.ordem || 0);
    });
  }
  return arr;
}

function createDistanceCache(getPontos, getUserPosition, onChange) {
  var cachedList = null;
  var cachedById = new Map();
  var lastPontosRef = null;
  var lastPositionKey = '__no_position__';
  var dirty = true;

  function positionKey(pos) {
    if (!pos) return '__no_position__';
    return (pos.lat + '_' + pos.lng);
  }

  function isDirty() {
    if (dirty) return true;
    var pontosNow = (typeof getPontos === 'function') ? getPontos() : null;
    if (lastPontosRef !== pontosNow) return true;
    var posNow = (typeof getUserPosition === 'function') ? getUserPosition() : null;
    if (lastPositionKey !== positionKey(posNow)) return true;
    return false;
  }

  function rebuild() {
    var pontos = (typeof getPontos === 'function') ? getPontos() : [];
    var userPosition = (typeof getUserPosition === 'function') ? getUserPosition() : null;
    var list = pontosComDistancia(pontos || [], userPosition || null);
    cachedList = list;
    cachedById = new Map();
    list.forEach(function (ponto) {
      if (ponto && ponto.id != null) cachedById.set(String(ponto.id), ponto);
    });
    lastPontosRef = pontos || null;
    lastPositionKey = positionKey(userPosition);
    dirty = false;
    if (typeof onChange === 'function') {
      try { onChange(); } catch (e) {}
    }
  }

  function getAll() {
    if (isDirty()) rebuild();
    return cachedList ? cachedList.slice() : [];
  }

  function forSingle(ponto) {
    if (!ponto || ponto.id == null) return ponto;
    if (isDirty()) rebuild();
    var cached = cachedById.get(String(ponto.id));
    if (cached) return cached;
    var userPosition = (typeof getUserPosition === 'function') ? getUserPosition() : null;
    var arranged = pontosComDistancia([ponto], userPosition || null);
    var result = arranged && arranged[0] ? arranged[0] : ponto;
    cachedById.set(String(ponto.id), result);
    return result;
  }

  function invalidate() {
    dirty = true;
    cachedList = null;
    cachedById.clear();
  }

  function getSortMode() {
    var pos = (typeof getUserPosition === 'function') ? getUserPosition() : null;
    return (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') ? 'distancia' : 'ordem';
  }

  return {
    getAll: getAll,
    forSingle: forSingle,
    invalidate: invalidate,
    getSortMode: getSortMode
  };
}

function cardClickEffect(card, callback) {
  card.style.transition = 'transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)';
  card.style.transform = 'scale(0.98)';
  requestAnimationFrame(function () {
    setTimeout(function () {
      card.style.transform = '';
      callback();
    }, 120);
  });
}

function skeletonCard() {
  return (
    '<div class="skeleton-card" aria-hidden="true">' +
      '<div class="skeleton-line short"></div>' +
      '<div class="skeleton-line medium tall"></div>' +
      '<div class="skeleton-line full"></div>' +
      '<div class="skeleton-line round full"></div>' +
    '</div>'
  );
}

function renderSkeletons(container, count) {
  if (!container) return;
  var n = (typeof count === 'number' && Number.isFinite(count) && count > 0) ? Math.floor(count) : 3;
  var html = '';
  for (var i = 0; i < n; i++) html += skeletonCard();
  container.innerHTML = html;
}

function getSearchBackdrop() {
  var el = document.getElementById('searchBackdrop');
  if (!el) {
    el = document.createElement('div');
    el.id = 'searchBackdrop';
    el.className = 'search-backdrop';
    document.body.appendChild(el);
  }
  return el;
}

function toggleMobileSearch(open) {
  var searchBox = document.getElementById('searchBox');
  var backdrop = getSearchBackdrop();
  var isSmallScreen = window.innerWidth <= 480;
  if (open) {
    if (searchBox) searchBox.classList.add('mobile-open');
    if (isSmallScreen) backdrop.classList.add('show');
  } else {
    if (searchBox) searchBox.classList.remove('mobile-open');
    backdrop.classList.remove('show');
    var input = document.getElementById('searchInput');
    if (input) input.blur();
  }
  if (!open) {
    var results = document.getElementById('searchResults');
    if (results) results.classList.remove('show');
  }
}

function setupMobileSearchDismiss() {
  var backdrop = getSearchBackdrop();
  backdrop.addEventListener('click', function () {
    toggleMobileSearch(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') toggleMobileSearch(false);
  });
}

function gpsDeniedHelp() {
  return 'Para ativar, clique no ícone de cadeado (ou nas configurações do navegador) ao lado da barra de endereço e permita o acesso à sua localização. Depois toque em "Usar minha localização" novamente.';
}

/* ========================================
   GPS PERMISSION PERSISTENTE + RE-PERQUISA
   ========================================
   O navegador persiste a recusa e não re-exibe o prompt nativo até o usuário
   liberar nos ajustes. Guardamos a recusa no localStorage para o app continuar
   exibindo o estado, e repedimos automaticamente mais tarde (se o navegador
   voltar a permitir, o prompt nativo reaparece e a gente captura a posição).
   ======================================== */

var GPS_DENIED_KEY = 'barrabus:gps-denied';

function getGpsDeniedPersisted() {
  try {
    return localStorage.getItem(GPS_DENIED_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function setGpsDeniedPersisted(value) {
  try {
    if (value) {
      localStorage.setItem(GPS_DENIED_KEY, '1');
    } else {
      localStorage.removeItem(GPS_DENIED_KEY);
    }
  } catch (e) {
    // storage indisponível (modo privado/restrito) — segue sem persistir
  }
}

// Estado atual da permissão: 'granted' | 'prompt' | 'denied' | 'unsupported'
function queryGeolocationPermission() {
  return new Promise(function (resolve) {
    if (typeof navigator === 'undefined' || !navigator.permissions || typeof navigator.permissions.query !== 'function') {
      resolve('unsupported');
      return;
    }
    navigator.permissions.query({ name: 'geolocation' }).then(function (status) {
      resolve(status.state);
    }).catch(function () {
      resolve('unsupported');
    });
  });
}

// Decide se pode/deve pedir a localização de novo sem gastar chamadas inúteis.
// Retorna true se a UI deve proceder com getCurrentPosition.
function shouldRequestLocation() {
  return queryGeolocationPermission().then(function (state) {
    if (state === 'denied') return false;      // não vale chamar: falha instantânea
    return true;                               // 'prompt' | 'granted' | 'unsupported'
  });
}

// Revoke a previously obtained origin when browser permission changes.
function observeLocationPermission(onUnavailable) {
  if (!navigator.permissions || !navigator.permissions.query) return;
  navigator.permissions.query({name:'geolocation'}).then(function(status){
    status.addEventListener('change',function(){
      if (status.state !== 'granted') onUnavailable();
    });
  }).catch(function(){});
}
