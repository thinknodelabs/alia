/* Request Provider
 *
 * Copyright (c) 2014 .decimal, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function(alia) {
    "use strict";

    alia.defineProvider({
        name: '$request',
        dependencies: ['$']
    }, function($) {

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Private functions

        function compose(url, params, query) {
            var i, p;
            for (p in params) {
                if (params.hasOwnProperty(p)) {
                    url = url.replace(':' + p, params[p]);
                }
            }
            var q = [];
            if (Array.isArray(query)) {
                for (i = 0; i < query.length; ++i) {
                    if (query[i].hasOwnProperty('key') && query[i].hasOwnProperty('value')) {
                        q.push(query[i].key + '=' + query[i].value);
                    }
                }
            } else {
                for (p in query) {
                    if (query.hasOwnProperty(p)) {
                        q.push(p + '=' + query[p].toString());
                    }
                }
            }
            if (q.length > 0) {
                url += "?" + q.join('&');
            }
            return url;
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Provider

        var $request = function(options) {
            var settings = {
                url: compose(options.url, options.params, options.query),
                type: (options.method) ? options.method : 'GET'
            };
            if (options.json) {
                settings.data = JSON.stringify(options.json);
                settings.contentType = 'application/json';
                settings.processData = false;
            }
            $.extend(true, options, settings);
            var promise = $.ajax(options);
            return alia.deferred(function(resolve, reject) {
                promise.then(function(data, textStatus, jqXHR) {
                    resolve({
                        body: data,
                        status: textStatus,
                        statusCode: jqXHR.status,
                        xhr: jqXHR
                    });
                }, function(jqXHR, textStatus, errorThrown) {
                    var res = {
                        error: errorThrown,
                        status: textStatus,
                        statusCode: jqXHR.status,
                        xhr: jqXHR
                    };
                    var event = alia.broadcast('requestError', [res]);
                    if (event.defaultPrevented) {
                        //parse(currBrowserUrl);
                    } else {
                        //subject.onError(res);
                    }
                    reject(alia.error(res));
                });
            });
        };

        $request.get = function(url, params, query) {
            return $request({
                url: url,
                method: 'GET',
                params: params,
                query: query,
                xhrFields: {
                    withCredentials: true
                }
            });
        };

        $request.post = function(url, params, query, body) {
            switch (arguments.length) {
                case 2:
                    body = params;
                    params = null;
                    break;
                case 3:
                    body = query;
                    query = null;
                    break;
                case 4:
                    break;
            }
            return $request({
                url: url,
                method: 'POST',
                params: params,
                query: query,
                json: body,
                xhrFields: {
                    withCredentials: true
                }
            });
        };

        $request.put = function(url, params, query, body) {
            switch (arguments.length) {
                case 2:
                    body = params;
                    params = null;
                    break;
                case 3:
                    body = query;
                    query = null;
                    break;
                case 4:
                    break;
            }
            return $request({
                url: url,
                method: 'PUT',
                params: params,
                query: query,
                json: body
            });
        };

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Return provider

        return $request;
    });
}(alia));