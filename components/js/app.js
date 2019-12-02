(function() {
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
                    let cClass = cIndex === 0 ? 'active': '';
                    if (cIndex === 0) {
                        selectedComponent = componentName;
                    }
                    let cItemString = `<div data-component="${componentName}" onclick="componentsEngine.activeComponent('${componentName}')" class="component-item ${cClass} relative">
                        <div class="absolute arrow-tip"></div>
                        <div class="capitalize p-2">${componentName.replace('-', ' ')}</div>
                    </div>`;
                    componentsHtmlString += cItemString;
                });

                componentListElem.innerHTML = componentsHtmlString;

                componentsEngine.activeComponent(selectedComponent);
            }
        })
    };
    CE.prototype.activeComponent  = function(componentName) {
        console.log("ative component", componentName);
        makeRequest({
            url: '/api/components/read-file?filename=html.html&componentname=' + componentName
        }).then(resp => resp.text()).then(resp => {
            document.querySelector('.component-code').textContent  = resp;
            var ifrm = document.querySelector('.result');
            var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
            idocument.querySelector('body').innerHTML = resp;
            document.querySelector('.component-preview').style.height = (parseFloat(getComputedStyle(idocument.querySelector('body'), null).height) + 100) + 'px';

            document.querySelectorAll('[data-component]').forEach(elem => elem.classList.remove('active'));
            document.querySelector('[data-component="' + componentName + '"]').classList.add('active');

            hljs.initHighlighting();
        });
        componentsEngine.loadReadMe(componentName);
    }
    CE.prototype.loadReadMe = function(componentName)  {
        makeRequest({
            url: '/api/components/read-file?filename=readme.html&componentname=' + componentName
        }).then(resp => resp.text()).then(resp => {
            var ifrm = document.querySelector('.readme-result');
            var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
            idocument.querySelector('body').innerHTML = resp;
            document.querySelector('.readme-preview-section').style.height = (parseFloat(getComputedStyle(idocument.querySelector('body'), null).height) + 100) + 'px';
        });
    };
    CE.prototype.showSection = function(sectionName) {
        document.querySelectorAll('.preview-code-toggle').forEach(elem => elem.classList.add('hidden'))
        document.querySelector(sectionName).classList.remove('hidden');
    };
    CE.prototype.setDevieWidth = function(deviceName) {
        if (deviceName === 'small') {
            document.querySelector('.component-preview').style.width = '470px';
        } else if(deviceName === 'medium') {
            document.querySelector('.component-preview').style.width = '780px';
        } else {
            document.querySelector('.component-preview').style.width = '100%';
        }
    };

    window.componentsEngine = new CE();

})()

window.onload = function() {
    componentsEngine.onLoad();
}