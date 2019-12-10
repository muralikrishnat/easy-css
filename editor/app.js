import "./less/global.less";

import * as ace from 'brace';
import 'brace/mode/html';
import 'brace/mode/less';
import 'brace/mode/markdown';
import 'brace/theme/vibrant_ink';
import 'brace/ext/emmet';
import './js/vendor/emmet.js';

const showdown = require("showdown")
const converter = new showdown.Converter();

var config = {
    editorBaseUrl: 'http://localhost:7676',
    themeServerBaseUrl: 'http://localhost:7677',
    styleGuideBaseUrl: 'http://localhost:7678',
    pagesBaseUrl: 'http://localhost:7679',
    componentsBaseUrl: 'http://localhost:7680'
};


var editor = ace.edit("editor", {
    minLines: 200
});
editor.setTheme("ace/theme/vibrant_ink");
editor.session.setMode("ace/mode/html");
editor.setAutoScrollEditorIntoView(true);
editor.setOption("maxLines", 100);
editor.session.setUseWrapMode(true);
editor.setFontSize(16);
editor.setOption('enableEmmet', true);
editor.on('change', function(e) {
    // var htmlString = editor.getValue();
    // if (isValidHTML(htmlString) && appEngine.fileType === 'html') {
    //     previewHtml({ htmlString });
    // }
    // if (appEngine.fileType === 'md') {
    //     const markdown = converter.makeHtml(htmlString);
    //     previewHtml({htmlString: markdown});
    // }
});



window.editor = editor;



var isValidHTML = function(htmlString) {
    // var doc = document.createElement("DIV");
    // doc.innerHTML = htmlString;
    // if (doc.innerHTML === htmlString) {
    //     // doc.querySelectorAll('[class]').forEach(elem =>)
    //     if (htmlString.match(/class="(.*?)"/igm)) {
    //         htmlString.match(/class="(.*?)"/igm).forEach(item => {
    //             var classNameValue = item.split('"')[1];
    //         });
    //     }
    //     return {};
    // } else {
    //     return null;
    // }
    return true;
};

var previewHtml = function(opts) {
    var ifrm = document.querySelector('.result');
    var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
    // idocument.documentElement.innerHTML = opts.htmlString;
    idocument.querySelector('body').innerHTML = opts.htmlString;
};

(function() {
    var resizeNumber = 2;

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
    window.appEngine = {
        isEdit: false,
        componentId: null,
        components: [],
        resizePreview: function(direction, flexToSet) {
            document.querySelector('.editor-preview').classList.remove('flex-' + resizeNumber);
            if (direction) {
                resizeNumber = resizeNumber + 1;
            } else {
                resizeNumber = resizeNumber - 1;
            }
            if (flexToSet != null) {
                resizeNumber = flexToSet;
            }
            document.querySelector('.editor-preview').classList.add('flex-' + resizeNumber);
            setTimeout(() => {
                editor.resize(true);
            }, 100);
        },
        saveToServer: function() {
            var componentId = "";
            if (appEngine.isEdit) {
                componentId = appEngine.componentId;
            } else {
                let componentNameElem = document.querySelector('[name="componentname"]');
                if (componentNameElem) {
                    componentId = componentNameElem.replace(/ /g, '-');
                }
            }
            if (componentId && componentId.length > 0) {
                makeRequest({
                    url: config.componentsBaseUrl + '/api/component/save-code?component=' + componentId + '&filetype=' + appEngine.fileType + '&variation=' + appEngine.variation ,
                    method: 'POST',
                    body: editor.getValue(),
                    isPlain: true,
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }).then(resp => {
                    return resp.text();
                }).then(respText => {

                });

                if (appEngine.fileType === 'md') {
                    makeRequest({
                        url: config.componentsBaseUrl + '/api/component/save-code?component=' + componentId + '&filetype=md-html&variation=' + appEngine.variation,
                        method: 'POST',
                        body: converter.makeHtml(editor.getValue()),
                        isPlain: true,
                        headers: {
                            'Content-Type': 'text/plain'
                        }
                    })
                }
            }
        },
        async setEditor() {
            appEngine.fileType = document.querySelector('[name="editormode"]').value;
            var ifrm = document.querySelector('.result');
            var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
            // if (appEngine.fileType === 'md')  {
            //     idocument.querySelector('link').href="http://localhost:8080/css/md-styles.css";
            // } else {
            //     idocument.querySelector('link').href="http://localhost:8080/css/tailwind-generated.css";
            // }
            
            var mdContent = await fetchComponentHtml(appEngine.componentId, appEngine.fileType, appEngine.variation);
            editor.setValue(mdContent, -1);
            const markdown = converter.makeHtml(mdContent);
            previewHtml({htmlString: markdown});
        },
        showComponents() {
            document.querySelector('.insert-component-modal').classList.add('show');
        },
        hideComponents() {
            document.querySelector('.insert-component-modal').classList.remove('show');
        },
        async insertComponent() {
            var componentToFetch = document.querySelector('[name="componentlist"]').value;
            var componentHtml = await fetchComponentHtml(componentToFetch, 'html', 'default');
            editor.insertSnippet(componentHtml, editor.getCursorPosition())
            document.querySelector('.insert-component-modal').classList.remove('show');
        },
        downloadHtml() {
            var ifrm = document.querySelector('.result');
            var idocument = ifrm.contentDocument ? ifrm.contentDocument : ifrm.contentWindow.document;
            var link = document.createElement('a');
            link.download = appEngine.componentId ?  appEngine.componentId + '.' + appEngine.fileType : 'page.html';
            var blob = new Blob(['<html>' + idocument.documentElement.innerHTML +  '</html>'], {type: 'text/html'});
            link.href = window.URL.createObjectURL(blob);
            link.click();
        }
    };
})();

var fetchComponentHtml = async function(componentId, fileType, variation) {
    var textContent = await fetch(config.componentsBaseUrl + '/api/component?component=' + componentId + '&filetype=' + fileType + '&variation=' + variation).then(resp => resp.text()).then(textContent => {
        return textContent;
    });
    return textContent;
}

var fetchComponentLists = async function() {
    return await fetch(config.componentsBaseUrl + '/api/components/list').then(resp => resp.json()).then(resp => resp.components);
};

setTimeout(async function() {
    var componentId = null;
    var variation = null;
    if  (location.href.split('?').length > 1) {
        var queryParams = location.href.split('?')[1].split('&');
        for (let i = 0; i < queryParams.length; i++) {
            if (queryParams[i].split('=')[0] === 'component') {
                componentId = queryParams[i].split('=')[1];
            }
            if (queryParams[i].split('=')[0] === 'variation') {
                variation = queryParams[i].split('=')[1];
            }
        }
    }
    appEngine.fileType = 'html';
    if (componentId && variation) {
        var textContent = await fetchComponentHtml(componentId, appEngine.fileType, variation);
        editor.setValue(textContent, -1);
        appEngine.componentId = componentId;
        appEngine.variation = variation;
        document.querySelectorAll('.show-if-component').forEach(elem => elem.classList.remove('hidden'));
    } else {
        var components = await fetchComponentLists();
        appEngine.components = components;
        if (appEngine.components &&  appEngine.components instanceof Array)  {
            var componentsHtmlString = '';
            appEngine.components.forEach(elem => {
                componentsHtmlString += `
                    <option value="${elem}">${elem.replace('-', ' ')}</option>
                `;
            });
            document.querySelector('[name="componentlist"]').innerHTML = componentsHtmlString;
        }
        
    }
    appEngine.isEdit = true;
}, 1000);