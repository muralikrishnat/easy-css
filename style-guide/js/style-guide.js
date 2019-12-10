var configs = {
    editorBaseUrl: 'http://localhost:7676',
    themeServerBaseUrl: 'http://localhost:7677',
    styleGuideBaseUrl: 'http://localhost:7678',
    pagesBaseUrl: 'http://localhost:7679',
    componentsBaseUrl: 'http://localhost:7680'
};
var componentEngine = (function() {
    var comps = {
        atoms: [],
        molecules: [],
        organisms: []
    };
    var selectedComponent = {
        name: null,
        cType: null,
        variation: 'default',
        variations: []
    };
    var pageData = {};
    var CE = function(){};
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

    CE.prototype.fetchComponentMeta = function(selectComp) {
        return makeRequest({
            url: configs.componentsBaseUrl +  '/api/components/read-meta',
            queryParams: {
                filename: 'html.html',
                componentname: selectComp.name,
                ctype: selectComp.cType,
                variation: selectComp.variation
            }
        }).then(resp => resp.json());
    };
    CE.prototype.renderVariationsList = function(selectComp) {
        var variationHtmlString = '';
        selectComp.variations.forEach(item => {
            variationHtmlString += `<div class="flex justify-between">
                <span class="cursor-pointer">${item}</span>
                <span class="cursor-pointer">
                    <a class="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800" 
                        rel="noopener noreferrer" 
                        target="_blank" 
                        href="http://localhost:7676">
                        Edit
                    </a>
                </span>
            </div>`;
        });
        document.querySelector('.variations-elem').innerHTML = variationHtmlString;
    };
    CE.prototype.fetchReadMe = function(selectComp) {
        return makeRequest({
            url: configs.componentsBaseUrl +  '/api/components/read-file',
            queryParams: {
                filename: 'readme.html',
                componentname: selectComp.name,
                ctype: selectComp.cType,
                variation: selectComp.variation
            }
        }).then(resp => resp.text()).then(resp => {
            document.querySelector('.md-preview').innerHTML = resp;
            return resp;
        });
    };
    CE.prototype.renderMobile = function(resp) {
        var ifrm = document.querySelector('.result-mobile');
        var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
        idocument.querySelector('body').innerHTML = resp;
    };
    CE.prototype.renderTablet = function(resp) {
        var ifrm = document.querySelector('.result-tablet');
        var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
        idocument.querySelector('body').innerHTML = resp;
    };
    CE.prototype.fetchHtmlCode = function (selectComp) {
        return makeRequest({
            url: configs.componentsBaseUrl +  '/api/components/read-file',
            queryParams: {
                filename: 'html.html',
                componentname: selectComp.name,
                ctype: selectComp.cType,
                variation: selectComp.variation
            }
        }).then(resp => resp.text()).then(resp => {
            document.querySelector('.variation-preview').innerHTML = resp;
            document.querySelector('.variation-code').textContent = resp;
            setTimeout(() => {
                let heightOfPreview = getComputedStyle(document.querySelector('.variation-preview'), null).height;
                console.log("hei", heightOfPreview);
                document.querySelector('.result-tablet-wrapper').style.height = heightOfPreview;
                document.querySelector('.result-mobile-wrapper').style.height = heightOfPreview;
                this.renderTablet(resp);
                this.renderMobile(resp);
                document.querySelector('.btn-show-small').classList.remove('opacity-50');
                document.querySelector('.btn-show-small').classList.remove('cursor-not-allowed');
                document.querySelector('.btn-show-medium').classList.remove('opacity-50');
                document.querySelector('.btn-show-medium').classList.remove('cursor-not-allowed');
            }, 2000);
            setTimeout(() => {
                hljs.highlightBlock(document.querySelector('.variation-code'));
            });
            return resp;
        });
    };
    CE.prototype.renderComponentContent = function(selectComp) {
        this.fetchComponentMeta(selectComp).then(metaResp => {
            selectComp.variations = metaResp.variations;
            this.renderVariationsList(selectComp);
            this.fetchReadMe(selectComp);
            this.fetchHtmlCode(selectComp);
        });
    }
    CE.prototype.renderComps = function(items, parentElem, ctype) {
        var compsHtmlString = '';
        items.forEach(name => {
            compsHtmlString +=  `<div class="">
                <span class="cursor-pointer capitalize" onclick="componentEngine.setActiveComponent('${ctype}', '${name}')">${name.replace(/-/g, ' ')}</span>
            </div>`;
        });
        parentElem.innerHTML = compsHtmlString;
    };
    CE.prototype.renderComponents = function() {
        this.renderComps(comps.atoms, document.querySelector('.atoms-elem'), 'atoms');
        this.renderComps(comps.molecules, document.querySelector('.molecules-elem'), 'molecules');
        this.renderComps(comps.organisms, document.querySelector('.organisms-elem'), 'organisms');

        this.renderComponentContent(selectedComponent);
    };

    CE.prototype.loadComponents = function() {
        makeRequest({
            url: configs.componentsBaseUrl +  '/api/components/list'
        }).then(resp => resp.json()).then(resp => {
            console.log("resp", resp);
            if (resp) {
                if (resp.atoms && resp.atoms instanceof  Array) {
                    comps.atoms = resp.atoms;
                }
                if (resp.molecules && resp.molecules instanceof  Array) {
                    comps.molecules = resp.molecules;
                }
                if (resp.organisms && resp.organisms instanceof  Array) {
                    comps.organisms = resp.organisms;
                }
                selectedComponent.name = comps.atoms[0];
                selectedComponent.cType = 'atoms';

                this.renderComponents();
            }
        });
    };
    CE.prototype.setActiveComponent = function(cType, cName) {
        this.setDevieWidth();
        document.querySelector('.btn-show-small').classList.add('opacity-50');
        document.querySelector('.btn-show-small').classList.add('cursor-not-allowed');
        document.querySelector('.btn-show-medium').classList.add('opacity-50');
        document.querySelector('.btn-show-medium').classList.add('cursor-not-allowed');
        selectedComponent.name = cName;
        selectedComponent.cType = cType;
        selectedComponent.variation = 'default';
        selectedComponent.variations = [];
        this.renderComponentContent(selectedComponent);
    };
    CE.prototype.init = function() {
        this.loadComponents();
        this.fetchThemes();
    };
    CE.prototype.setDevieWidth = function(deviceToShow) {
        if (deviceToShow === 'small') {
            document.querySelector('.result-desktop-wrapper').classList.add('hidden');
            document.querySelector('.result-mobile-wrapper').classList.remove('hidden');
            document.querySelector('.result-tablet-wrapper').classList.add('hidden');
        } else if (deviceToShow === 'medium') {
            document.querySelector('.result-desktop-wrapper').classList.add('hidden');
            document.querySelector('.result-tablet-wrapper').classList.remove('hidden');
            document.querySelector('.result-mobile-wrapper').classList.add('hidden');
        } else {
            document.querySelector('.result-desktop-wrapper').classList.remove('hidden');
            document.querySelector('.result-mobile-wrapper').classList.add('hidden');
            document.querySelector('.result-tablet-wrapper').classList.add('hidden');
        }
    };
    CE.prototype.renderThemeDropdown =  function() {
        // document.querySelector('[name="theme-selector"]')
        if (pageData.themes && pageData.themes instanceof Array) {
            var optionHtmlString = '';
            var selectedOption = false;
            pageData.themes.forEach(item => {
                let themeName = item.replace(/-/g, ' ').split('.')[0];
                let selectedStr = '';
                if (!selectedOption && themeName.indexOf('default') >= 0) {
                    selectedStr = "selected";
                }
                optionHtmlString += `<option ${selectedStr} value="${item}">${themeName}</option>`;
            });
            document.querySelector('[name="theme-selector"]').innerHTML = optionHtmlString;
        }
    };
    CE.prototype.fetchThemes = function() {
        makeRequest({
            url: configs.themeServerBaseUrl +  '/api/themes/list'
        }).then(resp => resp.json()).then(resp => {
            if (resp && resp.themes && resp.themes  instanceof Array) {
                pageData.themes = resp.themes;
                this.renderThemeDropdown();
            }
        });
    };
    CE.prototype.changeTheme = function() {
        var selectedTheme = document.querySelector('[name="theme-selector"]').value;
        document.querySelector('[id="generated-css"]').href = "http://localhost:7677/generated/" + selectedTheme;
    };
    return new CE();
})();
window.componentEngine = componentEngine;

window.onload = function() {
    componentEngine.init();
}