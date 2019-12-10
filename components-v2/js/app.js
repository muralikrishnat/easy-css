(function() {
    var activeComponent = null;
    var activeComponentVariation = null;
    var makeRequest = function(opts) {
        var fetchOpts = {
            method: opts.method,
            credentials: 'include'
        };
        var _headers = {};
        fetchOpts['headers'] = Object.assign({}, _headers, opts.headers);
        if (opts.method === 'POST') {
            if (!opts.isPlain) {
                fetchOpts['body'] = JSON.stringify(opts.body);
            } else {
                fetchOpts['body'] = opts.body;
            }
        }
        return fetch(opts.url, fetchOpts);
    };
    var CE = function() {};

    CE.prototype.onLoad = function() {
        var componentListElem = document.querySelector('.component-list-elem');
        componentListElem.innerHTML = "";
        makeRequest({
            url: 'http://localhost:3434/api/components/list'
        }).then(resp => resp.json()).then(resp => {
            if (resp && resp.components && resp.components instanceof Array) {
                var componentsHtmlString = '';
                var selectedComponent = '';
                resp.components.forEach((componentName, cIndex) => {
                    let cClass = cIndex === 0 ? 'active' : '';
                    if (cIndex === 0) {
                        selectedComponent = componentName;
                    }
                    let cItemString = `<div data-component="${componentName}" onclick="componentsEngine.activeComponent('${componentName}')" class="component-item ${cClass} relative">
                        <div class="absolute arrow-tip"></div>
                        <div class="capitalize p-2">${componentName.replace(/-/g, ' ')}</div>
                    </div>`;
                    componentsHtmlString += cItemString;
                });

                componentListElem.innerHTML = componentsHtmlString;

                componentsEngine.activeComponent(selectedComponent);
            }
        })
    };
    CE.prototype.activeComponent = function(componentName) {
        activeComponent = componentName;
        activeComponentVariation = 'default';
        makeRequest({
            url: '/api/components/read-file?filename=html.html&componentname=' + activeComponent
        }).then(resp => resp.text()).then(resp => {
            document.querySelector('.component-code').textContent = resp;
            var ifrm = document.querySelector('.result');
            var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
            idocument.querySelector('body').innerHTML = resp;
            document.querySelector('.component-preview').style.height = (parseFloat(getComputedStyle(idocument.querySelector('body'), null).height) + 100) + 'px';

            document.querySelectorAll('[data-component]').forEach(elem => elem.classList.remove('active'));
            document.querySelector('[data-component="' + componentName + '"]').classList.add('active');
            setTimeout(() => {
                hljs.highlightBlock(document.querySelector('pre code'));
            }, 2000);
        });
        componentsEngine.loadMeta(componentName);
        componentsEngine.loadReadMe(componentName, 'default');
    }
    CE.prototype.loadReadMe = function(componentName, variation) {
        makeRequest({
            url: '/api/components/read-file?variation=' + variation + '&filename=readme.html&componentname=' + componentName
        }).then(resp => resp.text()).then(resp => {
            var ifrm = document.querySelector('.readme-result');
            var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
            idocument.querySelector('body').innerHTML = resp;
            document.querySelector('.readme-preview-section').style.height = (parseFloat(getComputedStyle(idocument.querySelector('body'), null).height) + 100) + 'px';
        });
    };
    CE.prototype.loadMeta = function(componentName) {
        makeRequest({
            url: '/api/components/read-meta?componentname=' + componentName
        }).then(resp => resp.json()).then(resp => {
            if (resp && resp.variations && resp.variations instanceof Array) {
                var variationHtmlString = '';
                resp.variations.forEach((variation, vIndex) => {
                    variationHtmlString += `
                        <div data-component-variation="${variation}" class="flex justify-between variation-item ${vIndex === 0 ? 'active': ''}">
                            <span class="variation-name" onclick="componentsEngine.activeComponentVariation('${variation}', '${componentName}')" >${variation}</span>
                            <a rel="noopener noreferrer" target="_blank" href="http://localhost:8080?component=${componentName}&variation=${variation}">Edit</a>
                        </div>
                    `;
                });
                document.querySelector('.variations-list').innerHTML = variationHtmlString;
            }
        });
    };
    CE.prototype.showSection = function(sectionName) {
        document.querySelectorAll('.preview-code-toggle').forEach(elem => elem.classList.add('hidden'))
        document.querySelector(sectionName).classList.remove('hidden');
    };
    CE.prototype.setDevieWidth = function(deviceName) {
        if (deviceName === 'small') {
            document.querySelector('.component-preview').style.width = '470px';
        } else if (deviceName === 'medium') {
            document.querySelector('.component-preview').style.width = '780px';
        } else {
            document.querySelector('.component-preview').style.width = '100%';
        }
    };

    CE.prototype.activeComponentVariation = function(variation, componentName) {
        activeComponent = componentName;
        activeComponentVariation = variation;
        makeRequest({
            url: '/api/components/read-file?variation=' + variation + '&filename=html.html&componentname=' + componentName
        }).then(resp => resp.text()).then(resp => {
            document.querySelector('.component-code').textContent = resp;
            var ifrm = document.querySelector('.result');
            var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
            idocument.querySelector('body').innerHTML = resp;
            document.querySelector('.component-preview').style.height = (parseFloat(getComputedStyle(idocument.querySelector('body'), null).height) + 100) + 'px';
            document.querySelectorAll('[data-component-variation]').forEach(elem => elem.classList.remove('active'));
            document.querySelector('[data-component-variation="' + variation + '"]').classList.add('active');
            setTimeout(() => {
                hljs.highlightBlock(document.querySelector('pre code'));
            }, 2000);
        });
        componentsEngine.loadReadMe(componentName, variation);
    };
    CE.prototype.showAddNewComponent = function(ishide) {
        if (ishide) {
            document.querySelector('.new-component-modal').classList.remove('show');
        } else {
            document.querySelector('.new-component-modal').classList.add('show');
        }
    };
    CE.prototype.showAddNewComponentVariation = function(ishide) {
        if (ishide) {
            document.querySelector('.new-variation-modal').classList.remove('show');
        } else {
            document.querySelector('.new-variation-modal').classList.add('show');
        }
    };
    CE.prototype.addNewComponent = function(variation) {
        var txtNewComponent = document.querySelector('[name="txtnewcomponent"]');
        if (txtNewComponent && txtNewComponent.value && txtNewComponent.value.length > 0) {
            makeRequest({
                url: 'http://localhost:3434/api/components/create?variation=' + variation + '&componentname=' + txtNewComponent.value.replace(/ /g, '-'),
                method: 'POST'
            }).then(resp => resp.json()).then(resp => {
                document.querySelector('.new-component-modal').classList.remove('show');
                componentsEngine.onLoad();
            });
        }
    };
    CE.prototype.addNewComponentVariation = function() {
        var variation = document.querySelector('[name="txtnewcomponentvariation"]');
        if (variation && variation.value && variation.value.length > 0) {
            makeRequest({
                url: 'http://localhost:3434/api/components/create?variation=' + variation.value.replace(/ /g,  '-') + '&componentname=' + activeComponent,
                method: 'POST'
            }).then(resp => resp.json()).then(resp => {
                document.querySelector('.new-variation-modal').classList.remove('show');
                componentsEngine.onLoad();
            });
        }
    };

    window.componentsEngine = new CE();

})()

window.onload = function() {
    componentsEngine.onLoad();
}