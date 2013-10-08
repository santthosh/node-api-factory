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

var internalServerError = function(response,err) {
    response.statusCode = 500;
    response.write("<b>500 - Internal Server Error</b><br/>"+err.message);
    response.end();
}

var server = httpProxy.createServer(function (request, response, proxy) {
    var jsHandlerFile = routerBase + url.parse(request.url).pathname + ".js";
    var jsonHandlerFile = routerBase + url.parse(request.url).pathname + ".json";
    var xmlHandlerFile = routerBase + url.parse(request.url).pathname + ".xml";
    var proxyHandlerFile = routerBase + url.parse(request.url).pathname + ".proxy";
    if(fs.existsSync(jsHandlerFile)) {
        try {
            var handler = require(process.cwd() + "/" + jsHandlerFile);
            handler(request,response,proxy,config);
        } catch(err) {
            internalServerError(response,err);
        }
    } else if(fs.existsSync(jsonHandlerFile)) {
        try {
            var responseBodyProvider = require(process.cwd() + "/" + jsonHandlerFile);
            response.setHeader("Content-Type", "application/json");
            response.write(JSON.stringify(responseBodyProvider));
            response.end();
        } catch(err) {
            internalServerError(response,err);
        }
    } else if(fs.existsSync(xmlHandlerFile)) {
        try {
            fs.readFile(xmlHandlerFile,'utf8',function(err,data) {
                if (err) {
                    throw err;
                }
                response.setHeader("Content-Type", "application/xml");
                response.write(data);
                response.end();
            });
        } catch(err) {
            internalServerError(response,err);
        }
    } else if(fs.existsSync(proxyHandlerFile)) {
        try {
            fs.readFile(proxyHandlerFile,'utf8',function(err,data) {
                if (err) {
                    throw err;
                }
                var proxyProvider = JSON.parse(data);
                request.url = proxyProvider.url;
                proxy.proxyRequest(request,response,{
                    host: proxyProvider.host,
                    port: proxyProvider.port,
                    changeOrigin: true
                });
            });
        } catch(err) {
            internalServerError(response,err);
        }
    }
    else {
        // We didn't find any appropriate handlers loop through the url path
        // to see if there are any handlers on the path
        var urlParts = url.parse(request.url, true);
        var urlComponents = urlParts.pathname.split('/');
        var clone = urlComponents.slice(0);
        var handled = false;

        for (var i = 0; i < urlComponents.length; i++) {
            clone.pop();
            console.log(clone.join('/'));
            var jsHandlerFile = routerBase + clone.join('/') + ".js";
            if(fs.existsSync(jsHandlerFile)) {
                handled = true;
                try {
                    var handler = require(process.cwd() + "/" + jsHandlerFile);
                    handler(request,response,proxy,config);
                } catch(err) {
                    internalServerError(response,err);
                }
                break;
            }
        }

        if(!handled) {
            response.statusCode = 404;
            response.write("<b>404 - Not Found</b>");
            response.end();
        }
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
