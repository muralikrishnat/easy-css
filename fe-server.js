var nodeStatic = require('node-static');
var fs = require('fs');
var path = require('path');
var WebSocketServer = require('websocket').server;
var formidable = require('formidable');
var archiver = require('archiver');

var timeoutInMinutes = 20;

var machines = {};
var readyToStart = false;
var testFinished = false;
var challengeStartedAt = null;
var challengeCompletedAt = null;
var showMachineId = false;

function parseCookies(request) {
    var list = {},
        rc = request.headers.cookie;
    rc && rc.split(';').forEach(function(cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
}

var connectionPool = [];
var participantConnectionPool = [];
var broadCastToConnections = function(payload, toConnections) {
    var connections = connectionPool;
    if (toConnections && toConnections === 'TO_PARTICIPANTS') {
        connections = participantConnectionPool;
    }
    connections.forEach(connection => {
        var socketPayload = {
            data: payload && payload.data ? payload.data : machines,
            dataType: payload && payload.dataType ? payload.dataType : 'MACHINES',
            readyToStart: readyToStart,
            timeoutInMinutes: timeoutInMinutes,
            testFinished: testFinished,
            challengeStartedAt: challengeStartedAt,
            challengeCompletedAt: challengeStartedAt 
        }
        connection.sendUTF(JSON.stringify(socketPayload));
    });
}

function initWS(server) {
    var wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    wsServer.on('request', function(request) {
        var connection = request.accept(null, request.origin);
        console.log((new Date()) + ' Connection accepted.');
        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                var dataToCheck = JSON.parse(message.utf8Data);
                // connection.sendUTF(JSON.stringify(datafromClient));
                var skipBroadCast = false;
                switch (dataToCheck.actionName) {
                    case 'RESET_RESULTS':
                        let filePath = path.join(__dirname, 'test-rounds', `results-${challengeStartedAt}.json`);
                        var fileContent = JSON.stringify({
                            machines: machines,
                            challengeStartedAt: challengeStartedAt,
                            timeoutInMinutes: timeoutInMinutes,
                            challengeCompletedAt: challengeCompletedAt 
                        });
                        fs.writeFileSync(filePath, fileContent, {
                            encoding: 'utf-8'
                        });
                        machines = {};
                        readyToStart = false;
                        testFinished = false;
                        challengeStartedAt = null;
                        challengeCompletedAt = null;
                        break;
                    case 'CLEAR_RESULTS':
                        machines = {};
                        readyToStart = false;
                        testFinished = false;
                        challengeStartedAt = null;
                        challengeCompletedAt = null;
                        participantConnectionPool = [];
                        break;
                    case 'FINISH_TEST':
                        skipBroadCast = true;
                        challengeCompletedAt = new Date().getTime();
                        broadCastToConnections({
                            data: {
                            },
                            dataType: 'FINISH_TEST'
                        }, 'TO_PARTICIPANTS');
                        break;
                    case 'SET_CHANLLENGE_TIMEOUT':
                        timeoutInMinutes = parseInt(dataToCheck.value);
                        break;
                    case 'START_TEST':
                        readyToStart = true;
                        var folderPath = path.join(__dirname, 'dist', 'assets', 'test-images');
                        var files = fs.readdirSync(folderPath);
                        challengeStartedAt = new Date().getTime();
                        broadCastToConnections({
                            data: {
                                readyToStart: true,
                                files: files,
                                challengeStartedAt: challengeStartedAt
                            },
                            dataType: 'START_TEST'
                        }, 'TO_PARTICIPANTS');
                        break;
                    case 'EMP_LIST':
                        skipBroadCast = true;
                        var fileContent = fs.readFileSync(path.join(__dirname, 'hrms', 'employees.json'), {
                            encoding: 'utf-8'
                        });
                        
                        break;
                    case 'SHOW_MACHINE_IDS':
                        skipBroadCast = true;
                        showMachineId = !showMachineId;
                        broadCastToConnections({
                            dataType: 'SHOW_MACHINE_IDS',
                            data: {
                                showMachineId: showMachineId
                            }
                        }, 'TO_PARTICIPANTS');
                        break;
                    case 'CLEAR_SESSION_CODE':
                        skipBroadCast = true;
                        broadCastToConnections({
                            dataType: 'CLEAR_SESSION_CODE'
                        }, 'TO_PARTICIPANTS');
                        break;
                    case 'SET_VOTE':
                        if (machines[dataToCheck.machineId] && testFinished) {
                            machines[dataToCheck.machineId].votes = (machines[dataToCheck.machineId].votes - 0) + dataToCheck.direction;
                        }
                        break;
                    case 'SET_VOTE_VALUE':
                        if (machines[dataToCheck.machineId] && testFinished) {
                            machines[dataToCheck.machineId].votes = dataToCheck.votes - 0;
                        }
                        break;
                    case 'SET_VOTE_VALUE_ALL':
                        if (dataToCheck.machinesData) {
                            Object.keys(dataToCheck.machinesData).forEach(item => {
                                machines[item].votes = dataToCheck.machinesData[item].votes - 0;
                            });
                        }
                        break;
                    case 'GET_IMAGES':
                        skipBroadCast = true;
                        var folderPath = path.join(__dirname, 'dist', 'assets', 'test-images');
                        var files = fs.readdirSync(folderPath);
                        connection.sendUTF(JSON.stringify({
                            files: files,
                            code: 'GET_IMAGES'
                        }));
                        break;
                    case 'HEART_BEAT':
                        skipBroadCast = true;
                        connection.sendUTF(JSON.stringify({
                            code: 'HEART_BEAT'
                        }));
                        break;
                    case 'GET_RESULTS':
                        skipBroadCast = true;
                        var resultsFolderPath = path.join(__dirname, 'test-rounds');
                        var resultFiles = fs.readdirSync(resultsFolderPath);
                        connection.sendUTF(JSON.stringify({
                            files: resultFiles,
                            code: 'GET_RESULTS'
                        }));
                        break;
                    case 'GET_RESULT_FILE':
                        skipBroadCast = true;
                        let filePathResultFile = path.join(__dirname, 'test-rounds', dataToCheck.fileName);
                        var resultFileContent = fs.readFileSync(filePathResultFile, { encoding: 'utf-8' });
                        try {
                            var resultJSON = JSON.parse(resultFileContent);
                            connection.sendUTF(JSON.stringify({
                                result: resultJSON,
                                code: 'GET_RESULT_FILE',
                                fileName: dataToCheck.fileName
                            }));
                        } catch(e) {
                            //swallow
                        }
                        break;
                    default:
                        break;
                }
                if (!skipBroadCast) {
                    broadCastToConnections();
                }
            } else if (message.type === 'binary') {
                console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
                //connection.sendBytes(message.binaryData);
            }
        });
        connection.on('close', function(reasonCode, description) {
            if (connection.isAdmin) {
                connectionPool = connectionPool.filter(item => item.connectionId !== connection.connectionId);
            } else {
                participantConnectionPool = participantConnectionPool.filter(item => item.connectionId !== connection.connectionId);
            }
        });

        if (connection.connected) {
            //connectionArray.push(new ConnectionObject(guid(), connection,))
            var connectionId = 'C' + new Date().getTime();
            connection.connectionId = connectionId;
            var query = request.resourceURL.query;
            if (query.isparticipant) {
                participantConnectionPool.push(connection);
            }
            if (query.isadmin) {
                function isValidAdmin() {
                    var isAdmin = query.username && query.password && query.username === 'admin' && (query.password === '3o4e9nt854ark' || query.password === 'murali');
                    if (request.origin.indexOf('localhost') >= 0) {
                        isAdmin = true;
                    }
                    return isAdmin;
                }
                if (isValidAdmin()) {
                    connection.isAdmin = true;
                    connectionPool.push(connection);
                } else {
                    connection.sendUTF(JSON.stringify({
                        code: 'INVALID_USER'
                    }));
                }
            }
            broadCastToConnections();
        }
    });
}
var allowedHeaders = ['Authorization', 'Content-Type', 'x-api-key', 'empid', 'machineid'];

function shuffle(arra1) {
    let ctr = arra1.length;
    let temp;
    let index;

    // While there are elements in the array
    while (ctr > 0) {
        // Pick a random index
        index = Math.floor(Math.random() * ctr);
        // Decrease ctr by 1
        ctr--;
        // And swap the last element with it
        temp = arra1[ctr];
        arra1[ctr] = arra1[index];
        arra1[index] = temp;
    }
    return arra1;
}
module.exports = function(options) {
    let fePort = options.fePort;
    let folder = options.folder || 'app';
    var file = new nodeStatic.Server('./' + folder);
    var server = require('http').createServer((request, response) => {
        if (request.method ===  'GET' && request.url.indexOf('/api/components/read-file') === 0) {
            var filename = '';
            var componentName = '';
            var requestUrl = require('url').parse(request.url);
            requestUrl.query.split('&').forEach(item => {
                if(item.split('=')[0] === 'filename') {
                    filename = item.split('=')[1];
                }
                if(item.split('=')[0] === 'componentname') {
                    componentName = item.split('=')[1];
                }
            });
            let filePath = path.join(__dirname, 'component-files', componentName, filename);
            var fileContent = fs.readFileSync(filePath, {
                encoding: 'utf-8'
            });
            body = fileContent;
            response.writeHead(200, {
                'Content-Type': "text/html"
            });
            response.end(body);
        } else if (request.method  === 'GET' && request.url.indexOf('/api/components/list') === 0){
            var componentsPath = path.join(__dirname, 'component-files');
            var componentFiles = fs.readdirSync(componentsPath);
            body = JSON.stringify({
                components: componentFiles
            });
            response.writeHead(200, {
                'Content-Type': "application/json"
            });
            response.end(body);
        } else if (request.method === 'POST' && request.url.indexOf('/api/challenge-base-image') === 0) {
            var form = new formidable.IncomingForm();
            form.parse(request, function (err, fields, files) {
                if (fields && fields.fileCount) {
                    var testImagesFolder = path.join(__dirname, 'dist', 'assets', 'test-images');
                    var oldpath = files.file_1.path;
                    var newpath = testImagesFolder + '/page.png';
                    fs.rename(oldpath, newpath, function (err) {
                        if (err) {
                            response.end(JSON.stringify({
                                uploaded: false
                            }));
                        } else {
                            response.end(JSON.stringify({
                                uploaded: true
                            }));
                        }
                    });
                } else {
                    response.end(JSON.stringify({
                        uploaded: false
                    }));
                }
            });
        } else if (request.method === 'POST' && request.url.indexOf('/api/challenge-additional-images') === 0) {
            var form = new formidable.IncomingForm();
            form.parse(request, function (err, fields, files) {
                if (fields && fields.fileCount) {
                    var promises = [];
                    var testImagesFolder = path.join(__dirname, 'dist', 'assets', 'test-images');
                    for(var i = 0; i < fields.fileCount - 0; i++) {
                        var promise = new Promise((resolve, reject) => {
                            var fileToSave = files['file_' + ( i + 1)];
                            var oldpath = fileToSave.path;
                            var newpath = testImagesFolder + '/' + fileToSave.name;
                            fs.rename(oldpath, newpath, function (err) {
                                resolve({});
                            });
                        });
                        promises.push(promise);
                    }
                    Promise.all(promises).then(() => {
                        response.end(JSON.stringify({
                            uploaded: true
                        }));
                    });
                } else {
                    response.end(JSON.stringify({
                        uploaded: false
                    }));
                }
            });
        } else if (request.method === 'GET' && request.url.indexOf('/api/download-challenge-files') === 0) {
            var queryParamValue = null;
            var requestUrl = require('url').parse(request.url);
            requestUrl.query.split('&').forEach(item => {
                if(item.split('=')[0] === 'starttimestamp') {
                    queryParamValue = item.split('=')[1];
                }
            });
            if (queryParamValue) {
                var archive = archiver('zip', {
                    zlib: { level: 9 }
                });

                archive.on('warning', function(err) {
                    console.log("Archive warning");
                });
                
                // good practice to catch this error explicitly
                archive.on('error', function(err) {
                    response.end(JSON.stringify({
                        downloading: false
                    }));    
                });
                
                // pipe archive data to the file
                archive.pipe(response);
                let resultJSONPath = path.join(__dirname, 'test-rounds', `results-${queryParamValue}.json`);
                archive.append(fs.createReadStream(resultJSONPath), { name: `results-${queryParamValue}.json` });
                var folderPath = path.join(__dirname, 'code-files');
                var files = fs.readdirSync(folderPath);
                for (let i =0 ; i < files.length; i++) {
                    var fileName = files[i];
                    var fileNameAithOutExt = fileName.split('.')[0];
                    var timeStampToCheck = fileNameAithOutExt.split('-')[1];
                    if (timeStampToCheck == queryParamValue) {
                        archive.append(fs.createReadStream(path.join(folderPath, fileName)), { name: fileName });
                    }
                }
                archive.finalize();
            } else {
                response.end(JSON.stringify({
                    downloading: false
                }));    
            }
            
        } else if (request.method === 'GET' && request.url.indexOf('/api/employees') === 0) {
            var dataStreamer = fs.createReadStream(path.join(__dirname, 'hrms', 'employees.json'));
            dataStreamer.pipe(response);
        } else {
            var body = [];
            if (request.url.indexOf('api') >= 0) {
                request.on('data', function(chunk) {
                    body.push(chunk);
                });
            }
            request.addListener('end', function() {
                if (request.method === 'OPTIONS') {
                    response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
                    response.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
                    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH, OPTIONS');
                    response.setHeader('Access-Control-Allow-Credentials', true);
                    response.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    response.end();
    
                } else if (request.url.indexOf('api') >= 0) {
                    var promises = [];
                    var responseContentType = 'application/json';
                    var cookies = parseCookies(request);
                    body = Buffer.concat(body).toString();
                    var machineid = 'M' + new Date().getTime();
                    // if (cookies.machineid) {
                    //     machineid = cookies.machineid;
                    // }
                    if (request.headers && request.headers.machineid) {
                        machineid = request.headers.machineid;
                    }
                    if (!machines[machineid] && readyToStart === false) {
                        machines[machineid] = {
                            empid: "",
                            finished: false,
                            started: false,
                            previewEmpId: "",
                            votes: 0
                        };
                    }
                    response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
                    response.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
                    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH, OPTIONS');
                    response.setHeader('Access-Control-Allow-Credentials', true);
                    if (request.method === 'POST') {
                        if (request.url.indexOf('/api/machine/register') === 0) {
                            var folderPath = path.join(__dirname, 'dist', 'assets', 'test-images');
                            var files = fs.readdirSync(folderPath);
                            body = JSON.stringify({
                                machineid: machineid,
                                timeoutInMinutes: timeoutInMinutes,
                                readyToStart: readyToStart,
                                testFinished: testFinished,
                                challengeStartedAt: challengeStartedAt,
                                machine: machines[machineid],
                                files: files
                            });
                            broadCastToConnections();
                        }
    
                        if (request.url.indexOf('/api/machine/emp-login') === 0) {
                            if (!readyToStart) {
                                let jsonData = JSON.parse(body);
                                // let filePath = path.join(__dirname, 'site-builder', 'pages', jsonData.pagePath + '.json');
                                // fs.writeFileSync(filePath, JSON.stringify(jsonData.fileContent, null, 4), {
                                //     encoding: 'utf-8'
                                // });
                                var empid = jsonData.empid;
                                machines[machineid].empid = empid;
                                machines[machineid].started = true;
                                body = JSON.stringify({
                                    machineid: machineid,
                                    timeoutInMinutes: timeoutInMinutes,
                                    readyToStart: readyToStart,
                                    testFinished: testFinished,
                                    challengeStartedAt: challengeStartedAt,
                                    machine: machines[machineid]
                                });
                            } else {
                                body = JSON.stringify({
                                    readyToStart: readyToStart
                                });
                            }
                            broadCastToConnections();
                        }
                        if (request.url.indexOf('/api/component/save-code') === 0) {
                            var queryParamValue = "sample-component";
                            var requestUrl = require('url').parse(request.url);
                            var fileName = 'html.html';
                            requestUrl.query.split('&').forEach(item => {
                                if(item.split('=')[0] === 'component') {
                                    queryParamValue = item.split('=')[1];
                                }
                                if(item.split('=')[0] === 'filetype' && item.split('=')[1] ===  'md') {
                                    fileName = 'readme.md';
                                }
                                if(item.split('=')[0] === 'filetype' && item.split('=')[1] ===  'md-html') {
                                    fileName = 'readme.html';
                                }
                            });
                            let filePath = path.join(__dirname, 'component-files', queryParamValue, fileName);
                            fs.writeFileSync(filePath, body, {
                                encoding: 'utf-8'
                            });
                             
                            responseContentType = 'text/html';
                            body = "";
                        } else if (request.url.indexOf('/api/machine/save-code') === 0) {
                            // machines[machineid].code = body;
                            var empid = request.headers.empid;
                            let filePath = path.join(__dirname, 'code-files', empid + '-'+ challengeStartedAt + '.html');
                            fs.writeFileSync(filePath, body, {
                                encoding: 'utf-8'
                            });
                            if (machines[machineid]) {
                                machines[machineid].finished = true;
                                machines[machineid].finishedAt = new Date().getTime();
                            }
                            responseContentType = 'text/html';
                            body = "";
                            var finishedCount = 0;
                            // var previewEmpId = Object.keys(machines).map(item => {
                            //     if (machines[item].finished) {
                            //         finishedCount += 1;
                            //     }
                            //     return machines[item].empid;
                            // });
                            var previewEmpId = [];
                            for (let k =0; k< Object.keys(machines).length; k++) {
                                var machineItem = machines[Object.keys(machines)[k]];
                                if (machineItem && machineItem.empid && machineItem.empid.length > 0) {
                                    previewEmpId.push(machineItem.empid);
                                    if (machineItem.finished) {
                                        finishedCount += 1;
                                    }
                                }
                            }
                            var isFinished = finishedCount === previewEmpId.length;
                            
                            if (isFinished) {
                                testFinished = true;

                                previewEmpId.sort(() => Math.random() - 0.5);
                                previewEmpId = shuffle(previewEmpId);
                                Object.keys(machines).forEach((item, index) => {
                                    machines[item].previewEmpId = previewEmpId[index];
                                });
                                challengeCompletedAt = new Date().getTime();
                                broadCastToConnections();
                                broadCastToConnections({
                                    dataType: 'PREVIEW_RESULT'
                                }, 'TO_PARTICIPANTS');
                            } else {
                                broadCastToConnections();
                                broadCastToConnections({}, 'TO_PARTICIPANTS');
                            }
                        }
    
                        if (request.url.indexOf('/api/machine/set-vote') === 0) {
    
                        }
    
                        if (request.url.indexOf('/api/challenge-base-image') === 0) {
                            var form = new formidable.IncomingForm();
                            promises.push(new Promise((res, rej) => {
                                form.parse(request, function (err, fields, files) {
                                    res({});
                                });
                            }))
                        }
                        if (request.url.indexOf('/api/test-images') === 0) {
    
                        }
                    } else if (request.method === 'GET') {
                        
                        if (request.url.indexOf('/api/component') === 0) {
                            responseContentType = 'text/html';
                            var requestUrl = require('url').parse(request.url);
                            var fileToSend = 'html.html';
                            requestUrl.query.split('&').forEach(item => {
                                if(item.split('=')[0] === 'component') {
                                    queryParamValue = item.split('=')[1];
                                }
                                if(item.split('=')[0] === 'filetype' && item.split('=')[1] === 'md') {
                                    fileToSend = 'readme.md'
                                }
                            });
                            let componentHtmlPath = path.join(__dirname, 'component-files', queryParamValue, fileToSend);
                            var fileContent = fs.readFileSync(componentHtmlPath, {
                                encoding: 'utf-8'
                            });
                            body = fileContent;
                        }
                        if (request.url.indexOf('/api/page') === 0) {
                            let filePath = path.join(__dirname, 'site-builder', 'pages', jsonData.pagePath + '.json');
                            var fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
    
                        }
                        if (request.url.indexOf('/api/machine/get-preview') === 0) {
                            // body = machines[machineid].code;
                            responseContentType = 'text/html';
                            if (machines[machineid].previewEmpId) {
                                let filePath = path.join(__dirname, 'code-files', machines[machineid].previewEmpId + '-'+ challengeStartedAt + '.html');
                                var fileContent = fs.readFileSync(filePath, {
                                    encoding: 'utf-8'
                                });
                                body = fileContent;
                            }
                        }
                        if (request.url.indexOf('/api/machine/check-preview') === 0) {
                            body = JSON.stringify({
                                previewReady: testFinished
                            });
                        }

                        if (request.url.indexOf('/api/challenge-images') === 0) {
                            var folderPath = path.join(__dirname, 'dist', 'assets', 'test-images');
                            var files = fs.readdirSync(folderPath);
                            body = JSON.stringify({
                                files: files
                            });
                        }
                    }
                    // response.writeHead(200, {
                    //     'Content-Type': responseContentType,
                    //     'Set-Cookie': 'machineid=' + machineid,
                    //     'machineid': machineid
                    // });
                    response.writeHead(200, {
                        'Content-Type': responseContentType
                    });
                    response.end(body);
                } else {
                    file.serve(request, response, function(err, res) {
                        if (err && (err.status === 404) && request.url.indexOf('.html') < 0) {
                            file.serveFile('/index.html', 200, {}, request, response);
                        } else {
                            response.writeHead(200, { 'content-type': 'text/html' });
                            response.end('Resource Not Found');
                        }
                    });
                }
            }).resume();
        }
        // console.log('res', request.url);
        // response.writeHead(301, { "Location": "https://pwa-test.tadigital.com" });
        // response.end();
    }).listen(fePort, () => {
        console.log('Server Listining on ' + fePort);
    });
    // initWS(server);
};