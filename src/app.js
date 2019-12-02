import "./less/global.less";

import * as ace from 'brace';
import 'brace/mode/html';
import 'brace/theme/vibrant_ink';
import 'brace/ext/emmet';
import './js/vendor/emmet.js';

const showdown = require("showdown")
const converter = new showdown.Converter();



var editor = ace.edit("html-editor", {
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
    var htmlString = editor.getValue();
    if (isValidHTML(htmlString) && appEngine.fileType === 'html') {
        previewHtml({ htmlString });
    }
    if (appEngine.fileType === 'md') {
        const markdown = converter.makeHtml(htmlString);
        previewHtml({htmlString: markdown});
    }
});



var isValidHTML = function(htmlString) {
    var doc = document.createElement("DIV");
    doc.innerHTML = htmlString;
    if (doc.innerHTML === htmlString) {
        // doc.querySelectorAll('[class]').forEach(elem =>)
        if (htmlString.match(/class="(.*?)"/igm)) {
            htmlString.match(/class="(.*?)"/igm).forEach(item => {
                var classNameValue = item.split('"')[1];
            });
        }
        return {};
    } else {
        return null;
    }
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
        resizePreview: function(direction) {
            document.querySelector('.editor-preview').classList.remove('flex-' + resizeNumber);
            if (direction) {
                resizeNumber = resizeNumber + 1;
            } else {
                resizeNumber = resizeNumber - 1;
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
                    url: 'http://localhost:3434/api/component/save-code?component=' + componentId + '&filetype=' + appEngine.fileType,
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
                        url: 'http://localhost:3434/api/component/save-code?component=' + componentId + '&filetype=md-html',
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
            if (appEngine.fileType === 'md')  {
                idocument.querySelector('link').href="css/md-styles.css";
            } else {
                idocument.querySelector('link').href="css/tailwind-generated.css";
            }
            
            var mdContent = await fetchComponentHtml(appEngine.componentId, appEngine.fileType);
            editor.setValue(mdContent, -1);
            const markdown = converter.makeHtml(mdContent);
            previewHtml({htmlString: markdown});
        }

    };
})();

var fetchComponentHtml = async function(componentId, fileType) {
    var textContent = await fetch('http://localhost:3434/api/component?component=' + componentId + '&filetype=' + fileType).then(resp => resp.text()).then(textContent => {
        return textContent;
    });
    return textContent;
}

setTimeout(async function() {
    var componentId = null;
    if  (location.href.split('?').length > 1) {
        var queryParams = location.href.split('?')[1].split('&');
        for (let i = 0; i < queryParams.length; i++) {
            if (queryParams[i].split('=')[0] === 'component') {
                componentId = queryParams[i].split('=')[1];
                break;
            }
        }
    }
    appEngine.fileType = 'html';
    if (componentId) {
        var textContent = await fetchComponentHtml(componentId, appEngine.fileType);
        editor.setValue(textContent, -1);
        appEngine.componentId = componentId;
        document.querySelectorAll('.show-if-component').forEach(elem => elem.classList.remove('hidden'));
    }
    appEngine.isEdit = true;
}, 1000);