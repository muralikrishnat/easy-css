var nodeStatic = require('node-static');
var fs = require('fs');
var path = require('path');
var url = require('url');

var allowedHeaders = ['Authorization', 'Content-Type', 'x-api-key'];
var config = {
    generatedCSSPath: path.join(__dirname, 'themes', 'generated'),
    configPath: path.join(__dirname, 'themes', 'configs'),
    cssPaths: path.join(__dirname, 'themes', 'css')
};
var sendResponse = function(opts) {
    let response = opts.response;
    let request = opts.request;
    response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
    response.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH, OPTIONS');
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.writeHead(200, {
        'Content-Type': opts.contentType || 'application/json'
    });
    if (opts.body) {
        response.end(opts.body);
    } else {
        response.end();
    }

};

var initServer = function(opts) {
    let fePort = opts.fePort || 7677;
    let folder = opts.folder || 'themes';
    let fileServer = new nodeStatic.Server('./' + folder);
    require('http').createServer((request, response) => {
        var themeName = '';
        var requestUrl = url.parse(request.url);
        if (requestUrl.query) {
            requestUrl.query.split('&').forEach(item => {
                if (item.split('=')[0] === 'themename') {
                    themeName = item.split('=')[1];
                }
            });
        }
        if (request.method === 'OPTIONS') {
            sendResponse({
                request,
                response
            });
        } else if (request.method === 'POST') {
            if (request.url.indexOf('/api') >= 0) {

            }
        } else if (request.method === 'GET') {
            console.log("request", request.url);
            if (request.url.indexOf('/api') >= 0) {
                var fileContent = '';
                if (request.url.indexOf('/api/themes/read-css') >= 0) {
                    if (themeName.indexOf('.') < 0) {
                        themeName = themeName + '.css';
                    }
                    var filePath = path.join(__dirname, 'css', themeName);
                    if (fs.existsSync(filePath)) {
                        fileContent = fs.readFileSync(filePath, {
                            encoding: 'utf-8'
                        });
                    }
                    response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
                    response.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
                    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH, OPTIONS');
                    response.setHeader('Access-Control-Allow-Credentials', true);
                    response.end(fileContent);
                } else if (request.url.indexOf('/api/themes/read-config') >= 0) {
                    if (themeName.indexOf('.') < 0) {
                        themeName = themeName + '.js';
                    }
                    var filePath = path.join(__dirname, 'configs', themeName);
                    if (fs.existsSync(filePath)) {
                        fileContent = fs.readFileSync(filePath, {
                            encoding: 'utf-8'
                        });
                    }
                    response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
                    response.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
                    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH, OPTIONS');
                    response.setHeader('Access-Control-Allow-Credentials', true);
                    response.end(fileContent);
                } else if (request.url.indexOf('/api/themes/list') >= 0) {
                    var generatedCssList = fs.readdirSync(config.generatedCSSPath);
                    sendResponse({
                        request,
                        response,
                        body: JSON.stringify({
                            themes: generatedCssList
                        })
                    });
                } else if (request.url.indexOf('/api/themes/build') >= 0) {
                    let fileToBuild = 'dark-black.css';
                    let configToUse = 'dark-black.js';
                    let commandToExecute = `npx tailwind build themes/css/${fileToBuild} -c themes/configs/${configToUse} -o themes/generated/${fileToBuild}`;
                    const { exec } = require('child_process');
                    exec(commandToExecute, (err, stdout, stderr) => {
                        if (err) {
                            response.end();
                        } else {
                            let filePath = path.join(__dirname, folder, 'generated', fileToBuild);
                            if (fs.existsSync(filePath)) {
                                var stat = fs.statSync(filePath);
                                let contentType = 'application/json';
                                let fExtension = fileToBuild.substr(fileToBuild.lastIndexOf('.'))
                                switch (fExtension) {
                                    case '.html':
                                        contentType = 'text/html';
                                        break;
                                    case '.icon':
                                        contentType = 'image/x-icon';
                                        break;
                                    case '.js':
                                        contentType = 'application/javascript';
                                        break;
                                    default:
                                        break;
                                }
                                response.writeHead(200, {
                                    'Content-Type': contentType,
                                    'Content-Length': stat.size
                                });
                                var readStream = fs.createReadStream(filePath);
                                readStream.pipe(response);
                            } else {
                                response.end();
                            }
                        }
                    });
                } else {

                }
            } else {
                let fileName = request.url === '/' ? 'index.html' : request.url;
                let filePath = path.join(__dirname, folder, fileName);
                if (fs.existsSync(filePath)) {
                    var stat = fs.statSync(filePath);
                    let contentType = 'application/json';
                    let fExtension = fileName.substr(fileName.lastIndexOf('.'))
                    switch (fExtension) {
                        case '.html':
                            contentType = 'text/html';
                            break;
                        case '.icon':
                            contentType = 'image/x-icon';
                            break
                        case '.css':
                            contentType = 'text/css';
                            break;
                        case '.svg':
                            contentType = 'image/svg+xml';
                            break;
                        case '.js':
                            contentType = 'application/javascript';
                            break;
                        default:
                            break;
                    }
                    response.writeHead(200, {
                        'Content-Type': contentType,
                        'Content-Length': stat.size
                    });
                    var readStream = fs.createReadStream(filePath);
                    readStream.pipe(response);
                } else {
                    response.end();
                }
            }
        }
    }).listen(fePort, () => {
        console.log('Server Listining on ' + fePort);
    })
};



let port = process.env.PORT || 7677,
    folder = 'themes',
    endpoint = "dev",
    ssl = false,
    host = '127.0.0.1';
if (process.argv) {
    process.argv.forEach((p) => {
        if (p.indexOf('--port=') >= 0) {
            port = parseInt(p.split('=')[1]);
        }
    });
    process.argv.forEach((p) => {
        if (p.indexOf('--folder=') >= 0) {
            folder = p.split('=')[1];
        }
    });
    process.argv.forEach((p) => {
        if (p.indexOf('--endpoint=') >= 0) {
            endpoint = p.split('=')[1];
        }
    });
    process.argv.forEach((p) => {
        if (p.indexOf('--host=') >= 0) {
            host = p.split('=')[1];
        }
    });
    process.argv.forEach((p) => {
        if (p.indexOf('--ssl=') >= 0) {
            if (p.split('=')[1] && p.split('=')[1] === 'false') {
                ssl = false;
            }
        }
    });
}

initServer({
    fePort: port,
    folder
});