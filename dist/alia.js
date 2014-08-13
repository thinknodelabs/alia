/* Alia.js
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

(function(alia, undefined) {
    "use strict";

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Private variables

    var providers = {},
        services = {},
        views = {};

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Public variables

    alia.version = '0.1.0';

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Private functions

    function applyDefaults(obj, defaults, options) {
        for (var p in defaults) {
            if (!obj.hasOwnProperty(p) ||
                (options && options.hasOwnProperty(p) && !options[p].hasOwnProperty(obj[p]))) {
                obj[p] = defaults[p];
            }
        }
    };

    alia.defaults = alia.applyDefaults = applyDefaults;

    function replace(string, params) {
        for (var p in params) {
            if (params.hasOwnProperty(p)) {
                string = string.replace(':' + p, params[p]);
            }
        }
        return string;
    }

    alia.replace = replace;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Error Generation

    alia.error = function(message /*, [inputs]*/ ) {
        for (var i = 1; i < arguments.length; ++i) {
            message = message.replace(/\?/, "'" + arguments[i] + "'");
        }
        return new Error(message);
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Events

    function Event(type) {
        this.defaultPrevented = false;
        this.result = undefined;
        this.type = type;
    }

    Event.prototype.isDefaultPrevented = function() {
        return this.defaultPrevented;
    };

    Event.prototype.preventDefault = function() {
        this.defaultPrevented = true;
    };

    var handlers = {};

    alia.on = function(type, callback) {
        var h = handlers[type];
        if (!h) {
            h = handlers[type] = [];
        }
        h.push(callback);
    };

    alia.broadcast = function(type, params) {
        var i;
        var event = new Event(type);
        var h = handlers[type];
        if (h) {
            var args = [event];
            if (arguments.length === 2) {
                args = args.concat(params);
            } else if (arguments.length > 2) {
                for (i = 1; i < arguments.length; ++i) {
                    args.push(arguments[i]);
                }
            }
            for (i = 0; i < h.length; ++i) {
                event.result = h[i].apply(null, args);
                if (event.isDefaultPrevented()) {
                    break;
                }
            }
        }
        return event;
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Unique identification

    var uid = ['0', '0', '0'];

    /**
     * A consistent way of creating unique IDs in alia. The ID is a sequence of alpha numeric
     * characters such as '012ABC'. The reason why we are not using simply a number counter is that
     * the number string gets longer over time, and it can also overflow, where as the nextId
     * will grow much slower, it is a string, and it will never overflow.
     *
     * @returns {string} an unique alpha-numeric string
     */
    function nextUid() {
        var index = uid.length;
        var digit;
        while (index) {
            index--;
            digit = uid[index].charCodeAt(0);
            if (digit == 57 /*'9'*/ ) {
                uid[index] = 'A';
                return uid.join('');
            }
            if (digit == 90 /*'Z'*/ ) {
                uid[index] = '0';
            } else {
                uid[index] = String.fromCharCode(digit + 1);
                return uid.join('');
            }
        }
        uid.unshift('0');
        return uid.join('');
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Current context

    var jviewport = $('body').find('[alia-viewport]').first();
    jviewport.attr('id', nextUid());

    var viewport = new Context(jviewport.attr('id'));
    alia.viewport = viewport;

    var currentContext = viewport;
    var currentContextType = 'view';

    alia.currentContext = function() {
        return currentContext;
    };

    alia.currentContextType = function() {
        return currentContextType;
    };

    alia.stageMultiviewContext = function() {
        viewport.empty();
        currentContextType = 'multiview';
        currentContext = Multiview.create(viewport);
        return currentContext;
    };

    alia.stageViewContext = function() {
        viewport.empty();
        currentContextType = 'view';
        currentContext = viewport;
        return currentContext;
    };


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Alerts

    var jalerts = $('body').find('[alia-alerts]').first();
    jalerts.attr('id', nextUid());
    alia.alerts = new Context(jalerts.attr('id'));


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Header

    var jheader = $('body').find('[alia-header]').first();
    jheader.attr('id', nextUid());
    alia.header = new Context(jheader.attr('id'));

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Element functions

    function append( /* [key], content, [params] */ ) {
        var key = '';
        var content = '';
        var params = null;
        if (arguments.length === 1) {
            content = arguments[0];
        } else if (arguments.length === 2) {
            if (typeof arguments[1] === 'string') {
                key = arguments[0];
                content = arguments[1];
            } else if (typeof arguments[1] === 'object') {
                content = arguments[0];
                params = arguments[1];
            }
        } else if (arguments.length === 3) {
            key = arguments[0];
            content = arguments[1];
            params = arguments[2];
        }

        if (typeof key !== 'string') {
            throw new Error('Append only accepts string keys');
        } else if (typeof content !== 'string' || content.length === 0) {
            throw new Error('Append only accepts non-empty string html arguments');
        } else if (params && (typeof params !== 'object' || Array.isArray(params))) {
            throw new Error('Append only accepts object parameters');
        } else if (!this.ids.hasOwnProperty(key)) {
            throw new Error("Unrecognized key");
        }

        // Replace content parameters
        for (var p in params) {
            if (params.hasOwnProperty(p)) {
                content = content.replace(new RegExp(':' + p, 'g'), params[p]);
            }
        }

        var component = new Component();

        function rewrite() {
            var j = $(this);
            var key = j.attr('alia-context');
            var id = nextUid();
            component.ids[key] = id;
            j.attr('id', id);
        }

        // Create jquery element
        var elm = $(content);
        elm.filter('[alia-context]').each(rewrite);
        elm.find('[alia-context]').each(rewrite);

        // Append to appropriate contextual element
        $('#' + this.ids[key]).append(elm);
        return component;
    }

    function empty() {
        for (var key in this.ids) {
            if (this.ids.hasOwnProperty(key)) {
                $('#' + this.ids[key]).empty();
            }
        }
    }

    function onClick(callback) {
        $('#' + this.ids['']).click(this, callback);
        return this;
    }

    function onClickScrollTo(name) {
        $('#' + this.ids['']).click(this, function() {
            $('html, body').animate({
                scrollTop: $('[name="' + name + '"]').offset().top - parseInt($('body').css('padding-top'))
            }, 300);
        });
        return this;
    }

    function onEnterKey(callback) {
        $('#' + this.id()).keypress(function(event) {
            if (event.which === 13) {
                event.preventDefault();
                callback();
            }
        });
        return this;
    }

    function onHover(callback_a, callback_b) {
        $('#' + this.ids['']).hover(callback_a, callback_b);
        return this;
    }

    function onFocusOut(callback) {
        $('#' + this.ids['']).focusout(callback);
        return this;
    }

    function onResize(callback) {
        $(window).resize(function() {
            var w = $('#' + this.ids['']).width();
            callback(w);
        }.bind(this));
        return this;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Control

    function Control(id) {
        Object.defineProperty(this, 'id', {
            value: id,
            writable: false,
            enumerable: true,
            configurable: false
        });
    }

    Control.prototype.hide = function() {
        $('#' + this.id).hide();
    };

    Control.prototype.onClick = function(callback) {
        $('#' + this.id).click(this, callback);
        return this;
    };

    Control.prototype.show = function() {
        $('#' + this.id).show();
    };


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Context

    function Context(ids) {
        if (typeof ids === 'string') {
            this.ids = {
                '': ids
            };
        } else {
            this.ids = ids;
        }
    }

    Context.prototype.append = append;
    Context.prototype.empty = empty;


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Component

    function Component() {
        this.ids = {};
    }

    Component.prototype.animateOnClick = function(button, properties, opts) {
        var self = this;
        $('#' + button.id()).click(function() {
            $('#' + self.id()).animate(properties, opts);
        });
    };

    Component.prototype.bindCheckboxField = function(key, property) {
        if (arguments.length === 1) {
            property = key;
            key = '';
        }

        // Define property and ensure we can set
        var j = $('#' + this.id(key));
        var p = this.defineProperty('checked', property);
        if (!property.isSettable()) {
            throw new Error("Attempted to bind non-settable observer to checkbox field");
        }

        var current;

        // One-way binding from property to checkbox        
        p.onResolve(function(value) {
            if (current !== value) {
                current = value;
                j.prop("checked", value);
            }
        });

        // One-way binding from checkbox to property
        j.on('change', function() {
            var value = j.prop("checked") || false;
            if (current !== value) {
                current = value;
                p.set(current);
            }
        });
    };

    Component.prototype.bindCollapse = function(key, prop) {
        var property = this.defineProperty('collapsed', prop);

        var j = $('#' + this.id(key));

        property.onResolve(function(value) {
            if (value) j.slideUp(200);
            else j.slideDown(200);
        });
    };

    Component.prototype.bindDisabled = function(key, property) {
        if (arguments.length === 1) {
            property = key;
            key = '';
        }
        var j = $('#' + this.id(key));
        this.defineProperty('disabled', property).onResolve(function(value) {
            if (value === true) {
                j.attr('disabled', 'disabled');
            } else {
                j.removeAttr('disabled');
            }
        });
        return this;
    };

    Component.prototype.bindHtml = function(key, name, property) {
        if (arguments.length === 2) {
            property = name;
            name = key;
            key = '';
        }
        var j = $('#' + this.id(key));
        this.defineProperty(name, property).onResolve(function(value) {
            j.html(value);
        });
        return this;
    };

    Component.prototype.bindDate = function(key, property) {
        switch (arguments.length) {
            case 1:
                property = key;
                key = '';
        }

        var j = $('#' + this.id(key));
        var get = function() {
            return new Date(j.val());
        };

        var p = this.defineProperty('date', property);

        var current;

        j.change(function() {
            var value = get();
            if (current !== value) {
                current = value;
                p.set(current);
            }
        });

        p.onResolve(function(value) {
            if (current !== value) {
                current = value;
                j.datepicker('setDate', current);
            }
        });
    };

    Component.prototype.bindText = function(key, name, property, type) {
        switch (arguments.length) {
            case 1:
                type = 'text';
                property = key;
                name = 'text';
                key = '';
                break;
            case 2:
                type = name;
                property = key;
                name = 'text';
                key = '';
                break;
            case 3:
                type = property;
                property = name;
                name = key;
                key = '';
                break;
        }

        // Create element binding
        var j = $('#' + this.id(key));
        var parser = this.defaultParser(type);

        var get = function() {
            var value;
            try {
                value = parser(j.val());
            } catch (e) {
                value = null;
            }
            return value;
        };

        var p = this.defineProperty(name, property);

        var current;

        j.on('input', function() {
            var value = get();
            if (current !== value) {
                current = value;
                p.set(current);
            }
        });

        p.onResolve(function(value) {
            if (current !== value) {
                current = value;
                j.val(current);
            }
        });
        p.onUnresolve(function() {
            j.val('');
        });
    };

    Component.prototype.bindSelectValue = function(key, property) {
        if (arguments.length === 1) {
            property = key;
            key = '';
        }

        // Define property and ensure we can set
        var j = $('#' + this.id(key));

        var p = this.defineProperty('selected', property);

        var current;

        j.on('change', function() {
            var value = j.val();
            if (current !== value) {
                current = value;
                p.set(current);
            }
        });

        p.onResolve(function(value) {
            if (current !== value) {
                current = value;
                j.val(current);
            }
        });
    };

    Component.prototype.bindOption = function(option, cb) {
        var j = $('#' + this.id(''));

        var value = option.then(function(value) {
            if (typeof value === 'string' || typeof value === 'number') {
                return value;
            } else {
                return value.value;
            }
        });

        var text = option.then(function(value) {
            if (typeof value === 'string' || typeof value === 'number') {
                return value;
            } else {
                return value.text;
            }
        });

        var t = this.defineProperty('text', text);
        var v = this.defineProperty('value', value);

        v.onResolve(function(value) {
            this.attr('value', value);
            if (typeof cb === 'function') cb();
        }.bind(this));

        t.onResolve(function(text) {
            this.html(text);
            if (typeof cb === 'function') cb();
        }.bind(this));
    }

    Component.prototype.bindVisible = function(key, property) {
        if (arguments.length === 1) {
            property = key;
            key = '';
        }
        var j = $('#' + this.id(key));
        this.defineProperty('visible', property).onResolve(function(value) {
            if (value === true) {
                j.show();
            } else {
                j.hide();
            }
        });
        return this;
    };

    Component.prototype.defaultParser = function(type) {
        switch (type) {
            case 'number':
                return function(text) {
                    return parseInt(text);
                };
            default:
                return function(text) {
                    return text || "";
                };
        }
    };

    Component.prototype.append = append;
    Component.prototype.empty = empty;

    Component.prototype.attr = function(name, value) {
        return this.kattr('', name, value);
    };

    Component.prototype.class = function(type, value) {
        return this.kclass('', type, value);
    };

    Component.prototype.doClick = function() {
        $('#' + this.ids['']).click();
    };

    Component.prototype.css = function(type, value) {
        return this.kcss('', type, value);
    };

    Component.prototype.defineProperty = function(name, value) {
        var property;
        if (alia.isAccessor(value)) {
            property = value;
        } else {
            property = alia.state(value);
        }
        Object.defineProperty(this, name, {
            value: property,
            writable: false,
            enumerable: true,
            configurable: false
        });
        return property;
    };

    Component.prototype.defineStatic = function(name, value) {
        Object.defineProperty(this, name, {
            value: value,
            writable: false,
            enumerable: true,
            configurable: false
        });
    };


    Component.prototype.defineEvent = function(type) {
        var self = this;
        var handlers = {};
        var on = 'on' + type.charAt(0).toUpperCase() + type.slice(1);
        var emit = 'emit' + type.charAt(0).toUpperCase() + type.slice(1);
        this[on] = function(callback) {
            var h = handlers[type];
            if (!h) {
                h = handlers[type] = [];
            }
            h.push(callback);
            return self;
        };
        this[emit] = function(params) {
            var i;
            var event = new Event(type);
            var h = handlers[type];
            if (h) {
                var args = [event];
                if (arguments.length === 1) {
                    args = args.concat(params);
                } else if (arguments.length > 1) {
                    for (i = 0; i < arguments.length; ++i) {
                        args.push(arguments[i]);
                    }
                }
                for (i = 0; i < h.length; ++i) {
                    event.result = h[i].apply(null, args);
                    if (event.isDefaultPrevented()) {
                        break;
                    }
                }
            }
            return event;
        };
    };

    Component.prototype.doFocus = function(key) {
        if (typeof key === 'undefined') key = '';
        $('#' + this.id(key)).focus();
    };

    Component.prototype.html = function(value) {
        return this.khtml('', value);
    };

    Component.prototype.id = function(key) {
        if (typeof key !== 'string') {
            return this.ids[''];
        } else {
            return this.ids[key];
        }
    };

    Component.prototype.kattr = function(key, name, value) {
        if (value) {
            $('#' + this.ids[key]).attr(name, value);
        } else {
            return $('#' + this.ids[key]).attr(name);
        }
    };

    Component.prototype.kclass = function(key, type, value) {
        if (type === 'add') {
            $('#' + this.ids[key]).addClass(value);
        } else if (type === 'remove') {
            $('#' + this.ids[key]).removeClass(value);
        } else if (type === 'toggle') {
            $('#' + this.ids[key]).toggleClass(value);
        }
        return this;
    };

    Component.prototype.kcss = function(key, type, value) {
        if (value) {
            $('#' + this.ids[key]).css(type, value);
            return this;
        } else {
            return $('#' + this.ids[key]).css(type);
        }
    };

    Component.prototype.khtml = function(key, value) {
        if (value) {
            $('#' + this.id(key)).html(value);
        } else {
            return $('#' + this.id(key)).html(value);
        }
    };

    Component.prototype.onClick = onClick;

    Component.prototype.onClickScrollTo = onClickScrollTo;

    Component.prototype.onEnterKey = onEnterKey;

    Component.prototype.onFocusOut = onFocusOut;

    Component.prototype.onHover = onHover;

    Component.prototype.onResize = onResize;

    Component.prototype.removeAttr = function(name) {
        $('#' + this.id()).removeAttr(name);
    };

    Component.prototype.slideDownOnClick = function(button, callback) {
        var self = this;
        $('#' + button.id()).click(function() {
            if (callback) {
                $('#' + self.id()).slideDown(callback);
            } else {
                $('#' + self.id()).slideDown();
            }
        });
    };

    Component.prototype.slideUpOnClick = function(button, callback) {
        var self = this;
        $('#' + button.id()).click(function() {
            if (callback) {
                $('#' + self.id()).slideUp(callback);
            } else {
                $('#' + self.id()).slideUp();
            }
        });
    };

    Component.prototype.width = function() {
        return $('#' + this.ids['']).width();
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Multiview

    alia.multiviewSignature = function(name, args) {
        var signature = [];
        for (var p in args) {
            if (args.hasOwnProperty(p) && p !== 'view') {
                signature.push(p + '=' + args[p]);
            }
        }
        return ['view=' + name].concat(signature.sort()).join('&');
    };

    /**
     * Workspace represents a set of tasks that can be composed in a single page interface.
     *
     * @constructor
     * @param {object} Options.
     */
    function Multiview(ctx) {
        var $localStorage = providers.$localStorage;
        var leftCollapsed = $localStorage.get('leftCollapsed');
        var rightCollapsed = $localStorage.get('rightCollapsed');
        if (leftCollapsed === null) {
            leftCollapsed = false;
            $localStorage.set('leftCollapsed', false);
        }
        if (rightCollapsed === null) {
            leftCollapsed = false;
            $localStorage.set('rightCollapsed', false);
        }

        // Create contexts for multiview
        this.body = ctx.append('<div alia-context class="multiview-body sticky-navigation sticky-menu"></div>');

        // Navigation
        this.nav = this.body.append('<div alia-context class="multiview-navigation"></div>').onHover(function() {
            this.body.class('add', 'peek-navigation');
        }.bind(this), function() {
            this.body.class('remove', 'peek-navigation');
        }.bind(this));

        // Menu
        this.menu = this.body.append('<div alia-context class="multiview-menu"></div>').onHover(function() {
            this.body.class('add', 'peek-menu');
        }.bind(this), function() {
            this.body.class('remove', 'peek-menu');
        }.bind(this));

        // Left Toggler
        this.body.append('<div alia-context class="multiview-navigation-draggable"></div>').onClick(function() {
            this.body.class('toggle', 'sticky-navigation');
            this.body.class('toggle', 'collapse-navigation');
            leftCollapsed = !leftCollapsed;
            $localStorage.set('leftCollapsed', leftCollapsed);
        }.bind(this)).onHover(function() {
            this.body.class('add', 'peek-navigation');
        }.bind(this), function() {
            this.body.class('remove', 'peek-navigation');
        }.bind(this));

        // Viewport
        this.viewport = this.body.append('<div alia-context class="multiview-viewport"></div>');

        // Right Toggler
        this.body.append('<div alia-context class="multiview-menu-draggable"></div>').onClick(function() {
            this.body.class('toggle', 'sticky-menu');
            this.body.class('toggle', 'collapse-menu');
            rightCollapsed = !rightCollapsed;
            $localStorage.set('rightCollapsed', rightCollapsed);
        }.bind(this)).onHover(function() {
            this.body.class('add', 'peek-menu');
        }.bind(this), function() {
            this.body.class('remove', 'peek-menu');
        }.bind(this));

        // Handle initial state of navigation and [context menus] - not handling context menus yet
        if (leftCollapsed) {
            this.body.class('add', 'collapse-navigation');
        }
        if (rightCollapsed) {
            this.body.class('add', 'collapse-menu');
        }

        var self = this;
        this.nav.push = function() {
            self.push.apply(self, arguments);
            return this;
        };

        this.viewport.push = function() {
            self.push.apply(self, arguments);
            return this;
        };

        this.views = {};
        this.default = null;
        this.active = null;
    }

    Multiview.prototype.begin = function(name, args) {
        var $location = providers.$location;
        if (!this.active && !$location.search().hasOwnProperty('view')) {
            this.push(name, args);
        }
        return this;
    };

    Multiview.create = function(ctx) {
        var multiview = new Multiview(ctx);
        return {
            begin: function() {
                multiview.begin.apply(multiview, arguments);
                return this;
            },
            currentSignature: function() {
                return multiview.active ? multiview.active.signature : '';
            },
            include: function() {
                multiview.include.apply(multiview, arguments);
                return this;
            },
            navigation: function() {
                multiview.navigation.apply(multiview, arguments);
                return this;
            },
            push: function() {
                multiview.push.apply(multiview, arguments);
                return this;
            },
            signature: function() {
                multiview.signature.apply(multiview, arguments);
                return this;
            },
            view: function() {
                multiview.view.apply(multiview, arguments);
                return this;
            }
        };
    };

    Multiview.prototype.include = function(options) {
        if (typeof options.name !== 'string') {
            throw new Error('Missing or invalid view name during multiview definition');
        }
        this.views[options.name] = {
            name: options.name,
            included: views[options.path]
        };
        return this;
    };

    Multiview.prototype.push = function(name, args) {
        var view = this.views[name];
        if (!view) {
            throw new Error("Unknown view: " + name);
        }
        var signature = this.signature(name, args);
        if (this.active && this.active.signature === signature) {
            return;
        }

        var vp = this.viewport;

        if (typeof view.viewport === 'function') {
            vp.empty();
            view.viewport(this.viewport, args);
        } else if (typeof view.included === 'object') {
            alia.resolve(view.included.opts.dependencies, [this.viewport], {
                $query: args
            }).onResolve(function(args) {
                vp.empty();
                view.included.ctor.apply(null, args);
            });
        }

        var aview = {
            signature: signature
        };

        this.active = aview;
        var $location = providers.$location;
        $location.search(this.active.signature);

        // Return view
        return aview;
    };

    Multiview.prototype.navigation = function(callback) {
        callback(this.nav);
        return this;
    };

    Multiview.prototype.signature = function(name, args) {
        var signature = [];
        for (var p in args) {
            if (args.hasOwnProperty(p) && p !== 'view') {
                signature.push(p + '=' + args[p]);
            }
        }
        return ['view=' + name].concat(signature.sort()).join('&');
    };

    Multiview.prototype.view = function(options) {
        if (typeof options.name !== 'string') {
            throw new Error('Missing or invalid view name during multiview definition');
        } else if (typeof options.viewport !== 'function') {
            throw new Error('Missing or invalid viewport function during multiview definition');
        }
        this.views[options.name] = {
            name: options.name,
            viewport: options.viewport
        };
        return this;
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Public definitions


    alia.defineControl = function(opts, ctor) {
        var name = 'do' + opts.name.charAt(0).toUpperCase() + opts.name.slice(1);
        alia[name] = function(parent, options) {
            var component = ctor.call(parent, options);
            return component;
        };
    };

    alia.defineHeader = function(opts, ctor) {
        alia.resolve(opts.dependencies).then(function(deps) {
            alia.header.empty();
            var fcn = ctor.apply(null, deps);
            var component = fcn.call(null, alia.header);
            return component;
        });
    };

    alia.defineLayout = function(opts, ctor) {
        var name = 'layout' + opts.name.charAt(0).toUpperCase() + opts.name.slice(1);
        alia[name] = function(parent, options, callback) {
            var component = ctor.call(parent, options);
            return function() {
                callback(component);
                return component;
            }();
        };
    };

    alia.defineMultiview = function(opts, ctor) {
        alia.defineView({
            path: opts.path,
            dependencies: opts.dependencies,
            multiview: true
        }, ctor);
    };

    alia.defineProvider = function(opts, ctor) {
        if (typeof opts.name !== 'string' || opts.name.substr(0, 1) !== '$') {
            throw new Error('Missing or invalid provider name');
        }
        var args = [];
        var deps = opts.dependencies;
        if (deps) {
            for (var i = 0; i < deps.length; ++i) {
                if (providers.hasOwnProperty(deps[i])) {
                    args.push(providers[deps[i]]);
                } else {
                    throw new Error('Unable to resolve provider dependency');
                }
            }
        }
        providers[opts.name] = ctor.apply(null, args);
    };

    alia.resolve = function(dependencies, args, data) {
        args = args || [];
        for (var i = 0; i < dependencies.length; ++i) {
            if (data && data.hasOwnProperty(dependencies[i])) {
                args.push(data[dependencies[i]]);
            } else if (providers.hasOwnProperty(dependencies[i])) {
                args.push(providers[dependencies[i]]);
            } else if (services.hasOwnProperty(dependencies[i])) {
                args.push(services[dependencies[i]].accessor);
            }
        }
        return alia.all(args);
    };


    alia.defineService = function(options, constructor) {
        console.log("--- DEFINE SERVICE:", options.name);
        services[options.name] = {
            dependencies: options.dependencies,
            constructor: constructor,
            accessor: alia.resolve(options.dependencies).then(function(deps) {
                return constructor.apply(null, deps);
            })
        };
    };

    alia.defineView = function(opts, ctor) {
        var $route = providers.$route;
        if (!$route) {
            throw new Error("Missing route provider");
        }
        views[opts.path] = {
            opts: opts,
            ctor: ctor
        };
        $route.when(opts, ctor);
        if (opts.default === true) {
            $route.otherwise(opts, ctor);
        }
    };

}(window.alia = window.alia || {}));;/* Alia.js (url.js)
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

(function(alia, undefined) {
    "use strict";

    // NOTE: The usage of window and document instead of $window and $document here is
    // deliberate.  This service depends on the specific behavior of anchor nodes created by the
    // browser (resolving and parsing URLs) that is unlikely to be provided by mock objects and
    // cause us to break tests.  In addition, when the browser resolves a URL for XHR, it
    // doesn't know about mocked locations and resolves URLs to the real document - which is
    // exactly the behavior needed here.  There is little value is mocking these out for this
    // service.
    var node = document.createElement("a");
    var origin = resolve(window.location.href, true);

    /**
     * Encode path using encodeUriSegment, ignoring forward slashes
     *
     * @param {string} path Path to encode
     * @returns {string}
     */
    function encodePath(path) {
        var segments = path.split('/');
        var i = segments.length;
        while (i--) {
            segments[i] = encodeUriSegment(segments[i]);
        }
        return segments.join('/');
    }

    /**
     * This method is intended for encoding *key* or *value* parts of query component. We need a custom
     * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
     * encoded per http://tools.ietf.org/html/rfc3986:
     *    query       = *( pchar / "/" / "?" )
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val)
            .replace(/%40/gi, '@')
            .replace(/%3A/gi, ':')
            .replace(/%24/g, '$')
            .replace(/%2C/gi, ',')
            .replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
    }

    /**
     * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
     * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
     * segments:
     *    segment       = *pchar
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriSegment(val) {
        return encodeUriQuery(val, true)
            .replace(/%26/gi, '&')
            .replace(/%3D/gi, '=')
            .replace(/%2B/gi, '+');
    }

    /**
     * Parse a request URL and determine whether this is a same-origin request as the application document.
     *
     * @param {string|object} requestUrl The url of the request as a string that will be resolved
     * or a parsed URL object.
     * @returns {boolean} Whether the request is for the same origin as the application document.
     */
    function isSameOrigin(requestUrl) {
        var parsed = (alia.isString(requestUrl)) ? alia.url.resolve(requestUrl) : requestUrl;
        return (parsed.protocol === origin.protocol && parsed.host === origin.host);
    }

    /**
     * Parses an escaped url query string into key-value pairs.
     * @returns {Object.<string,boolean|Array>}
     */
    function parseQuery(query) {
        var obj = {};
        var items = (query || '').split('&');
        for (var i = 0; i < items.length; ++i) {
            var kv = items[i];
            if (kv) {
                var tokens = kv.split('=');
                var key = tryDecodeURIComponent(tokens[0]);
                if (alia.isDefined(key)) {
                    var val = alia.isDefined(tokens[1]) ? tryDecodeURIComponent(tokens[1]) : true;
                    if (!obj[key]) {
                        obj[key] = val;
                    } else if (alia.isArray(obj[key])) {
                        obj[key].push(val);
                    } else {
                        obj[key] = [obj[key], val];
                    }
                }
            }
        }
        return obj;
    }

    /**
     * Implementation Notes for non-IE browsers
     * ----------------------------------------
     * Assigning a URL to the href property of an anchor DOM node, even one attached to the DOM,
     * results both in the normalizing and parsing of the URL.  Normalizing means that a relative
     * URL will be resolved into an absolute URL in the context of the application document.
     * Parsing means that the anchor node's host, hostname, protocol, port, pathname and related
     * properties are all populated to reflect the normalized URL.  This approach has wide
     * compatibility - Safari 1+, Mozilla 1+, Opera 7+,e etc.  See
     * http://www.aptana.com/reference/html/api/HTMLAnchorElement.html
     *
     * Implementation Notes for IE
     * ---------------------------
     * IE >= 8 and <= 10 normalizes the URL when assigned to the anchor node similar to the other
     * browsers.  However, the parsed components will not be set if the URL assigned did not specify
     * them.  (e.g. if you assign a.href = "foo", then a.protocol, a.host, etc. will be empty.)  We
     * work around that by performing the parsing in a 2nd step by taking a previously normalized
     * URL (e.g. by assigning to a.href) and assigning it a.href again.  This correctly populates the
     * properties such as protocol, hostname, port, etc.
     *
     * IE7 does not normalize the URL when assigned to an anchor node.  (Apparently, it does, if one
     * uses the inner HTML approach to assign the URL as part of an HTML snippet -
     * http://stackoverflow.com/a/472729)  However, setting img[src] does normalize the URL.
     * Unfortunately, setting img[src] to something like "javascript:foo" on IE throws an exception.
     * Since the primary usage for normalizing URLs is to sanitize such URLs, we can't use that
     * method and IE < 8 is unsupported.
     *
     * References:
     *   http://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement
     *   http://www.aptana.com/reference/html/api/HTMLAnchorElement.html
     *   http://url.spec.whatwg.org/#urlutils
     *   https://github.com/angular/angular.js/pull/2902
     *   http://james.padolsey.com/javascript/parsing-urls-with-the-dom/
     *
     * @function
     * @param {string} url The URL to be parsed.
     * @description Normalizes and parses a URL.
     * @returns {object} Returns the normalized URL as a dictionary.
     *
     *   | member name   | Description    |
     *   |---------------|----------------|
     *   | href          | A normalized version of the provided URL if it was not an absolute URL |
     *   | protocol      | The protocol including the trailing colon                              |
     *   | host          | The host and port (if the port is non-default) of the normalizedUrl    |
     *   | search        | The search params, minus the question mark                             |
     *   | hash          | The hash string, minus the hash symbol
     *   | hostname      | The hostname
     *   | port          | The port, without ":"
     *   | pathname      | The pathname, beginning with "/"
     *
     */
    function resolve(url) {
        var href = url;

        if (alia.msie) {
            // Normalize before parse.  Refer Implementation Notes on why this is
            // done in two steps on IE.
            node.setAttribute("href", href);
            href = node.href;
        }

        node.setAttribute('href', href);

        // node provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
            href: node.href,
            protocol: node.protocol ? node.protocol.replace(/:$/, '') : '',
            host: node.host,
            search: node.search ? node.search.replace(/^\?/, '') : '',
            hash: node.hash ? node.hash.replace(/^#/, '') : '',
            hostname: node.hostname,
            port: node.port,
            pathname: (node.pathname.charAt(0) === '/') ? node.pathname : '/' + node.pathname
        };
    }

    function toQueryString(obj) {
        var parts = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var value = obj[key];
                if (alia.isArray(value)) {
                    for (var i = 0; i < value.length; ++i) {
                        var av = value[i];
                        parts.push(encodeUriQuery(key, true) +
                            (av === true ? '' : '=' + encodeUriQuery(av, true)));
                    }
                } else {
                    parts.push(encodeUriQuery(key, true) +
                        (value === true ? '' : '=' + encodeUriQuery(value, true)));
                }
            }
        }
        return parts.length ? parts.join('&') : '';
    }

    /**
     * Tries to decode the URI component without throwing an exception.
     *
     * @private
     * @param str value potential URI component to check.
     * @returns {boolean} True if `value` can be decoded
     * with the decodeURIComponent function.
     */
    function tryDecodeURIComponent(value) {
        try {
            return decodeURIComponent(value);
        } catch (e) {
            // Ignore any invalid uri component
        }
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Public interface

    alia.url = {
        encodePath: encodePath,
        encodeUriSegment: encodeUriSegment,
        encodeUriQuery: encodeUriQuery,
        isSameOrigin: isSameOrigin,
        parseQuery: parseQuery,
        resolve: resolve,
        toQueryString: toQueryString,
        tryDecodeURIComponent: tryDecodeURIComponent
    };

}(window.alia = window.alia || {}));;/* Alia.js (utils.js)
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

(function(alia, undefined) {
    "use strict";

    /**
     * @name alia.isArray
     * @module alia
     * @function
     *
     * @description
     * Determines if a reference is an `Array`.
     *
     * @param {*} value Reference to check.
     * @returns {boolean} True if `value` is an `Array`.
     */
    alia.isArray = function(value) {
        return toString.call(value) === '[object Array]';
    };

    alia.isArrayLike = function(obj) {
        if (obj === null || isWindow(obj)) {
            return false;
        }

        var length = obj.length;

        if (obj.nodeType === 1 && length) {
            return true;
        }

        return alia.isString(obj) || alia.isArray(obj) || length === 0 ||
            typeof length === 'number' && length > 0 && (length - 1) in obj;
    };

    /**
     * @ngdoc function
     * @name angular.isDefined
     * @module alia
     * @function
     *
     * @description
     * Determines if a reference is defined.
     *
     * @param {*} value Reference to check.
     * @returns {boolean} True if `value` is defined.
     */
    alia.isDefined = function(value) {
        return typeof value !== 'undefined';
    };

    alia.isNull = function(value) {
        return value === null;
    };

    alia.isNotNull = function(value) {
        return value !== null;
    };

    /**
     * @name alia.isObject
     * @module alia
     * @function
     *
     * @description
     * Determines if a reference is an `Object`. Unlike `typeof` in JavaScript, `null`s are not
     * considered to be objects. Note that JavaScript arrays are objects.
     *
     * @param {*} value Reference to check.
     * @returns {boolean} True if `value` is an `Object` but not `null`.
     */
    alia.isObject = function(value) {
        return value !== null && typeof value === 'object';
    };

    alia.isString = function(value) {
        return typeof value === 'string';
    };

    alia.isEmptyString = function(value) {
        return typeof value !== 'string' || value.length === 0;
    };

    alia.isNotEmptyString = function(value) {
        return typeof value === 'string' && value.length > 0;
    };

    /**
     * @name alia.isUndefined
     * @module alia
     * @function
     *
     * @description
     * Determines if a reference is undefined.
     *
     * @param {*} value Reference to check.
     * @returns {boolean} True if `value` is undefined.
     */
    alia.isUndefined = function(value) {
        return typeof value === 'undefined';
    };

    alia.isNotUndefined = function(value) {
        return typeof value !== 'undefined';
    };

    alia.isWindow = function(obj) {
        return obj && obj.document && obj.location && obj.alert && obj.setInterval;
    };

    /**
     * @name alia.int
     * @module alia
     * @function
     *
     * @description Converts the specified string to an integer.
     * @param {string} string String to be converted to an integer.
     * @returns {integer} an integer.
     */

    alia.int = function(str) {
        return parseInt(str, 10);
    };

    /**
     * @name alia.lowercase
     * @module alia
     * @function
     *
     * @description Converts the specified string to lowercase.
     * @param {string} string String to be converted to lowercase.
     * @returns {string} Lowercased string.
     */
    alia.lowercase = function(string) {
        return alia.isString(string) ? string.toLowerCase() : string;
    };

    alia.noop = function() {};


}(window.alia = window.alia || {}));;/* jQuery Provider
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

(function(alia, $) {
    "use strict";
    
    alia.defineProvider({
        name: '$'
    }, function() {
        return $;
    });
}(alia, $));;/* Window Provider
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

(function(alia, window) {
    "use strict";

    alia.defineProvider({
        name: '$window'
    }, function() {
        return window;
    });
}(alia, window));;/* location Provider
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
}(alia));;/* localStorage Provider
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
        name: '$localStorage',
        dependencies: []
    }, function() {

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Provider functions

        var sto = {};

        sto.set = function(prop, value) {
            if (typeof prop === 'string') {
                var key = 'alia-' + prop;
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                throw new Error('Attempted to set localStorage value for non-string property');
            }
        };

        sto.get = function(prop) {
            if (typeof prop === 'string') {
                var key = 'alia-' + prop;
                return JSON.parse(localStorage.getItem(key));
            } else {
                throw new Error('Attempted to get localStorage value for non-string property');
            }
        };

        sto.remove = function(prop) {
            if (typeof prop === 'string') {
                var key = 'alia-' + prop;
                localStorage.removeItem(key);
            } else {
                throw new Error('Attempted to remove localStorage item for non-string property');
            }
        };

        sto.clear = function() {
            for (var key in localStorage) {
                if (key.substr(0, 5) === 'alia-') {
                    localStorage.removeItem(key);
                }
            }
        };

        return sto;

    });
}(alia));;/* Route Provider
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
            if (!current || current.path !== next.path) {
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
}(alia));;/* Request Provider
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