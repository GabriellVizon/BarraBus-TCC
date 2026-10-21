(function () {
  var STORAGE_KEY = 'busFavorites';

  function getFavorites() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) { /* quota exceeded, ignore */ }
  }

  function addFavorite(id) {
    var list = getFavorites();
    if (list.indexOf(id) === -1) {
      list.push(id);
      saveFavorites(list);
    }
    return list;
  }

  function removeFavorite(id) {
    var list = getFavorites().filter(function (fid) { return fid !== id; });
    saveFavorites(list);
    return list;
  }

  function isFavorite(id) {
    return getFavorites().indexOf(id) !== -1;
  }

  function toggleFavorite(id) {
    if (isFavorite(id)) {
      removeFavorite(id);
    } else {
      addFavorite(id);
    }
  }

  function pruneFavorites(validIds) {
    var valid = {};
    (validIds || []).forEach(function (id) { valid[String(id)] = true; });
    var list = getFavorites().filter(function (fid) { return valid[fid]; });
    saveFavorites(list);
    return list;
  }

  window.Favorites = {
    getFavorites: getFavorites,
    addFavorite: addFavorite,
    removeFavorite: removeFavorite,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    pruneFavorites: pruneFavorites
  };
})();
