/* location Provider
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
        name: '$location',
        dependencies: ['$']
    }, function($) {

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Private variables

        var pathRegEx = /^([^\?#]*)(\?([^#]*))?(#(.*))?$/;

        var defaultPorts = {
            'http': 80,
            'https': 443,
            'ftp': 21
        };

        var current = {
            absUrl: null,
            protocol: null,
            host: null,
            port: null,
            url: null
        };

        var baseElement = $('base');

        var prevBrowserUrl = location.href;
        var nextBrowserUrl = null;

        var initialUrl = browserUrl();
        var appBase = serverBase(initialUrl) + (baseHref() || '/');
        var appBaseNoFile = stripFile(appBase);

        var basePrefix = basePrefix || '';

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Private functions

        /**
         * @name $location#absUrl
         *
         * @description
         * This method is getter only.
         *
         * Return full url representation with all segments encoded according to rules specified in
         * [RFC 3986](http://www.ietf.org/rfc/rfc3986.txt).
         *
         * @return {string} full url
         */
        function absUrl() {
            return current.absUrl;
        }

        function apply() {
            var currBrowserUrl = browserUrl();
            if (current.absUrl !== currBrowserUrl) {
                var event = {
                    redirect: null
                };
                event = alia.broadcast('locationChangeStarted', [current.absUrl, currBrowserUrl]);
                if (event.isDefaultPrevented()) {
                    parse(currBrowserUrl);
                } else {
                    browserUrl(current.absUrl);
                    alia.broadcast('locationChanged', current.absUrl);
                }
            }
        }

        /**
         * @name $location#baseHref
         *
         * @description
         * Returns current <base href>
         * (always relative - without domain)
         *
         * @returns {string} The current base href.
         */
        function baseHref() {
            var href = baseElement.attr('href');
            return href ? href.replace(/^(https?\:)?\/\/[^\/]*/, '') : '';
        }

        /**
         *
         * @param {string} begin
         * @param {string} whole
         * @returns {string} returns text from whole after begin or undefined if it does not begin with
         *                   expected string.
         */
        function beginsWith(begin, whole) {
            if (whole.indexOf(begin) === 0) {
                return whole.substr(begin.length);
            }
        }

        /**
         * @name $browser#url
         *
         * @description
         * GETTER:
         * Without any argument, this method just returns current value of location.href.
         *
         * SETTER:
         * With at least one argument, this method sets url to new value.
         * If html5 history api supported, pushState/replaceState is used, otherwise
         * location.href/location.replace is used.
         * Returns its own instance to allow chaining
         *
         * NOTE: this api is intended for use only by the $location service. Please use the
         * {@link ng.$location $location service} to change url.
         *
         * @param {string} url New url (when used as setter)
         * @param {boolean=} replace Should new url replace current history record ?
         */
        function browserUrl(url, replace) {

            // Android Browser BFCache causes location and history references to become stale
            if (location !== window.location) {
                location = window.location;
            }
            if (history !== window.history) {
                history = window.history;
            }

            if (typeof url === 'string') {
                if (prevBrowserUrl === url) {
                    return;
                }
                prevBrowserUrl = url;
                if (replace) {
                    history.replaceState(null, '', url);
                } else {
                    history.pushState(null, '', url);
                }
            } else {
                // - Using nextBrowserUrl is a workaround for an IE7-9 issue with location.replace and 
                //   location.href methods not updating location.href synchronously.
                // - The replacement is a workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=407172
                return nextBrowserUrl || location.href.replace(/%27/g, "'");
            }
        }

        /**
         * Compose url and update `absUrl` property
         * @private
         */
        function compose() {
            var search = alia.url.toQueryString(current.search);
            var hash = current.hash ? '#' + alia.url.encodeUriSegment(current.hash) : '';
            current.url = alia.url.encodePath(current.path) + (search ? '?' + search : '') + hash;
            current.absUrl = appBaseNoFile + current.url.substr(1); // First char is always '/'
        }

        function hash(value) {
            if (typeof value === 'string') {
                compose();
            } else {
                return current.hash;
            }
        }

        function host() {
            return current.host;
        }

        function parse(url) {
            var pathUrl = beginsWith(appBaseNoFile, url);
            if (typeof pathUrl !== 'string') {
                throw new Error("Invalid path url during location.parse");
            }
            parseApplicationUrl(pathUrl);
            if (!current.path) {
                current.path = '/';
            }
            compose();
        }

        function parseAbsoluteUrl(abs) {
            var resolved = alia.url.resolve(abs, appBase);
            current.protocol = resolved.protocol;
            current.host = resolved.hostname;
            current.port = parseInt(resolved.port, 10) || defaultPorts[resolved.protocol] || null;
        }

        function parseApplicationUrl(relativeUrl) {
            var prefixed = (relativeUrl.charAt(0) !== '/');
            if (prefixed) {
                relativeUrl = '/' + relativeUrl;
            }
            var resolved = alia.url.resolve(relativeUrl, appBase);
            var pathname = resolved.pathname;
            var c = prefixed && pathname.charAt(0) === '/' ? pathname.substring(1) : pathname;
            current.path = decodeURIComponent(c);
            current.search = alia.url.parseQuery(resolved.search);
            current.hash = decodeURIComponent(resolved.hash);

            // Ensure path starts with '/';
            if (current.path && current.path.charAt(0) != '/') {
                current.path = '/' + current.path;
            }
        }

        /**
         * @ngdoc method
         * @name $location#path
         *
         * @description
         * This method is getter / setter.
         *
         * Return path of current url when called without any parameter.
         *
         * Change path when called with parameter and return `$location`.
         *
         * Note: Path should always begin with forward slash (/), this method will add the forward slash
         * if it is missing.
         *
         * @param {string=} path New path
         * @return {string} path
         */
        function path(value) {
            if (typeof value === 'string') {
                current.path = value.charAt(0) == '/' ? value : '/' + value;
                compose();
                apply();
            } else {
                return current.path;
            }
        }

        function protocol() {
            return current.protocol;
        }

        function port() {
            return current.port;
        }

        function rewrite(url) {
            var appUrl, prevAppUrl;
            if ((appUrl = beginsWith(appBase, url)) !== undefined) {
                prevAppUrl = appUrl;
                if ((appUrl = beginsWith(basePrefix, appUrl)) !== undefined) {
                    return appBaseNoFile + (beginsWith('/', appUrl) || appUrl);
                } else {
                    return appBase + prevAppUrl;
                }
            } else if ((appUrl = beginsWith(appBaseNoFile, url)) !== undefined) {
                return appBaseNoFile + appUrl;
            } else if (appBaseNoFile == url + '/') {
                return appBaseNoFile;
            }
        }

        function search(sch, value) {
            switch (arguments.length) {
                case 0:
                    return current.search;
                case 1:
                    if (alia.isString(sch)) {
                        current.search = alia.url.parseQuery(sch);
                    } else if (alia.isObject(sch)) {
                        current.search = sch;
                    } else {
                        throw new Error('The first argument of the `$location#search()` call must be a string or an object.');
                    }
                    break;
                default:
                    if (alia.isUndefined(value) || value === null) {
                        delete current.search[sch];
                    } else {
                        current.search[sch] = value;
                    }
            }
            compose();
            apply();
        }

        /* return the server only (scheme://host:port) */
        function serverBase(url) {
            return url.substring(0, url.indexOf('/', url.indexOf('//') + 2));
        }

        function stripFile(url) {
            return url.substr(0, stripHash(url).lastIndexOf('/') + 1);
        }

        function stripHash(url) {
            var index = url.indexOf('#');
            return index == -1 ? url : url.substr(0, index);
        }



        function url(str, replace) {
            if (alia.isUndefined(str)) {
                return current.url;
            }

            var match = pathRegEx.exec(str);
            if (match[1]) {
                path(decodeURIComponent(match[1]));
            }
            if (match[2] || match[1]) {
                search(match[3] || '');
            }
            hash(match[5] || '', replace);
            apply();
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Events

        var body = $('body');

        body.on('click', function(event) {
            if (event.ctrlKey || event.metaKey || event.which == 2) {
                return;
            }

            // Traverse the DOM up to find first A tag
            var elm = $(event.target);
            while (elm[0].nodeName.toLowerCase() !== 'a') {
                if (elm[0] === body[0] || !(elm = elm.parent())[0]) {
                    return;
                }
            }

            // Rewrite href
            var absHref = elm.prop('href');
            var rewrittenUrl = rewrite(absHref);
            if (absHref && !elm.attr('target') && rewrittenUrl && !event.isDefaultPrevented()) {

                if (rewrittenUrl !== browserUrl()) {
                    event.preventDefault();
                    parse(rewrittenUrl);
                    apply();
                }
            }
        });

        $(window).on('popstate', function() {
            console.log("popstate");
            var currBrowserUrl = browserUrl();
            if (prevBrowserUrl === currBrowserUrl) {
                return;
            }
            prevBrowserUrl = currBrowserUrl;
            if (current.absUrl !== currBrowserUrl) {
                var oldUrl = current.absUrl;
                parse(currBrowserUrl);
                if (false) {

                } else {
                    alia.broadcast('locationChanged', [current.absUrl, oldUrl]);
                }
            }
        });

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Initialization

        parseAbsoluteUrl(appBase);
        parse(rewrite(initialUrl));
        apply();

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Provider

        return {
            absUrl: absUrl,
            baseHref: baseHref,

            /**
             * @name $location#hash
             *
             * @description
             * This method is getter / setter.
             *
             * Return hash fragment when called without any parameter.
             *
             * Change hash fragment when called with parameter and return `$location`.
             *
             * @param {string=} hash New hash fragment
             * @return {string} hash
             */
            hash: hash,

            /**
             * @name $location#host
             *
             * @description
             * This method is getter only.
             *
             * Return host of current url.
             *
             * @return {string} host of current url.
             */
            host: host,
            path: path,

            /**
             * @name $location#protocol
             *
             * @description
             * This method is getter only.
             *
             * Return protocol of current url.
             *
             * @return {string} protocol of current url
             */
            protocol: protocol,

            /**
             * @name $location#port
             *
             * @description
             * This method is getter only.
             *
             * Return port of current url.
             *
             * @return {Number} port
             */
            port: port,

            /**
             * @ngdoc method
             * @name $location#search
             *
             * @description
             * This method is getter / setter.
             *
             * Return search part (as object) of current url when called without any parameter.
             *
             * Change search part when called with parameter and return `$location`.
             *
             *
             * ```js
             * // given url http://example.com/#/some/path?foo=bar&baz=xoxo
             * var searchObject = $location.search();
             * // => {foo: 'bar', baz: 'xoxo'}
             *
             *
             * // set foo to 'yipee'
             * $location.search('foo', 'yipee');
             * // => $location
             * ```
             *
             * @param {string|Object.<string>|Object.<Array.<string>>} search New search params - string or
             * hash object.
             *
             * When called with a single argument the method acts as a setter, setting the `search` component
             * of `$location` to the specified value.
             *
             * If the argument is a hash object containing an array of values, these values will be encoded
             * as duplicate search parameters in the url.
             *
             * @param {(string|Array<string>)=} paramValue If `search` is a string, then `paramValue` will
             * override only a single search property.
             *
             * If `paramValue` is an array, it will override the property of the `search` component of
             * `$location` specified via the first argument.
             *
             * If `paramValue` is `null`, the property specified via the first argument will be deleted.
             *
             * @return {Object} If called with no arguments returns the parsed `search` object. If called with
             * one or more arguments returns `$location` object itself.
             */
            search: search,

            /**
             * @name $location#url
             *
             * @description
             * This method is getter / setter.
             *
             * Return url (e.g. `/path?a=b#hash`) when called without any parameter.
             *
             * Change path, search and hash, when called with parameter and return `$location`.
             *
             * @param {string=} url New url without base prefix (e.g. `/path?a=b#hash`)
             * @param {string=} replace The path that will be changed
             * @return {string} url
             */
            url: url
        };
    });
}(alia));