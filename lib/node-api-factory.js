/*
 * node-api-factory
 * https://github.com/santthosh/node-api-factory
 *
 * Copyright (c) 2013 Santthosh
 * Licensed under the MIT license.
 */

'use strict';

var http = require('http');
var httpProxy = require('http-proxy');
var fs = require('fs');
var path = require('path');
var url = require('url');

// Use default configuration if not already provided
var config = null;
var configFile = process.cwd() + '/api-factory.json';
if(fs.existsSync(configFile)) {
    config = require(configFile);
} else {
    config = {
        "root" : "api-factory",
        "port" : 8111
    }
}

var routerBase = config.root; //You can change the root directory for the path of the routes

var server = httpProxy.createServer(function (request, response, proxy) {
    var jsHandlerFile = routerBase + url.parse(request.url).pathname + ".js";
    var jsonHandlerFile = routerBase + url.parse(request.url).pathname + ".json";
    if(fs.existsSync(jsHandlerFile)) {
        try {
            var handler = require(process.cwd() + "/" + jsHandlerFile);
            handler(request,response,proxy,config);
        } catch(err) {
            response.statusCode = 500;
            response.write("<b>500 - Internal Server Error</b><br/>"+err.message);
            response.end();
        }
    } else if(fs.existsSync(jsonHandlerFile)) {
        try {
            var responseBodyProvider = require(process.cwd() + "/" + jsonHandlerFile);
            var jsonBody = require(responseBodyProvider);
            response.write(JSON.stringify(jsonBody));
            response.end();
        } catch(err) {
            response.statusCode = 500;
            response.write("<b>500 - Internal Server Error</b><br/>"+err.message);
            response.end();
        }
    }
    else {
        response.statusCode = 404;
        response.write("<b>404 - Not Found</b>");
        response.end();
    }
});

try {
    // Listen on port configured port, IP defaults to 127.0.0.1
    server.listen(config.port);

    // Put a friendly message on the terminal
    console.log("api-factory running at http://127.0.0.1:" + config.port  + "/");
} catch(err) {
    console.log(err.message);
}
