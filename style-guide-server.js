var nodeStatic = require('node-static');
var fs = require('fs');
var path = require('path');

var allowedHeaders = ['Authorization', 'Content-Type', 'x-api-key'];
var config = {
    cFilesPATH: path.join(__dirname, 'c-files')
};

var sendResponse = function(opts) {
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
    let fePort = opts.fePort || 7678;
    let folder = opts.folder || 'style-guide';
    let fileServer = new nodeStatic.Server('./' + folder);
    require('http').createServer((request, response) => {
        if (request.method === 'OPTIONS') {
            response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
            response.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
            response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH, OPTIONS');
            response.setHeader('Access-Control-Allow-Credentials', true);
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            response.end();
        } else if (request.method === 'POST') {
            if (request.url.indexOf('/api') >= 0) {

            }
        } else if (request.method === 'GET') {

            if (request.url.indexOf('/api') >= 0) {

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
                            break;
                        case '.svg':
                            contentType = 'image/svg+xml';
                            break;
                        case '.css':
                            contentType = 'text/css';
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

let port = process.env.PORT || 7678,
    folder = 'style-guide',
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