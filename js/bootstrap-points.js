(function () {
    'use strict';
    var tpl = document.getElementById('pageContentTemplate');
    AppShell.render({
        page: 'points',
        contentHtml: tpl ? tpl.innerHTML : '',
        options: { showFooter: false, showFab: true }
    });
})();
