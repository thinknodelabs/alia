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

}(window.alia = window.alia || {}));