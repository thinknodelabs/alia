/* Route Provider
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
        name: '$route',
        dependencies: ['$', '$location']
    }, function($, $location) {

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Private variables

        var routes = {};

        var current = null;

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Private functions

        function load(path) {
            if (routes.hasOwnProperty(current.path)) {
                var route = routes[current.path];
                if (route.workspace) {
                    current.context = alia.stageWorkspaceContext();
                    current.type = 'workspace';
                } else if (route.multiview) {
                    current.context = alia.stageMultiviewContext();
                    current.type = 'multiview';
                } else {
                    current.context = alia.stageViewContext();
                    current.type = 'view';
                }
                alia.resolve(route.dependencies, [current.context], {
                    $params: current.params,
                    $query: current.query
                }).onResolve(function(args) {
                    var signature, workspace, multiview;
                    route.ctor.apply(null, args);
                    if (current.type === 'workspace' && typeof current.query.task === 'string') {
                        workspace = current.context;
                        signature = workspace.signature(current.query.task, current.query);
                        if (workspace.currentSignature() !== signature) {
                            workspace.push(current.query.task, current.query);
                        }
                    } else if (current.type === 'multiview' && typeof current.query.view === 'string') {
                        multiview = current.context;
                        signature = multiview.signature(current.query.view, current.query);
                        if (multiview.currentSignature() !== signature) {
                            multiview.push(current.query.view, current.query);
                        }
                    }
                });
            }
        }

        function matcher(on, route) {
            if (!route.regex) {
                return null;
            }
            var m = route.regex.re.exec(on);
            if (!m) {
                return null;
            }
            var keys = route.regex.keys;
            var params = {};
            for (var i = 1, len = m.length; i < len; ++i) {
                var key = keys[i - 1];
                var val = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
                if (key && val) {
                    params[key.name] = val;
                }
            }
            return params;
        }

        function parseRoute() {
            var params, match;
            for (var path in routes) {
                if (routes.hasOwnProperty(path)) {
                    params = matcher($location.path(), routes[path]);
                    if (params) {
                        match = {
                            path: path,
                            params: params,
                            query: $location.search()
                        };
                        break;
                    }
                }
            }
            return match;
        }

        function pathRegExp(path, opts) {
            opts = opts || {};
            var insensitive = opts.caseInsensitiveMatch;
            var ret = {
                originalPath: path,
                re: path
            };
            var keys = ret.keys = [];
            path = path
                .replace(/([().])/g, '\\$1')
                .replace(/(\/)?:(\w+)([\?\*])?/g, function(_, slash, key, option) {
                    var optional = option === '?' ? option : null;
                    var star = option === '*' ? option : null;
                    keys.push({
                        name: key,
                        optional: !!optional
                    });
                    slash = slash || '';
                    return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (star && '(.+?)' || '([^/]+)') + (optional || '') + ')' + (optional || '');
                })
                .replace(/([\/$\*])/g, '\\$1');

            ret.re = new RegExp('^' + path + '$', insensitive ? 'i' : '');
            return ret;
        }

        function update(event, url) {
            var multiview, workspace, signature;
            var next = parseRoute();
            if (!current || current.path !== next.path || !_.isEqual(current.params, next.params)) {
                current = next;
                load();
            } else if (current.type === 'workspace' && typeof next.query.task === 'string') {
                workspace = current.context;
                signature = workspace.signature(next.query.task, next.query);
                if (workspace.currentSignature() !== signature) {
                    workspace.push(next.query.task, next.query);
                }
            } else if (current.type === 'multiview' && typeof next.query.view === 'string') {
                multiview = current.context;
                signature = multiview.signature(next.query.view, next.query);
                if (multiview.currentSignature() !== signature) {
                    multiview.push(next.query.view, next.query);
                }
            }
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Events

        alia.on('locationChanged', update);

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Provider

        var provider = {};

        provider.when = function(opts, ctor) {
            routes[opts.path] = {
                path: opts.path,
                dependencies: opts.dependencies,
                regex: pathRegExp(opts.path),
                workspace: opts.workspace === true,
                multiview: opts.multiview === true,
                ctor: ctor
            };
            var params = matcher($location.path(), routes[opts.path]);
            if (params) {
                update(null, opts.path);
            }

            // // create redirection for trailing slashes
            // if (path) {
            //     var redirectPath = (path[path.length - 1] == '/') ? path.substr(0, path.length - 1) : path + '/';

            //     routes[redirectPath] = angular.extend({
            //             redirectTo: path
            //         },
            //         pathRegExp(redirectPath, route)
            //     );
            // }

            return this;
        };

        provider.otherwise = function(opts, ctor) {
            //this.when(opts, ctor);
            return this;
        };

        // provider.load = function(path) {
        //     load(path);
        // }


        // Return provider
        return provider;
    });
}(alia));