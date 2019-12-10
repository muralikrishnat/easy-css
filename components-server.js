var nodeStatic = require('node-static');
var fs = require('fs');
var path = require('path');
var url = require('url');

var allowedHeaders = ['Authorization', 'Content-Type', 'x-api-key'];
var config = {
    cFilesPATH: path.join(__dirname, 'c-files')
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
    let fePort = opts.fePort || 7680;
    let folder = opts.folder || 'components';
    let fileServer = new nodeStatic.Server('./' + folder);
    require('http').createServer((request, response) => {
        if (request.method === 'OPTIONS') {
            sendResponse({
                contentType: 'application/json',
                request,
                response
            });
        } else if (request.method === 'POST') {
            if (request.url.indexOf('/api') >= 0) {
                var body = [];
                request.on('data', function(chunk) {
                    body.push(chunk);
                });

                request.addListener('end', function() {
                    body = Buffer.concat(body).toString();
                    
                }).resume();
            }
        } else if (request.method === 'GET') {
            if (request.url.indexOf('/api') >= 0) {
                var componentName = '';
                var requestUrl = url.parse(request.url);
                var fileContent = null;
                var filename = '';
                var variation = 'default';
                var cType = 'atom';
                if (requestUrl.query) {
                    requestUrl.query.split('&').forEach(item => {
                        if (item.split('=')[0] === 'filename') {
                            filename = item.split('=')[1];
                        }
                        if (item.split('=')[0] === 'componentname') {
                            componentName = item.split('=')[1];
                        }
                        if (item.split('=')[0] === 'variation') {
                            variation = item.split('=')[1];
                        }
                        if (item.split('=')[0] === 'ctype') {
                            cType = item.split('=')[1];
                        }
                    });
                }
                if (request.url.indexOf('/api/components/list') >= 0) {
                    var atomsPath = path.join(__dirname, 'c-files', 'atoms');
                    var moleculesPath = path.join(__dirname, 'c-files', 'molecules');
                    var organismsPath = path.join(__dirname, 'c-files', 'organisms');

                    var atomComps = fs.readdirSync(atomsPath);
                    var moleculeComps = fs.readdirSync(moleculesPath);
                    var organismsComps = fs.readdirSync(organismsPath);

                    var body = JSON.stringify({
                        atoms: atomComps,
                        molecules: moleculeComps,
                        organisms: organismsComps
                    });
                    sendResponse({
                        body: body,
                        response,
                        request
                    });
                } else if (request.url.indexOf('/api/components/read-meta') >= 0) {
                    var componentFolderPath = path.join(config.cFilesPATH, cType, componentName);
                    var variations = fs.readdirSync(componentFolderPath);
                    sendResponse({
                        body: JSON.stringify({
                            variations
                        }),
                        contentType: "application/json",
                        response,
                        request
                    });
                } else if (request.url.indexOf('/api/components/read-file') >= 0) {
                    
                    var componentsPath = path.join(config.cFilesPATH, cType, componentName, variation);
                    let filePath = path.join(componentsPath, filename);
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
                } else {
                    response.end();
                }
            } else {
                let fileName = request.url === '/' ? 'index.html' : request.url;
                let filePath = path.join(__dirname, folder, fileName);
                if (fs.existsSync(filePath)) {
                    var stat = fs.statSync(filePath);
                    let contentType = null;
                    let fExtension = fileName.substr(fileName.lastIndexOf('.'))
                    switch (fExtension) {
                        case '.html':
                            contentType = 'text/html';
                            break;
                        case '.icon':
                            contentType = 'image/x-icon';
                            break;
                        default:
                            contentType = 'text/plain';
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

let port = process.env.PORT || 7680,
    folder = 'sample-site',
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