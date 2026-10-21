(function () {
    'use strict';
    var tpl = document.getElementById('pageContentTemplate');
    AppShell.render({
        page: 'home',
        contentHtml: tpl ? tpl.innerHTML : '',
        options: { showFooter: true, showFab: false }
    });
})();
