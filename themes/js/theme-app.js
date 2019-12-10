var configs = {
    editorBaseUrl: 'http://localhost:7676',
    themeServerBaseUrl: 'http://localhost:7677',
    styleGuideBaseUrl: 'http://localhost:7678',
    pagesBaseUrl: 'http://localhost:7679',
    componentsBaseUrl: 'http://localhost:7680'
};
window.themeEngine = (function() {
    var themeData = {};
    var TE = function(){};
    var makeRequest = function(opts) {
        var fetchOpts = {
            method: opts.method,
            credentials: 'include'
        };
        var urlToMake = opts.url;
        var _headers = {};
        fetchOpts['headers'] = Object.assign({}, _headers, opts.headers);
        if (opts.method === 'POST') {
            if (!opts.isPlain) {
                fetchOpts['body'] = JSON.stringify(opts.body);
            } else {
                fetchOpts['body'] = opts.body;
            }
        }
        if (opts.queryParams) {
            var queryParams = [];
            Object.keys(opts.queryParams).forEach(item => {
                queryParams.push(item + '=' + opts.queryParams[item]);
            });
            urlToMake = urlToMake + (urlToMake.indexOf('?')  >= 0 ? '&': '?') + queryParams.join('&');
        }
        return fetch(urlToMake, fetchOpts);
    };
    TE.prototype.fetchThemeList = function() {
        return makeRequest({
            url: configs.themeServerBaseUrl +  '/api/themes/list'
        }).then(resp => resp.json());
    };
    TE.prototype.fetchThemeConfig = function() {
        return makeRequest({
            url: configs.themeServerBaseUrl +  '/api/themes/list'
        }).then(resp => resp.text());
    };
    TE.prototype.fetchThemeCSS = function(themename) {
        return makeRequest({
            url: configs.themeServerBaseUrl +  '/api/themes/read-css',
            queryParams: {
                themename: themename
            }
        }).then(resp => resp.text());
    };
    TE.prototype.renderTheme = function(selectedTheme) {
        themeData.selectedTheme = selectedTheme.replace(/-/g, ' ').split('.')[0];;
        this.fetchThemeCSS(themeData.selectedTheme);
    };
    TE.prototype.init = function() {
        this.fetchThemeList().then(resp => {
            console.log("resp", resp);
            if (resp && resp.themes && resp.themes instanceof Array) {
                let themelistString = '';
                resp.themes.forEach(item =>  {
                    let generatedCssName = item.replace(/-/g, ' ').split('.')[0];
                    themelistString += `<div>${generatedCssName}</div>`;
                });
                document.querySelector('.theme-list-elem').innerHTML = themelistString;

                this.renderTheme(resp.themes[0]);
            }
        });
    };
    return new TE();
})()
window.onload = function() {
    themeEngine.init();
};