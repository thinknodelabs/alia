;
(function($, Bacon, alia, undefined) {


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Private variables

    var providers = {};
    var services = {};

    var header = null;
    var footer = null;

    var views = {};

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Private functions



    // alia.toProperty = function(value) {
    //     if (value instanceof Bacon.Property) {
    //         return value;
    //     } else if (value instanceof Promise) {
    //         return Bacon.fromPromise(value).toProperty();
    //     } else {
    //         return Bacon.constant(value);
    //     }
    // }



    alia.applyDefaults = function(obj, defaults, options) {
        for (var p in defaults) {
            if (!obj.hasOwnProperty(p) ||
                (options && options.hasOwnProperty(p) && !options[p].hasOwnProperty(obj[p]))) {
                obj[p] = defaults[p];
            }
        }
    }

    alia.defaults = alia.applyDefaults;


    // alia.project = function(subject, property) {
    //     if (alia.isObserver(subject)) {
    //         var lens = new Bacon.Lens(property);
    //         return subject.lens(lens);
    //     } else if (alia.isObservable(subject)) {
    //         return subject.map(property);
    //     } else if (subject.hasOwnProperty(property)) {
    //         throw new Error("Unable to project non-observable subjects");
    //     }
    // };



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
    // Public variables

    alia.version = '0.1.0';


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Errors

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
    }

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
    }

    alia.broadcast = function(type, params) {
        var event = new Event(type);
        var h = handlers[type];
        if (h) {
            var args = [event];
            if (arguments.length === 2) {
                args = args.concat(params);
            } else if (arguments.length > 2) {
                for (var i = 1; i < arguments.length; ++i) {
                    args.push(arguments[i]);
                }
            }
            for (var i = 0; i < h.length; ++i) {
                event.result = h[i].apply(null, args);
                if (event.isDefaultPrevented()) {
                    break;
                }
            }
        }
        return event;
    }


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Url rewriting

    alia.href = function(url) {
        var $location = providers['$location'];
        if (url.charAt(0) === '#') {
            return $location.path().substr(1) + url;
        } else {
            return url;
        }

    }

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
    };


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Current context

    var jviewport = $('body').find('[alia-viewport]').first();
    jviewport.attr('id', nextUid());
    //alia.viewport = currentContext;

    var viewport = new Context(jviewport.attr('id'));
    alia.viewport = viewport;

    var currentContext = viewport;
    var currentContextType = 'view';

    alia.currentContext = function() {
        return currentContext;
    };

    alia.currentContextType = function() {
        return currentContextType;
    }

    alia.stageMultiviewContext = function() {
        viewport.empty();
        currentContextType = 'multiview';
        return currentContext = Multiview.create(viewport);
    };

    alia.stageViewContext = function() {
        viewport.empty();
        currentContextType = 'view';
        return currentContext = viewport;
    };

    alia.stageWorkspaceContext = function() {
        viewport.empty();
        currentContextType = 'workspace';
        return currentContext = Workspace.create(viewport);
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

        var self = this;

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
            $('#' + this.ids[key]).empty();
        }
    }

    function onClick(callback) {
        if (arguments.length === 1) {
            $('#' + this.ids['']).click(this, callback);
        } else if (arguments.length === 2) {
            var data = arguments[0];
            var callback = arguments[1];
            $('#' + this.ids['']).click(data, function(event) {
                callback(event.data);
            });
        } else if (arguments.length === 3) {
            var data = arguments[0];
            var clickable_cols = arguments[1];
            var callback = arguments[2];
            $('#' + this.ids['']).click(data, function(event) {
                var index = parseInt($(this).children('td:has(#' + event.target.id + ')').index());
                if (index >= 0 && clickable_cols.hasOwnProperty(index)) {
                    clickable_cols[index](event.data);
                } else {
                    callback(event.data);
                }
            });
        }
        return this;
    }

    function onClickScrollTo(name) {
        $('#' + this.ids['']).click(this, function(event) {
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
        })
    }

    Component.prototype.bindCheckboxField = function(key, property) {
        if (arguments.length === 1) {
            property = key;
            key = '';
        }

        // Define property and ensure we can set
        var j = $('#' + this.id(key));
        var property = this.defineProperty('checked', property);
        if (!property.isSettable()) {
            throw new Error("Attempted to bind non-settable observer to checkbox field");
        }

        var current;

        // One-way binding from property to checkbox        
        property.onResolve(function(value) {
            if (current !== value) {
                current = value;
                j.prop("checked", value);
            }
        });

        // One-way binding from checkbox to property
        j.on('change', function(event) {
            var value = j.prop("checked") || false;
            if (current !== value) {
                current = value;
                property.set(current);
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
    }

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

    // Component.prototype.bindText = function(key, name, property, type) {
    //     switch (arguments.length) {
    //         case 1:
    //             type = 'text';
    //             property = key;
    //             name = 'text';
    //             key = '';
    //         case 2:
    //             type = name;
    //             property = key;
    //             name = 'text';
    //             key = '';
    //             break;
    //         case 3:
    //             type = property;
    //             property = name;
    //             name = key;
    //             key = '';
    //             break;
    //     }

    //     // Create element binding
    //     var j = $('#' + this.id(key));
    //     var parser = this.defaultParser(type);
    //     var get = function() {
    //         var value;
    //         try {
    //             value = parser(j.val());
    //         } catch (e) {
    //             value = null;
    //         }
    //         return value;
    //     };
    //     var autofillPoller = function() {
    //         return Bacon.interval(50).take(10).map(get).filter(alia.isNotEmptyString).take(1);
    //     };
    //     var keyinput = j.asEventStream('keyup input');
    //     var clipboard = j.asEventStream("cut paste").delay(1);
    //     var events = keyinput.merge(clipboard).merge(autofillPoller());
    //     var model = Bacon.Binding({
    //         get: get,
    //         events: events,
    //         set: function(value) {
    //             return j.val(value);
    //         }
    //     });

    //     // Bind model to property
    //     model.bind(alia.state(property));
    //     this.defineProperty(name, model);
    // };

    Component.prototype.bindDate = function(key, property) {
        switch (arguments.length) {
            case 1:
                property = key;
                key = '';
        }

        var j = $('#' + this.id(key));
        var get = function () {
            return new Date(j.val());
        }

        var p = this.defineProperty('date', property);

        var current;

        j.change(function(event) {
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

    }

    Component.prototype.bindText = function(key, name, property, type) {
        switch (arguments.length) {
            case 1:
                type = 'text';
                property = key;
                name = 'text';
                key = '';
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

        j.on('input', function(event) {
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
        p.onUnresolve(function (value) {
            j.val('');
        });


        // var autofillPoller = function() {
        //     return Bacon.interval(50).take(10).map(get).filter(alia.isNotEmptyString).take(1);
        // };
        // var keyinput = j.asEventStream('keyup input');
        // var clipboard = j.asEventStream("cut paste").delay(1);
        // var events = keyinput.merge(clipboard).merge(autofillPoller());
        // var model = Bacon.Binding({
        //     get: get,
        //     events: events,
        //     set: function(value) {
        //         return j.val(value);
        //     }
        // });

        // Bind model to property
        // model.bind(alia.state(property));
        
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

        j.on('change', function(event) {
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



    // // TODO: this function should be removed
    // Component.prototype.bindEnabled = function(key, property) {
    //     if (arguments.length === 1) {
    //         property = key;
    //         key = '';
    //     }
    //     var initValue;
    //     if (property instanceof Bacon.Property) {
    //         initValue = property.get();
    //         property.onResolve(function(value) {
    //             var j = $('#' + this.id(key));
    //             (value) ? j.removeAttr('disabled') : j.attr('disabled', 'disabled');
    //         }.bind(this));
    //     } else if (typeof property === 'boolean') {
    //         initValue = property;
    //     }
    //     var j = $('#' + this.id(key));
    //     (initValue) ? j.removeAttr('disabled') : j.attr('disabled', 'disabled');
    //     return this;
    // }

    // Component.prototype.bindAttr = function(name, value) {
    //     //     $('#' + this.id).attr(attributeName, value);
    // };



    Component.prototype.class = function(type, value) {
        return this.kclass('', type, value);
    }

    Component.prototype.doClick = function() {
        $('#' + this.ids['']).click();
    }

    Component.prototype.css = function(type, value) {
        return this.kcss('', type, value);
    }

    Component.prototype.defineProperty = function(name, value) {
        var property;
        if (alia.isAccessor(value)) {
            property = value;
        // } else if (alia.isObservable(value)) {
        //     property = new Bacon.Model();
        //     property.addSource(value);
        } else if (value instanceof Promise) {
            property = alia.promise(value);
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
            var event = new Event(type);
            var h = handlers[type];
            if (h) {
                var args = [event];
                if (arguments.length === 1) {
                    args = args.concat(params);
                } else if (arguments.length > 1) {
                    for (var i = 0; i < arguments.length; ++i) {
                        args.push(arguments[i]);
                    }
                }
                for (var i = 0; i < h.length; ++i) {
                    event.result = h[i].apply(null, args);
                    if (event.isDefaultPrevented()) {
                        break;
                    }
                }
            }
            return event;
        };
    };

    // Component.prototype.hide = function(key) {
    //     $('#' + this.id(key)).hide();
    //     this.visible.set(false);
    // }

    Component.prototype.html = function(value) {
        return this.khtml('', value);
    };

    Component.prototype.id = function(key) {
        if (typeof key !== 'string') {
            return this.ids[''];
        } else {
            return this.ids[key];
        }
    }

    Component.prototype.kattr = function(key, name, value) {
        if (value) {
            $('#' + this.ids[key]).attr(name, value);
        } else {
            return $('#' + this.ids[key]).attr(name);
        }
    }

    Component.prototype.kclass = function(key, type, value) {
        if (type === 'add') {
            $('#' + this.ids[key]).addClass(value);
        } else if (type === 'remove') {
            $('#' + this.ids[key]).removeClass(value);
        } else if (type === 'toggle') {
            $('#' + this.ids[key]).toggleClass(value);
        }
        return this;
    }

    Component.prototype.kcss = function(key, type, value) {
        if (value) {
            $('#' + this.ids[key]).css(type, value);
            return this;
        } else {
            return $('#' + this.ids[key]).css(type);
        }
    }

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
    }

    Component.prototype.slideDownOnClick = function(button, callback) {
        var self = this;
        $('#' + button.id()).click(function(event) {
            if (callback) {
                $('#' + self.id()).slideDown(callback);
            } else {
                $('#' + self.id()).slideDown();
            }
        });
    }

    Component.prototype.slideUpOnClick = function(button, callback) {
        var self = this;
        $('#' + button.id()).click(function(event) {
            if (callback) {
                $('#' + self.id()).slideUp(callback);
            } else {
                $('#' + self.id()).slideUp();
            }
        });
    }

    Component.prototype.width = function() {
        return $('#' + this.ids['']).width();
    }

    // Component.prototype.show = function(key) {
    //     $('#' + this.id(key)).show();
    //     this.visible.set(true);
    // }

    // TODO: Remove this
    // Component.prototype.tab = function(state) {
    //     console.log('tab');
    //     console.log(this);
    //     //$('#' + this.ids[''] + ' a').tab(state);
    //     // console.log('#' + this.ids[''] + ' .nav li:first' + ' a');
    //     // console.log($('#' + this.ids[''] + ' .nav li:first' + ' a'));
    //     // $('#' + this.ids[''] + ' .nav li:first' + ' a').tab('show');
    // }

    alia.multiviewSignature = function(name, args) {
        var signature = [];
        for (var p in args) {
            if (args.hasOwnProperty(p) && p !== 'view') {
                signature.push(p + '=' + args[p]);
            }
        }
        return ['view=' + name].concat(signature.sort()).join('&');
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Multiview

    /**
     * Workspace represents a set of tasks that can be composed in a single page interface.
     *
     * @constructor
     * @param {object} Options.
     */
    function Multiview(ctx) {
        var $localStorage = providers['$localStorage'];
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
        this.nav = this.body.append('<div alia-context class="multiview-navigation"></div>').onHover(function(event) {
            this.body.class('add', 'peek-navigation');
        }.bind(this), function(event) {
            this.body.class('remove', 'peek-navigation');
        }.bind(this));

        // Menu
        this.menu = this.body.append('<div alia-context class="multiview-menu"></div>').onHover(function(event) {
            this.body.class('add', 'peek-menu');
        }.bind(this), function(event) {
            this.body.class('remove', 'peek-menu');
        }.bind(this));

        // Left Toggler
        this.body.append('<div alia-context class="multiview-navigation-draggable"></div>').onClick(function() {
            this.body.class('toggle', 'sticky-navigation');
            this.body.class('toggle', 'collapse-navigation');
            leftCollapsed = !leftCollapsed;
            $localStorage.set('leftCollapsed',leftCollapsed);
        }.bind(this)).onHover(function(event) {
            this.body.class('add', 'peek-navigation');
        }.bind(this), function(event) {
            this.body.class('remove', 'peek-navigation');
        }.bind(this));

        // Viewport
        this.viewport = this.body.append('<div alia-context class="multiview-viewport"></div>');

        // Right Toggler
        this.body.append('<div alia-context class="multiview-menu-draggable"></div>').onClick(function(event) {
            this.body.class('toggle', 'sticky-menu');
            this.body.class('toggle', 'collapse-menu');
            rightCollapsed = !rightCollapsed;
            $localStorage.set('rightCollapsed',rightCollapsed);
        }.bind(this)).onHover(function(event) {
            this.body.class('add', 'peek-menu');
        }.bind(this), function(event) {
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
    };

    Multiview.prototype.begin = function(name, args) {
        var $location = providers['$location'];
        if (!this.active && !$location.search().hasOwnProperty('view')) {
            this.push(name, args);
        }
        return this;
    };

    Multiview.create = function(ctx) {
        var multiview = new Multiview(ctx);
        // console.log(multiview);
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
            // include: function() {
            //     workspace.include.apply(workspace, arguments);
            //     return this;
            // },
            // push: function(name, args) {
            //     console.log("external push");
            //     if (workspace.root) {
            //         workspace.push(workspace.root, name, args);
            //     } else {
            //         console.log(name);
            //         workspace.preload = {
            //             name: name,
            //             args: args
            //         };
            //     }
            // }
        };
    };

    Multiview.prototype.include = function(options) {
        if (typeof options.name !== 'string') {
            throw new Error('Missing or invalid view name during multiview definition');
        } // else if (typeof options.path !== 'string' || ) {
        //     throw new Error('Missing or invalid viewport function during multiview definition');
        // }
        // console.log(options);
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

        var initializing = this.active === null;
        var aview = {
            signature: signature
        };

        this.active = aview;
        var $location = providers['$location'];
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
    // Workspace

    /**
     * Workspace represents a set of tasks that can be composed in a single page interface.
     *
     * @constructor
     * @param {object} Options.
     */
    function Workspace(opts) {
        this.context = opts.context;
        this.control = opts.control;
        this.viewport = opts.viewport;

        this.definitions = {};
        this.singletons = {};
        this.root = null;
        this.active = null;
    }

    /** 
     * @name Workspace#activate
     * @private
     *
     * @description
     * Activates a task within the workspace.
     */
    Workspace.prototype.activate = function(task) {
        console.log(task);
        if (task.isActive()) {
            return;
        }

        // Detach current children
        if (task.child) {
            task.child.detach();
            task.child = null;
        }

        // Configure parent
        var parent = task.parent;
        if (parent) {

            // Collapse parent task
            if (parent !== this.root || !this.keepRootOpen) {
                parent.collapse();
            }

            // Handle current child of parent
            if (parent.child === task) {
                task.expand();
            } else if (parent.child !== null) {
                parent.child.detach();
            }

            // Set child
            parent.child = task;
        }

        // Render viewport
        this.viewport.empty();
        task.view(this.viewport, task.args);

        // Handle detached task
        if (task.detached) {
            $('#' + this.control.id('stack')).append(task.element);
            task.detached = false;

            $('#' + task.panel.id()).show();
            $('#' + task.body.id()).show();
            $('#' + task.id).show();
        }
    }

    /** 
     * @name Workspace#begin
     * @private
     *
     * @description
     * Begins a workspace with the given root task.
     * @param {string} The task name to serve as the root task of the workspace.
     * @param {boolean} A boolean value indicating whether or not to keep the root task open.
     */
    Workspace.prototype.begin = function(name, keepOpen) {
        this.keepRootOpen = keepOpen === true;
        this.viewport.empty();
        if (!this.active) {
            console.log("no active");
            this.push(null, name);
        }
        return this;
    };

    Workspace.create = function(ctx) {

        $('#' + viewport.ids['']).addClass('workspace');

        // Create root context for workspace
        var ctx = viewport.append([
            '<div alia-context class="container-fluid">',
            '  <div alia-context="body" class="row"></div>',
            '</div>'
        ].join(''));

        // Construct workspace
        var workspace = new Workspace({
            context: ctx,
            control: ctx.append('body', [
                '<div alia-context class="col-lg-3">',
                '  <div alia-context="stack" class="panel-group"></div>',
                '</div>'
            ].join('')),
            viewport: ctx.append('body', [
                '<div alia-context class="col-lg-9"></div>'
            ].join('')),
            keepRootOpen: false
        });

        // Return workspace context
        return {
            begin: function() {
                workspace.begin.apply(workspace, arguments);
                return this;
            },
            currentSignature: function() {
                return workspace.active.signature;
            },
            define: function() {
                workspace.define.apply(workspace, arguments);
                return this;
            },
            include: function() {
                workspace.include.apply(workspace, arguments);
                return this;
            },
            push: function(name, args) {
                console.log("external push");
                if (workspace.root) {
                    workspace.push(workspace.root, name, args);
                } else {
                    console.log(name);
                    workspace.preload = {
                        name: name,
                        args: args
                    };
                }
            },
            signature: function(name, args) {
                return workspace.signature(name, args);
            }
        };
    };

    Workspace.prototype.define = function(opts) {
        if (typeof opts.name !== 'string') {
            throw new Error('Missing or invalid task name in definition');
        }
        this.definitions[opts.name] = {
            name: opts.name,
            title: opts.title,
            singleton: opts.singleton === true,
            control: opts.control,
            view: opts.view
        };
        return this;
    };

    Workspace.prototype.include = function(opts) {
        return this;
    };

    /** 
     * Pushes a new task onto the workspace as the active child of the indicated parent.
     */
    Workspace.prototype.push = function(parent, name, args) {

        // Get task definition
        var definition = this.definitions[name];
        if (!definition) {
            throw new Error("Unknown task: " + name);
        } else if (!parent && !definition.singleton) {
            throw new Error('Attempted to add instance class with no parent');
        }

        // Find existing singleton task
        var signature = this.signature(name, args);
        //console.log("workspace.push:", parent ? parent.signature : undefined, signature);
        var task = this.singletons[signature];
        if (task) {
            this.activate(task);
        } else {

            // $('#' + this.control.id() + ' .panel .panel-body').css('height','');

            // Append panel (including header)
            var panel = this.control.append('stack', [
                '<div alia-context class="panel panel-default">',
                '  <div alia-context="header" style="cursor: pointer;" class="panel-heading">',
                '    <h4 alia-context="title" class="panel-title"></h4>',
                '  </div>',
                '</div>'
            ].join(''));

            // Append body
            var body = panel.append('<div alia-context class="panel-body"></div>');

            // Initialize and bind title
            var title = alia.state(definition.title);
            body.defineProperty('title', title);
            body.title.assign(panel, 'khtml', 'title');

            // Create and add task
            task = new Task(this, {
                id: panel.id(),
                parent: parent,
                name: name,
                signature: signature,
                args: args,
                panel: panel,
                body: body,
                control: definition.control,
                view: definition.view
            });
            if (definition.singleton) {
                this.singletons[signature] = task;
            } else {
                parent.subtasks.push(task);
            }

            // Setup context functions
            body.push = task.push.bind(task);
            this.viewport.push = task.push.bind(task);

            // Header click event handler
            var jheader = $('#' + panel.id('header'));
            jheader.click(function() {
                this.activate(task);
            }.bind(this));

            // Render and activate task
            this.render(task);
            this.activate(task);

            // var bottom = $(window).height();
            // var offset = 0;
            // $('#' + this.control.id() + ' .panel').each(function () {
            //     // console.log($(this).css("display") == 'none');
            //     console.log('here');
            //     offset += $(this).height();
            // });
            // var padding = 75;
            // var height = bottom - offset - padding;

            // console.log(bottom);
            // console.log(offset);
            // console.log(height);
            // $('#' + task.body.id()).css('height', height + 'px');
        }

        // Update visible task and location bar
        this.active = task;
        if (parent) {
            var $location = providers['$location'];
            $location.search(signature);
        }

        // Return task
        return task;
    };

    Workspace.prototype.render = function(task) {
        task.control(task.body, task.args);
        this.viewport.empty();
        task.view(this.viewport, task.args);
    };

    Workspace.prototype.signature = function(name, args) {
        var signature = [];
        for (var p in args) {
            if (args.hasOwnProperty(p) && p !== 'task') {
                signature.push(p + '=' + args[p]);
            }
        }
        return ['task=' + name].concat(signature.sort()).join('&');
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Task

    /**
     * Task represents a task within a workspace.
     *
     * @constructor
     * @param {Workspace} Workspace containing this task.
     * @param {object} Options.
     */
    function Task(workspace, opts) {
        this.workspace = workspace;

        this.id = opts.id;
        this.name = opts.name;
        this.signature = opts.signature;
        this.args = opts.args || undefined;
        this.control = opts.control;
        this.view = opts.view;

        this.panel = opts.panel;
        this.body = opts.body;

        this.element = $('#' + this.id);
        this.detached = false;

        this.parent = opts.parent || null;
        this.child = null;
        this.subtasks = [];
    }

    /**
     * @name Task#collapse
     * @private
     *
     * @description
     * Collapses a task, keeping the header visible.
     */
    Task.prototype.collapse = function() {
        $('#' + this.body.id()).slideUp(200);
    };

    /**
     * @name Task#detach
     * @private
     *
     * @description
     * Detaches the task from the current visible branch, effectively hiding the task.
     */
    Task.prototype.detach = function() {
        var node = this;
        var count = 0;
        var task = this;

        function handler() {
            if (--count === 0) {
                console.log('detach');
                node.element.detach();
                node.detached = true;
            }
        }
        while (task !== null) {
            count += 2;
            $('#' + task.panel.id()).slideUp(200, handler);
            $('#' + task.id).fadeOut(200, handler);
            task = task.child;
        }
    };

    /**
     * @name Task#expand
     * @private
     *
     * @description
     * Expands a visible task, making the body visible.
     */
    Task.prototype.expand = function(task) {
        $('#' + this.body.id()).slideDown(200);
    }

    /** 
     * @name Task#hasSubtask
     * @private
     *
     * @description
     * Determines whether or not this task contains a given subtask.
     */
    Task.prototype.hasSubtask = function(task) {
        for (var i = 0; i < this.subtasks.length; ++i) {
            if (this.subtasks === task) {
                return true;
            }
        }
        return false;
    };

    /** 
     * @name Task#isActive
     * @private
     *
     * @description
     * Indicates whether or not this is the currently active task in the workspace. Note that
     * there can only be one active task at a time.
     */
    Task.prototype.isActive = function() {
        return this.workspace.active === this;
    };

    /** 
     * @name Task#isVisible
     * @private
     *
     * @description
     * Indicates whether or not this task is currently visible. A visible task is either the
     * currently active task on the stack, or a parent of the active task (i.e., it is visible
     * on the stack).
     */
    Task.prototype.isVisible = function() {
        var task = this.workspace.root;
        while (task !== this && task.child !== null) {
            task = task.child;
        }
        return task === this;
    };

    /** 
     * @name Task#push
     * @private
     *
     * @description
     * Pushes a task onto the stack as a child of this task.
     */
    Task.prototype.push = function(name, args) {
        return this.workspace.push(this, name, args);
    };



    // /**
    //  * Deactivates a task, causing
    //  */
    // Task.prototype.deactivate = function() {


    //     while (task !== null) {
    //         $('#' + task.id).fadeOut(200, function() {
    //             // Animation complete.
    //         });
    //         task = task.active;
    //     }
    // }


    // /** Pops this task off the stack. */
    // Task.prototype.pop = function() {

    // };



    // /** Shows a currently hidden task. */
    // Task.prototype.show = function() {
    //     var task = this;
    //     while (task !== null) {
    //         console.log("SHOW");
    //         $('#' + task.panel.id()).slideDown(200);
    //         $('#' + task.body.id()).slideDown(200);
    //         $('#' + task.id).fadeIn(200);
    //         task = task.activeChild;
    //     }
    // };


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Public definitions


    alia.defineControl = function(opts, ctor) {
        var name = 'do' + opts.name.charAt(0).toUpperCase() + opts.name.slice(1);
        alia[name] = function(parent, options) {
            // // ------------------------------------------------------------------
            // // Kyle modified this
            // var context = new Context(parent.id, undefined, parent.child_ids);
            // Object.defineProperty(context, 'type', {
            //     value: opts.name,
            //     writable: false,
            //     enumerable: true,
            //     configurable: false
            // });
            // // End Kyle's changes
            // // ------------------------------------------------------------------
            var component = ctor.call(parent, options);
            return component;
        }
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
            }(); // <- Return with context, not component

            // // ------------------------------------------------------------------
            // // Kyle modified this
            // var context = new Context(parent.id, undefined, parent.child_ids);
            // Object.defineProperty(context, 'type', {
            //     value: opts.name,
            //     writable: false,
            //     enumerable: true,
            //     configurable: false
            // });
            // // End Kyle's changes
            // // ------------------------------------------------------------------
            // ctor.call(context, parent, options);
            // return callback(context);
        }
    };

    alia.defineModule = function(name) {

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
        // console.log("alia.resolve:", dependencies, args, data);
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
        var service = services[options.name] = {
            dependencies: options.dependencies,
            constructor: constructor,
            accessor: alia.resolve(options.dependencies).then(function(deps) {
                return constructor.apply(null, deps);
            })
        };



        // service.accessor = alia.deferred(function(resolve, reject) {
        //     alia.resolve(service.dependencies).onResolve(function(args) {
        //         console.log("resolved", args);

        //         // console.log(args);
        //         var obj = constructor.apply(null, args);
        //         if (alia.isAccessor(obj)) {
        //             console.log("isAccessor");
        //             obj.onResolve(function(singleton) {
        //                 console.log("done", singleton);
        //                 resolve(singleton);
        //                 //service.observable.set(singleton);
        //             });
        //         } else {
        //             resolve(obj);
        //             // service.observable.set(obj);
        //         }
        //     });
        // });
    };



    alia.defineView = function(opts, ctor) {
        var $route = providers['$route'];
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



    alia.defineWidget = function(callback) {

    };

    alia.defineWorkspace = function(opts, ctor) {
        alia.defineView({
            path: opts.path,
            dependencies: opts.dependencies,
            workspace: true
        }, ctor);
    };



    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Public state

    // alia.initState = function(initValue) {
    //     if (alia.isObserver(initValue)) {
    //         return initValue;
    //     } else if (alia.isObservable(initValue)) {
    //         var model = new Bacon.Model();
    //         model.addSource(initValue);
    //         return model;
    //     } else {
    //         return new Bacon.Model(initValue);
    //     }
    // };

    // alia.prop = function(obj, prop) {
    //     if (obj instanceof Bacon.Property) {
    //         var prop_lens = new Bacon.Lens(prop);
    //         return obj.lens(prop_lens);
    //     } else if (obj.hasOwnProperty(prop)) {
    //         return new Bacon.Model(obj[prop]);
    //     } else {
    //         return new Bacon.Model(null);
    //     }
    // };


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Utility functions

    alia.int = function(str) {
        return parseInt(str, 10);
    }


    /**
     * @name alia.lowercase
     * @module ng
     * @function
     *
     * @description Converts the specified string to lowercase.
     * @param {string} string String to be converted to lowercase.
     * @returns {string} Lowercased string.
     */
    alia.lowercase = function(string) {
        return alia.isString(string) ? string.toLowerCase() : string;
    }

    alia.noop = function() {}



}($, Bacon, window.alia = window.alia || {}));;'use strict';

(function(Bacon, alia, undefined) {

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Schedule

	var schedule;
	var _MutationObserver;
	if (typeof process === "object" && typeof process.version === "string") {
		schedule = function Promise$_Scheduler(fn) {
			process.nextTick(fn);
		};
	} else if ((typeof MutationObserver !== "undefined" &&
			(_MutationObserver = MutationObserver)) ||
		(typeof WebKitMutationObserver !== "undefined" &&
			(_MutationObserver = WebKitMutationObserver))) {
		schedule = (function() {
			var div = document.createElement("div");
			var queuedFn = void 0;
			var observer = new _MutationObserver(
				function Promise$_Scheduler() {
					var fn = queuedFn;
					queuedFn = void 0;
					fn();
				}
			);
			observer.observe(div, {
				attributes: true
			});
			return function Promise$_Scheduler(fn) {
				queuedFn = fn;
				div.setAttribute("class", "foo");
			};

		})();
	} else if (typeof setTimeout !== "undefined") {
		schedule = function Promise$_Scheduler(fn) {
			setTimeout(fn, 0);
		};
	} else throw new Error("no async scheduler available");
	//module.exports = schedule;

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Queue

	function arrayCopy(src, srcIndex, dst, dstIndex, len) {
		for (var j = 0; j < len; ++j) {
			dst[j + dstIndex] = src[j + srcIndex];
		}
	}

	function Queue(capacity) {
		this._capacity = capacity;
		this._length = 0;
		this._front = 0;
		this._makeCapacity();
	}

	Queue.prototype._willBeOverCapacity =
		function Queue$_willBeOverCapacity(size) {
			return this._capacity < size;
	};

	Queue.prototype._pushOne = function Queue$_pushOne(arg) {
		var length = this.length();
		this._checkCapacity(length + 1);
		var i = (this._front + length) & (this._capacity - 1);
		this[i] = arg;
		this._length = length + 1;
	};

	Queue.prototype.push = function Queue$push(fn, receiver, arg) {
		var length = this.length() + 3;
		if (this._willBeOverCapacity(length)) {
			this._pushOne(fn);
			this._pushOne(receiver);
			this._pushOne(arg);
			return;
		}
		var j = this._front + length - 3;
		this._checkCapacity(length);
		var wrapMask = this._capacity - 1;
		this[(j + 0) & wrapMask] = fn;
		this[(j + 1) & wrapMask] = receiver;
		this[(j + 2) & wrapMask] = arg;
		this._length = length;
	};

	Queue.prototype.shift = function Queue$shift() {
		var front = this._front,
			ret = this[front];

		this[front] = void 0;
		this._front = (front + 1) & (this._capacity - 1);
		this._length--;
		return ret;
	};

	Queue.prototype.length = function Queue$length() {
		return this._length;
	};

	Queue.prototype._makeCapacity = function Queue$_makeCapacity() {
		var len = this._capacity;
		for (var i = 0; i < len; ++i) {
			this[i] = void 0;
		}
	};

	Queue.prototype._checkCapacity = function Queue$_checkCapacity(size) {
		if (this._capacity < size) {
			this._resizeTo(this._capacity << 3);
		}
	};

	Queue.prototype._resizeTo = function Queue$_resizeTo(capacity) {
		var oldFront = this._front;
		var oldCapacity = this._capacity;
		var oldQueue = new Array(oldCapacity);
		var length = this.length();

		arrayCopy(this, 0, oldQueue, 0, oldCapacity);
		this._capacity = capacity;
		this._makeCapacity();
		this._front = 0;
		if (oldFront + length <= oldCapacity) {
			arrayCopy(oldQueue, oldFront, this, 0, length);
		} else {
			var lengthBeforeWrapping =
				length - ((oldFront + length) & (oldCapacity - 1));

			arrayCopy(oldQueue, oldFront, this, 0, lengthBeforeWrapping);
			arrayCopy(oldQueue, 0, this, lengthBeforeWrapping,
				length - lengthBeforeWrapping);
		}
	};

	//module.exports = Queue;

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Utils

	var errorObj = {
		e: {}
	};

	function tryCatch1(fn, receiver, arg) {
		try {
			return fn.call(receiver, arg);
		} catch (e) {
			errorObj.e = e;
			return errorObj;
		}
	}

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Async

	var _process = typeof process !== "undefined" ? process : void 0;

	function Async() {
		this._isTickUsed = false;
		this._schedule = schedule;
		this._length = 0;
		this._lateBuffer = new Queue(16);
		this._functionBuffer = new Queue(65536);
		var self = this;
		this.consumeFunctionBuffer = function Async$consumeFunctionBuffer() {
			self._consumeFunctionBuffer();
		};
	}

	Async.prototype.haveItemsQueued = function Async$haveItemsQueued() {
		return this._length > 0;
	};

	Async.prototype.invokeLater = function Async$invokeLater(fn, receiver, arg) {
		if (_process !== void 0 &&
			_process.domain != null &&
			!fn.domain) {
			fn = _process.domain.bind(fn);
		}
		this._lateBuffer.push(fn, receiver, arg);
		this._queueTick();
	};

	Async.prototype.invoke = function Async$invoke(fn, receiver, arg) {
		if (_process !== void 0 && _process.domain != null && !fn.domain) {
			fn = _process.domain.bind(fn);
		}
		var functionBuffer = this._functionBuffer;
		functionBuffer.push(fn, receiver, arg);
		this._length = functionBuffer.length();
		this._queueTick();
	};

	Async.prototype._consumeFunctionBuffer = function Async$_consumeFunctionBuffer() {
		var functionBuffer = this._functionBuffer;
		while (functionBuffer.length() > 0) {
			var fn = functionBuffer.shift();
			var receiver = functionBuffer.shift();
			var arg = functionBuffer.shift();
			fn.call(receiver, arg);
		}
		this._reset();
		this._consumeLateBuffer();
	};

	Async.prototype._consumeLateBuffer = function Async$_consumeLateBuffer() {
		var buffer = this._lateBuffer;
		while (buffer.length() > 0) {
			var fn = buffer.shift();
			var receiver = buffer.shift();
			var arg = buffer.shift();
			var res = tryCatch1(fn, receiver, arg);
			if (res === errorObj) {
				this._queueTick();
				if (fn.domain != null) {
					fn.domain.emit("error", res.e);
				} else {
					throw res.e;
				}
			}
		}
	};

	Async.prototype._queueTick = function Async$_queue() {
		if (!this._isTickUsed) {
			this._schedule(this.consumeFunctionBuffer);
			this._isTickUsed = true;
		}
	};

	Async.prototype._reset = function Async$_reset() {
		this._isTickUsed = false;
		this._length = 0;
	};

	var async = new Async();


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Unresolved

	function Unresolved() {}

	Unresolved.is = function(value) {
		return value instanceof Unresolved;
	}

	Unresolved.not = function(value) {
		return !(value instanceof Unresolved);
	}

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Accessor

	function Accessor(resolved, value, finalized) {
		this._resolved = (resolved === true);
		this._value = value;
		this._failed = false;
		this._errors = void 0;

		this._resolveHandlers = void 0; // 1, value 16
		this._unresolveHandlers = void 0; // 2
		this._errorHandlers = void 0; // 4, error 32

		this._broadcastPending = false;
		this._broadcastGroup = 0; // null
		this._broadcastHandlers = void 0; // 8

		this._finalized = (finalized === true);
	};

	// --------------------------------------------------
	// Private methods

	Accessor.prototype._broadcast = function() {
		var data, handlers;
		if (this._broadcastGroup & 16) {
			data = this._value;
		} else if (this._broadcastGroup & 32) {
			data = this._errors;
		}
		if (this._broadcastGroup & 1 && this._resolveHandlers) {
			for (var i = 0; i < this._resolveHandlers.length; ++i) {
				this._resolveHandlers[i].call(void 0, data);
			}
		}
		if (this._broadcastGroup & 2 && this._unresolveHandlers) {
			for (var i = 0; i < this._unresolveHandlers.length; ++i) {
				this._unresolveHandlers[i].call(void 0, data);
			}
		}
		if (this._broadcastGroup & 4 && this._errorHandlers) {
			for (var i = 0; i < this._errorHandlers.length; ++i) {
				this._errorHandlers[i].call(void 0, data);
			}
		}
		if (this._broadcastGroup & 8) {
			for (var i = 0; i < this._broadcastHandlers.length; ++i) {
				this._broadcastHandlers[i].call(void 0, data);
			}
		}
		if (this._finalized) {
			this._resolveHandlers = void 0;
			this._unresolveHandlers = void 0;
			this._errorHandlers = void 0;
		}
		this._broadcastPending = false;
		this._broadcastGroup = 0;
		this._broadcastHandlers = void 0;
	};

	Accessor.prototype._finalize = function() {
		this._finalized = true;
		if (!this._broadcastPending) {
			this._resolveHandlers = void 0;
			this._unresolveHandlers = void 0;
			this._errorHandlers = void 0;
			this._broadcastGroup = 0;
			this._broadcastHandlers = void 0;
		}
	};

	Accessor.prototype._resolve = function(value, handler) {
		if (typeof handler !== 'function') {
			if (this._resolved && this._value === value) {
				return;
			}
			this._resolved = true;
			this._value = value;
			this._failed = false;
			this._errors = void 0;
			this._broadcastGroup = 17;
			this._broadcastHandlers = void 0;
		} else if (this._broadcastGroup === 0) {
			this._broadcastGroup = 24;
			this._broadcastHandlers = [handler];
		} else if (this._broadcastGroup === 24) {
			this._broadcastHandlers.push(handler);
		} else if (!(this._broadcastGroup & 1)) {
			throw new Error('Unable to prime resolve to group ' + this._broadcastGroup);
		}
		if (!this._broadcastPending) {
			this._broadcastPending = true;
			async.invoke(this._broadcast, this);
		}
	};

	Accessor.prototype._throw = function(error, handler) {
		var unresolving = this._resolved;
		if (!handler) {
			this._resolved = false;
			this._value = void 0;
			this._failed = true;
			if (this._errors === void 0) {
				this._errors = [];
			}
			this._errors.push(error);
			this._broadcastGroup = (unresolving) ? 38 : 36;
			this._broadcastHandlers = void 0;
		} else if (unresolving) {
			throw new Error('Unable to initialize throw with handler');
		} else if (this._broadcastGroup === 0) {
			this._broadcastGroup = 40;
			this._broadcastHandlers = [handler];
		} else if (this._broadcastGroup === 40) {
			this._broadcastHandlers.push(handler);
		} else if (!(this._broadcastGroup & 4)) {
			throw new Error('Unable to prime throw to group ' + this._broadcastGroup);
		}
		if (!this._broadcastPending) {
			this._broadcastPending = true;
			async.invoke(this._broadcast, this);
		}
	};

	Accessor.prototype._unresolve = function() {
		if (!this._resolved) {
			return;
		}
		this._resolved = false;
		this._value = void 0;
		this._failed = false;
		this._errors = void 0;
		this._broadcastGroup = 2;
		this._broadcastHandlers = void 0;
		if (!this._broadcastPending) {
			this._broadcastPending = true;
			async.invoke(this._broadcast, this);
		}
	};

	// --------------------------------------------------
	// Public methods

	Accessor.prototype.get = function() {
		return this._resolved ? _.clone(this._value) : void 0;
	};

	Accessor.prototype.isGettable = function() {
		return true;
	};

	Accessor.prototype.isSettable = function() {
		return typeof this.set === 'function';
	};

	Accessor.prototype.observe = function(resolveHandler, unresolveHandler, errorHandler) {
		if (typeof resolveHandler === 'function') {
			if (!this._resolveHandlers) {
				this._resolveHandlers = [];
			}
			this._resolveHandlers.push(resolveHandler);
			if (this._resolved) {
				this._resolve(this._value, resolveHandler);
			}
		}
		if (typeof unresolveHandler === 'function') {
			if (!this._unresolveHandlers) {
				this._unresolveHandlers = [];
			}
			this._unresolveHandlers.push(unresolveHandler);
		}
		if (typeof errorHandler === 'function') {
			if (!this._errorHandlers) {
				this._errorHandlers = [];
			}
			this._errorHandlers.push(errorHandler);
			if (this._failed) {
				this._throw(this._errors, errorHandler);
			}
		}
		return this;
	};

	Accessor.prototype.onResolve = function(handler) {
		return this.observe(handler, null, null);
	};

	Accessor.prototype.onUnresolve = function(handler) {
		return this.observe(null, handler, null);
	};

	Accessor.prototype.onError = function(handler) {
		return this.observe(null, null, handler);
	};

	// --------------------------------------------------
	// Reactive property methods

	Accessor.prototype.isObject = function() {
		var accessor = new ValueAccessor();
		this.observe(function(value) {
			accessor.set(typeof value === 'object');
		}, function() {
			accessor.set(false);
		}, function(err) {
			accessor._throw(err);
		});
		return accessor;
	};

	Accessor.prototype.isResolved = function() {
		var accessor = (new ValueAccessor()).startWith(this._resolved);
		this.observe(function(value) {
			accessor.set(true);
		}, function() {
			accessor.set(false);
		}, function(err) {
			accessor._throw(err);
		});
		return accessor;
	};

	Accessor.prototype.isUndefined = function() {
		var accessor = new ValueAccessor();
		this.observe(function(value) {
			accessor.set(value === void 0);
		}, function() {
			accessor.set(true);
		}, function(err) {
			accessor._throw(err);
		});
		return accessor;
	};

	// --------------------------------------------------
	// Lifting methods

	Accessor.prototype.at = function(index) {
		return new PropertyAccessor(this, '.' + index);
	};

	Accessor.prototype.delay = function(ms) {
		return new DelayAccessor(this, ms);
	};

	Accessor.prototype.not = function() {
		var accessor = new ValueAccessor();
		this.observe(function(value) {
			accessor.set(!value);
		}, function() {
			accessor._unresolve();
		}, function(err) {
			accessor._throw(err);
		});
		return accessor;
	};

	Accessor.prototype.property = function(property) {
		return new PropertyAccessor(this, property);
	};

	Accessor.prototype.startWith = function(value) {
		if (!this._resolved) {
			this._resolve(value);
		}
		return this;
	};

	Accessor.prototype.then = function(callback) {
		return new FutureAccessor([this], callback);
	};



	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Progressable

	// var progressable = {
	// 	_progress: void 0,
	// 	_progressHandlers = void 0
	// };

	// var asProgressable = (function() {
	// 	return function () {
	// 		this._progress = void 0;
	// 		this._progressHandlers = void 0;
	// 	};
	// })();

	// Accessor.prototype.onProgress = function(callback) {
	// 	return this.observe(null, null, callback);
	// };



	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Constant accessor

	function ConstantAccessor(resolved, value) {
		Accessor.call(this, resolved, value, true);
	}

	ConstantAccessor.prototype = _.create(Accessor.prototype);


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Value accessor

	function ValueAccessor(resolved, value) {
		Accessor.call(this, resolved, value);
	}

	ValueAccessor.prototype = _.create(Accessor.prototype);

	ValueAccessor.prototype.set = function(value) {
		this._resolve(value);
	};


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Property accessor

	function PropertyAccessor(accessor, property) {
		Accessor.call(this);
		this._accessor = accessor;
		this._property = property;
		this._path = property.split('.');

		var self = this;
		accessor.observe(function(value) {
			for (var i = 1; i < self._path.length; ++i) {
				if (value && value.hasOwnProperty(self._path[i])) {
					value = value[self._path[i]];
				} else {
					return self._unresolve();
				}
			}
			self._resolve(value);
		}, function() {
			self._unresolve();
		}, function(err) {
			self._throw(err);
		});
	}

	PropertyAccessor.prototype = _.create(Accessor.prototype);

	PropertyAccessor.prototype.set = function(value) {
		var obj = this._accessor.get() || {};
		var iter = obj;
		var end = this._path.length - 1;
		for (var i = 1; i < end; ++i) {
			if (!iter.hasOwnProperty(this._path[i])) {
				iter[this._path[i]] = {};
			}
			iter = iter[this._path[i]] || {};
		}
		iter[this._path[end]] = value;
		this._accessor.set(obj);
	};


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Array accessor

	function ArrayAccessor(accessor) {
		Accessor.call(this);
		this._accessor = accessor;
		this._items = void 0;
		this._itemsResolved = void 0;

		var self = this;
		accessor.observe(function(items) {
			self._items = [];
			self._itemsResolved = [];
			if (items.length === 0) {
				self._resolve([]);
			} else {
				for (var i = 0; i < items.length; ++i) {
					self._items.push(items[i]);
					self._itemsResolved.push(false);
					var item = items[i];
					if (!(item instanceof Accessor)) {
						self._items[i] = item = alia.constant(item);
					}
					item.observe(function(index) {
						return function(value) {
							self._itemsResolved[index] = true;
							if (!_.every(self._itemsResolved)) {
								return;
							}
							var result = [];
							for (var j = 0; j < self._items.length; ++j) {
								result.push(self._items[j]._value);
							}
							self._resolve(result);
						}
					}(i), function(index) {
						return function() {
							self._itemsResolved[index] = false;
							self._unresolve();
						}
					}(i), function(err) {
						self._throw(err);
					});
				}
			}
		}, function() {
			self._items = void 0;
			self._itemsResolved = void 0;
			self._unresolve();
		}, function(err) {
			self._throw(err);
		});
	}

	ArrayAccessor.prototype = _.create(Accessor.prototype);


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Object accessor

	function ObjectAccessor(object) {
		Accessor.call(this);
		this._object = {};

		var count = 0;
		var self = this;
		for (var p in object) {
			if (!(object[p] instanceof Accessor)) {
				self._object[p] = object[p];
			} else {
				count++;
				object[p].observe(function(key) {
					return function(value) {
						self._object[key] = value;
						if (!_.every(self._object, Unresolved.not)) {
							return;
						}
						self._resolve(_.clone(self._object));
					}
				}(p), function(key) {
					return function() {
						self._object[key] = new Unresolved();
						self._unresolve();
					}
				}(p), function(err) {
					self._throw(err);
				});
			}
		}
		if (count === 0) {
			self._resolve(this._object, true);
		}
	}

	ObjectAccessor.prototype = _.create(Accessor.prototype);


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Join accessor

	function JoinAccessor() {
		Accessor.call(this);
		this._fcn = arguments[arguments.length - 1];
		this._accessors = [];
		this._accessorsResolved = [];
		var self = this;
		for (var i = 0; i < arguments.length - 1; ++i) {
			self._accessors.push(arguments[i]);
			self._accessorsResolved.push(false);
			var item = arguments[i];
			if (!(item instanceof Accessor)) {
				self._accessors[i] = item = alia.constant(item);
			}
			item.observe(function(index) {
				return function(value) {
					self._accessorsResolved[index] = true;
					if (!_.every(self._accessorsResolved)) {
						return;
					}
					var args = [];
					for (var j = 0; j < self._accessors.length; ++j) {
						args.push(self._accessors[j]._value);
					}
					var result = self._fcn.apply(undefined, args);
					if (result instanceof Accessor) {
						result.observe(function(value) {
							self._resolve(value);
						}, function() {
							self._unresolve();
						}, function(err) {
							self._throw(err);
						});
					} else {
						self._resolve(result);
					}
				}
			}(i), function(index) {
				return function() {
					self._accessorsResolved[index] = false;
					self._unresolve();
				}
			}(i), function(err) {
				self._throw(err);
			});
		}
	}

	JoinAccessor.prototype = _.create(Accessor.prototype);


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Future accessor

	function FutureAccessor(args, fcn) {
		Accessor.call(this);
		this._fcn = fcn;
		this._args = alia.all(args);

		var self = this;
		this._args.observe(function(value) {
			var result = self._fcn.apply(undefined, value);
			if (result instanceof Accessor) {
				result.observe(function(value) {
					self._resolve(value);
				}, function() {
					self._unresolve();
				}, function(err) {
					self._throw(err);
				});
			} else {
				self._resolve(result);
			}
		}, function() {
			self._unresolve();
		}, function(err) {
			self._throw(err);
		});
	}

	FutureAccessor.prototype = _.create(Accessor.prototype);


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Promise accessor

	function PromiseAccessor(promise) {
		Accessor.call(this);

		var self = this;
		promise.then(function(value) {
			self._resolve(value, true);
		}, function(err) {
			self._throw(err);
		});
	}

	PromiseAccessor.prototype = _.create(Accessor.prototype);


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Delay accessor

	function DelayAccessor(accessor, ms) {
		Accessor.call(this);
		this._accessor = accessor;
		this._delay = ms;
		this._timeout = null;

		var self = this;
		accessor.observe(function(value) {
			if (self._timeout) {
				clearTimeout(self._timeout);
			}
			self._timeout = setTimeout(function() {
				self._resolve(value);
				self._timeout = null;
			}, self._delay);
		}, function() {
			self._unresolve();
		}, function(err) {
			self._throw(err);
		});
	}

	DelayAccessor.prototype = _.create(Accessor.prototype);



	// // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// // Future accessor

	// function MapAccessor(accessor, map) {
	// 	Accessor.call(this);
	// 	this._accessor = accessor;
	// 	this._items = null;
	// 	if (typeof map === 'function') {
	// 		this._map = map;
	// 	} else if (typeof map === 'string') {
	// 		this._map = function(item) {
	// 			return new PropertyAccessor(item, map);
	// 		}
	// 	} else {
	// 		this._map = _.identity;
	// 	}

	// 	var self = this;
	// 	accessor.onValue(function(value) {
	// 		var items = [];
	// 		var results = [];
	// 		for (var i = 0; i < value.length; ++i) {
	// 			items[i] = new PropertyAccessor(accessor, '.' + i);
	// 			results[i] = self._map(items[i]);
	// 			console.log("r" + i, results[i]);
	// 			results[i].onValue(function() {
	// 				console.log("inside");
	// 				for (var j = 0; j < results.length; ++j) {
	// 					if (!results[j]._resolved) {
	// 						return;
	// 					}
	// 				}
	// 				var values = [];
	// 				for (var j = 0; j < results.length; ++j) {
	// 					values.push(results[j]._value);
	// 				}
	// 				__set.call(self, values);
	// 			});
	// 		}
	// 	});
	// }

	// MapAccessor.prototype = _.create(Accessor.prototype);



	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Public functions

	alia.isAccessor = function(value) {
		return value instanceof Accessor;
	};

	/**
	 * Given an array, or an accessor to an array, which contains accessors (or a
	 * mix of accessors and values) return an accessor that represents the value when all items
	 * in the array are resolved. The accessors's resolved value is an array with resolved
	 * values at respective positions to the original array.
	 */
	alia.all = function(array) {
		if (!alia.isAccessor(array)) {
			array = alia.constant(array);
		}
		return new ArrayAccessor(array);
	};

	/**
	 * Cast the given value to an Accessor. If value is already an Accessor, it is returned
	 * as is. If value is not an Accessor, a resolved Accessor is returned with
	 * value as its resolved value.
	 */
	alia.cast = function(value) {
		return (value instanceof Accessor) ? value : new ValueAccessor(true, value);
	};

	alia.constant = function(value) {
		if (arguments.length === 0) {
			return new ConstantAccessor();
		}
		return new ConstantAccessor(true, value);
	};

	alia.deferred = function(resolver) {
		return new PromiseAccessor(new Promise(resolver));
	};

	alia.future = function(fcn) {
		var args = [];
		for (var i = 1; i < arguments.length; ++i) {
			args.push(arguments[i]);
		}
		return new FutureAccessor(fcn, args);
	};

	alia.join = function() {
		var obj = Object.create(JoinAccessor.prototype);
		JoinAccessor.apply(obj, arguments);
		return obj;
	};

	alia.state = function(value) {
		if (arguments.length === 0) {
			return new ValueAccessor();
		} else if (value instanceof Accessor) {
			var accessor = new ValueAccessor();
			value.observe(function(x) {
				accessor.set(x);
			}, function() {
				accessor._unresolve();
			}, function(err) {
				accessor._throw(err);
			});
			return accessor;
		} else {
			return new ValueAccessor(true, value);
		}
	};

	alia.promise = function(promise) {
		return new PromiseAccessor(promise);
	};

	/**
	 * Like alia.all() but for object properties instead of array items. Returns an
	 * accessor that is resolved when all the properties of the object are resolved.
	 * The accessors's resolved value is an object with resolved values at respective keys
	 * to the original object. If any accessor in the object has an error, the returned
	 * accessor is rejected with the rejection reason.
	 */
	alia.props = function(object) {
		return new ObjectAccessor(object || {});
	};


	// This really should be removed
	alia.getString = function(value) {
		if (value instanceof Bacon.Property) {
			return value.get();
		} else if (typeof value === 'string') {
			return value;
		} else {
			return undefined;
		}
	};

}(Bacon, window.alia = window.alia || {}));;'use strict';

(function(alia, undefined) {

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
	function resolve(url, base) {
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

}(window.alia = window.alia || {}));;'use strict';

(function(Bacon, alia, undefined) {



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
    }

    alia.isArrayLike = function(obj) {
        if (obj == null || isWindow(obj)) {
            return false;
        }

        var length = obj.length;

        if (obj.nodeType === 1 && length) {
            return true;
        }

        return alia.isString(obj) || alia.isArray(obj) || length === 0 ||
            typeof length === 'number' && length > 0 && (length - 1) in obj;
    }

    /**
     * @ngdoc function
     * @name angular.isDefined
     * @module ng
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
    }

    alia.isNull = function(value) {
        return value === null;
    }

    alia.isNotNull = function(value) {
        return value !== null;
    }

    /**
     * @name alia.isObject
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
        return value != null && typeof value === 'object';
    }

    alia.isProperty = function(value) {
        return value instanceof Bacon.Property;
    };

    // alia.isObservable = function(value) {
    //     return value instanceof Bacon.Property || value instanceof Bacon.EventStream;
    // };

    // alia.isObserver = function(value) {
    //     return value instanceof Bacon.Property && typeof value.set === 'function';
    // };

    alia.isString = function(value) {
        return typeof value === 'string';
    }

    alia.isEmptyString = function(value) {
        return typeof value !== 'string' || value.length === 0;
    };

    alia.isNotEmptyString = function(value) {
        return typeof value === 'string' && value.length > 0;
    };

    /**
     * @name alia.isUndefined
     * @module ng
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
    }

    alia.isNotUndefined = function(value) {
        return typeof value !== 'undefined';
    }

    alia.isWindow = function(obj) {
        return obj && obj.document && obj.location && obj.alert && obj.setInterval;
    }


}(Bacon, window.alia = window.alia || {}));;'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Alert

alia.defineControl({
    name: 'alert'
}, function () {
    var alertTypes = {
        'success': 'alert-success',
        'info': 'alert-info',
        'warning': 'alert-warning',
        'danger': 'alert-danger'
    };

    return function (options) {

        // Determine class
        var cls = ['alia-alert'];
        if (typeof options.type === 'string' && alertTypes.hasOwnProperty(options.type)) {
            cls.push(alertTypes[options.type]);
        }

        var elm = alia.alerts.append([
            '<div class=":class" alia-context>',
            '  <span alia-context="content"></span>',
            '  <button alia-context="close" type="button" class="close">&times;</button>',
            '</div>'].join(''), {
                class: cls.join(' ')
            });

        if (typeof options.autohide === 'number') {
            setTimeout(function() {
                $('#' + elm.id()).fadeOut(500, function() {
                    $(this).remove();
                });
            }.bind(this), options.autohide);
        }

        if (alia.isAccessor(options.text)) {
            options.text.onResolve(function (value) {
                elm.khtml('content', value);
            });
        } else {
            elm.khtml('content', options.text);
        }

        $('#' + elm.id('close')).click(function (e) {
            $('#' + elm.id()).remove();
        });

        return elm;
    }
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Button

alia.defineControl({
    name: 'button',
}, function() {

    var styles = {
        'default': 'btn-default',
        'primary': 'btn-primary',
        'success': 'btn-success',
        'info': 'btn-info',
        'warning': 'btn-warning',
        'danger': 'btn-danger',
        'link': 'btn-link',
    }

    var sizes = {
        'large': 'btn-lg',
        'small': 'btn-sm',
        'xsmall': 'btn-xs'
    };

    var loadingStyles = {
        'none': null,
        'expand-right': 'expand-right'
    }

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            disabled: false,
            loadingStyle: 'none',
            progress: null,
            visible: true
        }, {
            loadingStyle: loadingStyles
        });

        // Determine class
        var cls = ['btn'];
        if (typeof options.close === 'boolean' && options.close) {
            cls[0] = 'close';
        } else {
            if (typeof options.style === 'string' && styles.hasOwnProperty(options.style)) {
                cls.push(styles[options.style]);
            } else {
                cls.push(styles['default']);
            }
            if (typeof options.size === 'string' && sizes.hasOwnProperty(options.size)) {
                cls.push(sizes[options.size]);
            }
        }

        // Handle plain vs ladda button styles
        var elm;
        if (alia.isAccessor(options.loading)) {

            // Append button component
            var html =
                '<button alia-context type="button" class=":class ladda-button" data-style=":loadingStyle">' +
                '  <span alia-context="label" class="ladda-label"></span>' +
                '</button>';
            // var html = '<button alia-context type="button" class=":class"></button>';
            elm = this.append(html, {
                class: cls.join(' '),
                loadingStyle: loadingStyles[options.loadingStyle]
            });

            // Bind properties
            var j = $('#' + elm.id());
            var jlabel = $('#' + elm.id('label'));
            var jladda = Ladda.create(j[0]);
            elm.bindHtml('label', 'text', options.text);
            elm.bindDisabled(options.disabled);
            elm.defineProperty('loading', options.loading).onResolve(function(value) {
                if (value !== jladda.isLoading()) {
                    jladda.toggle();
                }
            });

        } else {

            // Append button component
            var html = '<button alia-context type="button" class=":class"></button>';
            elm = this.append(html, {
                class: cls.join(' ')
            });

            // Bind properties
            var j = $('#' + elm.id());
            elm.bindHtml('text', options.text);
            elm.bindDisabled(options.disabled);
        }

        // btn.bindEnabled(enabled);
        elm.bindVisible(options.visible);

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Button Addon

alia.defineLayout({
    name: 'buttonAddon'
}, function () {
    return function (options) {
        var elm = this.append('<span alia-context class="input-group-btn"></span>');

        return elm;
    }
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Button Group

alia.defineLayout({
    name: 'buttonGroup',
}, function() {

    var sizes = {
        'large': 'btn-group-lg',
        'small': 'btn-group-sm',
        'xsmall': 'btn-group-xs'
    };

    return function(options) {

        // Determine class
        var cls = ['btn-group'];
        if (options.vertical == true) {
            cls[0] += '-vertical';
        }
        if (typeof options.size === 'string' && sizes.hasOwnProperty(options.size)) {
            cls.push(sizes[options.size]);
        }
        if (typeof options.justified === 'boolean' && options.justified) {
            cls.push('btn-group-justified');
        }

        // Append button group component
        return this.append('<div alia-context class=":class"></div>', {
            class: cls.join(' ')
        });
    };
}());

alia.defineControl({
    name: 'buttonRadioGroup'
}, function() {

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            currentIndex: 0
        });

        var buttons = [];
        var activeIndex = -1;

        var set = function(index) {
            return function() {
                currentIndex.set(index);
            };
        }

        var elm = alia.layoutButtonGroup(this, {}, function(ctx) {
            for (var i = 0; i < options.options.length; ++i) {
                var btn = alia.doButton(ctx, {
                    text: options.options[i]
                }).onClick(set(i));
                buttons.push({
                    text: options.options[i],
                    btn: btn,
                    j: $('#' + btn.id())
                });
            }
        });

        var currentIndex = elm.defineProperty('currentIndex', options.currentIndex);
        currentIndex.onResolve(function(value) {
            if (activeIndex !== value) {
                if (activeIndex !== null && activeIndex > -1) {
                    var prev = buttons[activeIndex];
                    prev.j.removeClass('btn-info');
                    prev.j.addClass('btn-default');
                }
                if (value !== null && value > -1) {
                    var next = buttons[value];
                    next.j.removeClass('btn-default');
                    next.j.addClass('btn-info');
                }
                activeIndex = value;
            }
        })

        // Return element
        return elm;
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Carousel

alia.defineLayout({
    name: 'carousel',
}, function() {

    return function(options) {

        var html = [
            '<div alia-context class="carousel slide" data-ride="carousel">',
            '  <ol alia-context="indicators" class="carousel-indicators"></ol>',
            '  <div alia-context="items" class="carousel-inner"></div>',
            '</div>'
        ]
        var elm = this.append(html.join(''));

        if (typeof options.auto === 'number') {
            elm.attr('data-interval', options.auto);
        }

        var navigation = [
            '<a class="left carousel-control" data-target=":target" data-slide="prev">',
            '  <span class="glyphicon glyphicon-chevron-left"></span>',
            '</a>',
            '<a class="right carousel-control" data-target=":target" data-slide="next">',
            '  <span class="glyphicon glyphicon-chevron-right"></span>',
            '</a>'
        ];

        var nav = elm.append(navigation.join(''), {
            target: '#' + elm.ids['']
        });

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Carousel items

alia.defineLayout({
    name: 'carouselItem',
}, function() {

    return function(options) {

        // Determine class
        var cls = ['item'];
        if (typeof options.active === 'boolean' && options.active === true) {
            cls.push('active');
        }
        var elm = this.append('items', '<div alia-context class=":class"></div>', {
            class: cls.join(' ')
        });

        var count = $('#' + this.id('indicators') + ' li').length;
        var cls_incicator = [];
        if (typeof options.active === 'boolean' && options.active === true) {
            cls_incicator.push('active');
        }
        this.append('indicators', '<li data-target=":target" data-slide-to=":no" class=":class"></li>', {
            no: count,
            target: '#' + this.id(),
            class: cls_incicator.join(' ')
        });

        // Return component
        return elm;
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Button

alia.defineControl({
    name: 'donutChart',
}, function() {



    return function(options) {

        // Set default options
        alia.defaults(options, {
            visible: true
        });

        var width = 960,
            height = 500,
            radius = Math.min(width, height) / 2;

        var color = d3.scale.category20();

        var pie = d3.layout.pie().value(function(d) {
            return d;
        }).sort(null);

        var arc = d3.svg.arc()
            .innerRadius(radius - 100)
            .outerRadius(radius - 20);

        var elm = this.append('<div alia-context></div>');
        var j = $('#' + elm.id());

        var svg = d3.select(j[0]).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        var path = null;

        options.data.onResolve(function(data) {
            if (path === null) {
                var indices = [];
                for (var i = 0; i < data.length; ++i) {
                    indices.push(i);
                }

                path = svg.datum(indices).selectAll("path")
                    .data(pie)
                    .enter().append("path")
                    .attr("fill", function(d, i) {
                        return color(i);
                    })
                    .attr("d", arc)
                    .each(function(d) {
                        this._current = d;
                    }); // store the initial angles
            }
            // // clearTimeout(timeout);
            pie.value(function(d) {
                return data[d];
            }); // change the value function
            path = path.data(pie); // compute the new angles
            path.attr("d", arc);
            path.transition().duration(750).attrTween("d", arcTween); // redraw the arcs
        });


        // Store the displayed angles in _current.
        // Then, interpolate from _current to the new angles.
        // During the transition, _current is updated in-place by d3.interpolate.
        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return function(t) {
                return arc(i(t));
            };
        }


        // btn.bindEnabled(enabled);
        // elm.bindVisible(options.visible);

        // Return component
        return elm;
    };
}());;'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Div

alia.defineLayout({
    name: 'div',
}, function() {

    var float = {
        'right': 'pull-right',
        'left': 'pull-left'
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Determine class
        var cls = [];
        if (typeof options.classes === 'string') {
            cls = options.classes.split(',');
        } else if (Array.isArray(options.classes)) {
            cls = options.classes;
        }

        if (typeof options.float === 'string' && float.hasOwnProperty(options.float)) {
            cls.push(float[options.float]);
        }

        var elm = this.append('<div alia-context class=":class"></div>', {
            class: cls.join(' ')
        });

        // Check special width
        if (typeof options.width === 'object') {
            if (options.width.hasOwnProperty('percent') && typeof options.width.percent === 'number') {
                elm.css('width', options.width.percent + '%');
                elm.css('white-space', 'nowrap');
                elm.css('overflow-x', 'auto');
            }
            if (options.width.hasOwnProperty('pixel') && typeof options.width.pixel === 'number') {
                elm.css('width', options.width.pixel + 'px');
                elm.css('white-space', 'nowrap');
                elm.css('overflow-x', 'auto');
            }
        } else if (typeof options.width === 'string') {
            if (options.width === 'auto') {
                elm.css('width', 'auto');
            }
        }

        elm.bindVisible(options.visible);

        // Return element
        return elm;
    }
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Container

alia.defineLayout({
    name: 'container',
}, function() {

    var types = {
        'fixed': 'container',
        'fluid': 'container-fluid'
    };

    return function(options) {

        // Determine class
        var cls = [];
        if (typeof options.type === 'string' && types.hasOwnProperty(options.type)) {
            cls.push(types[options.type]);
        }

        // Append container element
        return this.append('<div alia-context class=":class"></div>', {
            class: cls.join(' ')
        });
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Row

alia.defineLayout({
    name: 'row',
}, function(options) {

    var elm = this.append('<div alia-context class="row"></div>');

    switch (typeof options.padding) {
        case 'object':
            if (typeof options.padding.top === 'number') {
                elm.css('padding-top', options.padding.top + 'px');
            }
        case 'number':
        default:
    }

    return elm;
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Column

alia.defineLayout({
    name: 'column',
}, function() {

    var types = {
        'large': 'lg',
        'medium': 'md',
        'small': 'sm',
        'xsmall': 'xs'
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Determine class
        var cls = [];
        if (options.width && typeof options.width === 'object' && !Array.isArray(options.width)) {
            for (var prop in options.width) {
                if (types.hasOwnProperty(prop)) {
                    cls.push('col-' + types[prop] + '-' + options.width[prop]);
                }
            }
        }
        if (options.offset && typeof options.offset === 'object' && !Array.isArray(options.width)) {
            for (var prop in options.offset) {
                if (types.hasOwnProperty(prop)) {
                    cls.push('col-' + types[prop] + '-offset-' + options.offset[prop]);
                }
            }
        }

        var elm = this.append('<div alia-context class=":class"></div>', {
            class: cls.join(' ')
        });

        elm.bindVisible(options.visible);

        // Append container element
        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Affix

alia.defineLayout({
    name: 'affix'
}, function() {

    return function(options) {

        var elm = this.append('<div alia-context></div>');

        if (typeof options.top === 'number') {
            elm.css('position', 'fixed');
            elm.css('top', options.top);
        }

        // Append container element
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Wells

alia.defineLayout({
    name: 'well',
}, function() {

    var sizes = {
        'large': 'well-lg',
        'small': 'well-sm'
    };

    return function(options) {

        // Determine class
        var cls = ['well']
        if (typeof options.size === 'string' && sizes.hasOwnProperty(options.size)) {
            cls.push(sizes[options.size]);
        }

        var elm = this.append('<div alia-context class=":class"></div>', {
            class: cls.join(' ')
        });

        // Return element
        return elm;
    }
}());;'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dropdown

alia.defineLayout({
    name: 'dropdown'
}, function() {
    return function(options) {
        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var elm = this.append([
            '<div alia-context class="dropdown">',
            '  <a alia-context="toggler"></a>',
            '</div>'
        ].join(''));

        if (alia.isAccessor(options.text)) {
            options.text.onResolve(function(value) {
                $('#' + elm.id('toggler')).html(value);
            })
        } else {
            $('#' + elm.id('toggler')).html(options.text);
        }

        $('html').click(function() {
            elm.class('remove', 'open');
        })

        $('#' + elm.id('toggler')).click(function(event) {
            elm.class('add', 'open');
            event.stopPropagation();
        });

        elm.bindVisible(options.visible);

        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dropdown Menu

alia.defineLayout({
    name: 'dropdownMenu'
}, function() {
    return function(options) {
        return this.append('<ul alia-context class="dropdown-menu" role="menu"></ul>');
    }
}())


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dropdown Item

alia.defineLayout({
    name: 'dropdownItem'
}, function() {
    return function(options) {
        var elm = this.append('<li alia-context></li>');

        return elm;
    };
}());

alia.defineControl({
    name: 'dropdownItem'
}, function() {
    return function(options) {

        alia.applyDefaults(options, {
            visible: true
        });

        var elm = this.append('<li><a alia-context style="cursor: pointer"></a></li>').bindHtml('text', options.text);

        if (typeof options.link === 'string') {
            elm.attr('href', options.link);
        }

        elm.bindVisible(options.visible);

        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dropdown Divider

alia.defineControl({
    name: 'dropdownDivider'
}, function() {
    return function(options) {
        return this.append('<li alia-context class="divider"></li>');
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dropdown Header

alia.defineControl({
    name: 'dropdownHeader'
}, function() {
    return function(options) {

        // Append link element
        var elm = this.append('<li role="presentation" class="dropdown-header">:text</li>', {
            text: alia.getString(options.text)
        });

        // Define and bind properties
        elm.bindHtml('text', options.text);

        // Return component
        return elm;
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Textbox

alia.defineControl({
    name: 'editableTextbox',
}, function() {

    var types = {
        text: 'text',
        email: 'email',
        number: 'number',
        password: 'password'
    };

    var spin_opts = {
        lines: 9, // The number of lines to draw
        length: 5, // The length of each line
        width: 1.5, // The line thickness
        radius: 2.7, // The radius of the inner circle
        corners: 0.8, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb or array of colors
        speed: 2.2, // Rounds per second
        trail: 45, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        className: 'spinner' // The CSS class to assign to the spinner
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            type: 'text',
            disabled: false,
            visible: true,
            deferred: true
        });

        // Append div element
        var div = this.append('<div alia-context class="editable-element text-toggle"></div>');

        // Append text element
        var span = alia.doText(div, {
            text: options.text
        }).class('add', 'editable-text').onClick(function(event) {
            div.class('toggle', 'text-toggle');
            jinput.focus();
        }).onHover(function() {
            editIcon.class('add', 'visible');
        }, function() {
            editIcon.class('remove', 'visible');
        });

        // Append glyph element
        var editIcon = alia.doIcon(div, {
            name: 'pencil'
        });

        // Append form element
        var form = div.append('<form alia-context class="editable-form"></form>');

        // Append input element
        var input = form.append('<input alia-context type=":type">', {
            type: options.type
        }).onFocusOut(function() {
            if (options.deferred === false) {
                div.class('toggle', 'text-toggle');
                if (text.isSettable()) {
                    text.set(temp.get());
                }
            }
        });
        var jinput = $('#' + input.id());

        if (options.deferred) {

            // Append button elements
            var btns = form.append('<div alia-context class="save-options"></div>');
            alia.layoutButtonGroup(btns, {
                size: 'small'
            }, function(ctx) {
                var btn_accept = alia.doButton(ctx, {}).onClick(function() {
                    var data = temp.get();
                    var resolve = function() {
                        spinner.stop();
                        div.class('toggle', 'text-toggle');
                        text.set(data);
                    };
                    var reject = function(msg) {
                        spinner.stop();
                        console.log('reject');
                    }
                    spinner.spin(target);
                    $(spinner.el).removeAttr('style');
                    div.emitSubmit(data, resolve, reject);
                });
                alia.doIcon(btn_accept, {
                    name: 'ok'
                });
                var btn_cancel = alia.doButton(ctx, {}).onClick(function(event) {
                    div.class('toggle', 'text-toggle');
                    temp.set(text.get());
                });
                alia.doIcon(btn_cancel, {
                    name: 'remove'
                });
            });

            // Append and start spinner
            var spinnerSpan = div.append('<span alia-context class="spinner"></span>');
            var target = $('#' + spinnerSpan.id(''))[0];
            var spinner = new Spinner(spin_opts);
        }

        // Define properties
        var text = input.defineProperty('text', options.text);
        var temp = alia.state();

        // if (alia.isAccessor(options.text)) {
        //     console.log('here');
        //     options.text.onResolve(function(value) {
        //         console.log('options.text', value);
        //     })
        // }

        if (options.deferred === true) {
            text.onResolve(function(value) {
                temp.set(value);
            });
        } else {
            text.onResolve(function(value) {
                temp.set(value);
            });
        }

        input.bindText('edited', temp, options.type);

        div.defineEvent('submit');

        return div;
    }
}());

alia.defineControl({
    name: 'editableBoolean'
}, function() {
    var types = {
        'y/n': 'y/n',
        't/f': 't/f'
    };

    var spin_opts = {
        lines: 9, // The number of lines to draw
        length: 5, // The length of each line
        width: 1.5, // The line thickness
        radius: 2.7, // The radius of the inner circle
        corners: 0.8, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb or array of colors
        speed: 2.2, // Rounds per second
        trail: 45, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        className: 'spinner' // The CSS class to assign to the spinner
    };

    return function(options) {
        // Set default options
        alia.applyDefaults(options, {
            type: 't/f',
            disabled: false,
            visible: true
        });

        // Append div element
        var div = this.append('<div alia-context class="editable-element text-toggle"></div>');

        var text;
        if (typeof options.map === 'function') {
            if (alia.isAccessor(options.value)) {
                text = options.value.then(options.map);
            } else {
                text = options.map(options.value);
            }
        } else {
            text = options.value;
        }

        // Append text element
        var span = alia.doText(div, {
            text: text
        }).class('add', 'editable-text').onClick(function(event) {
            div.class('toggle', 'text-toggle');
        }).onHover(function() {
            editIcon.class('add', 'visible');
        }, function() {
            editIcon.class('remove', 'visible');
        });

        // Append glyph element
        var editIcon = alia.doIcon(div, {
            name: 'pencil'
        });

        // Append form element
        var form = div.append('<form alia-context class="editable-form"></form>');

        // Append select element
        var select = form.append([
            '<select alia-context>',
            '  <option value="true">:textTrue</option>',
            '  <option value="false">:textFalse</option>',
            '</select>'
        ].join(''), {
            textTrue: (options.type === 't/f') ? 'True' : 'Yes',
            textFalse: (options.type === 't/f') ? 'False' : 'No'
        });

        // Append button elements
        var btns = form.append('<div alia-context class="save-options"></div>');
        alia.layoutButtonGroup(btns, {
            size: 'small'
        }, function(ctx) {
            var btn_accept = alia.doButton(ctx, {}).onClick(function() {
                var data = (temp.get() === 'true') ? true : false;
                var resolve = function() {
                    spinner.stop();
                    div.class('toggle', 'text-toggle');
                    bool.set(data);
                };
                var reject = function(msg) {
                    spinner.stop();
                    console.log('reject');
                }
                spinner.spin(target);
                $(spinner.el).removeAttr('style');
                div.emitSubmit(data, resolve, reject);
            });
            alia.doIcon(btn_accept, {
                name: 'ok'
            });
            var btn_cancel = alia.doButton(ctx, {}).onClick(function(event) {
                div.class('toggle', 'text-toggle');
                temp.set((bool.get()) ? 'true' : 'false');
            });
            alia.doIcon(btn_cancel, {
                name: 'remove'
            });
        });

        // Append and start spinner
        var spinnerSpan = div.append('<span alia-context class="spinner"></span>');
        var target = $('#' + spinnerSpan.id(''))[0];
        var spinner = new Spinner(spin_opts);

        // Define properties
        var bool = select.defineProperty('bool', options.value);

        var temp = alia.state((options.value === true) ? 'true' : 'false');

        // Establish bindings
        select.bindText('text', temp, 'text');

        div.defineEvent('submit');

        return div;
    }
}());

alia.defineControl({
    name: 'editableMarkdown'
}, function() {

    var spin_opts = {
        lines: 9, // The number of lines to draw
        length: 5, // The length of each line
        width: 1.5, // The line thickness
        radius: 2.7, // The radius of the inner circle
        corners: 0.8, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb or array of colors
        speed: 2.2, // Rounds per second
        trail: 45, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        className: 'spinner' // The CSS class to assign to the spinner
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var elm = this.append('<div alia-context>test</div>');


        // Return element 
        return elm;
    }
}());;'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Form

alia.defineLayout({
    name: 'form'
}, function() {

    var styles = {
        'default': 'form',
        'horizontal': 'form-horizontal',
        'inline': 'form-inline'
    };

    var positions = {
        'left': 'navbar-form navbar-left',
        'right': 'navbar-form navbar-right'
    };

    return function(options) {

        // Set default options
        if (typeof options.style !== 'string' || !styles.hasOwnProperty(options.style)) {
            options.style = styles.default;
        }

        // Determine class
        var cls = [styles[options.style]];
        if (typeof options.position === 'string' && positions.hasOwnProperty(options.position)) {
            cls.push(positions[options.position]);
        }

        // Append table element
        var elm = this.append('<form alia-context class=":class"></form>', {
            class: cls.join(' ')
        });

        // Define properties
        elm.defineStatic('style', options.style);

        // Return component
        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Form

alia.defineLayout({
    name: 'formField'
}, function() {

    var types = {
        'large': 'lg',
        'medium': 'md',
        'small': 'sm',
        'xsmall': 'xs'
    };

    return function(options) {
        switch (this.style) {
            case 'horizontal':

                // Determine class
                var labelcls = ['control-label'];
                if (typeof options.labelwidth === 'object' && !Array.isArray(options.labelwidth)) {
                    for (var prop in options.labelwidth) {
                        if (types.hasOwnProperty(prop)) {
                            labelcls.push('col-' + types[prop] + '-' + options.labelwidth[prop]);
                        }
                    }
                }
                if (typeof options.labeloffset === 'object' && !Array.isArray(options.labeloffset)) {
                    for (var prop in options.labeloffset) {
                        if (types.hasOwnProperty(prop)) {
                            labelcls.push('col-' + types[prop] + '-offset-' + options.labeloffset[prop]);
                        }
                    }
                }
                var cls = [];
                if (typeof options.width === 'object' && !Array.isArray(options.width)) {
                    for (var prop in options.width) {
                        if (types.hasOwnProperty(prop)) {
                            cls.push('col-' + types[prop] + '-' + options.width[prop]);
                        }
                    }
                }
                if (typeof options.offset === 'object' && !Array.isArray(options.offset)) {
                    for (var prop in options.offset) {
                        if (types.hasOwnProperty(prop)) {
                            cls.push('col-' + types[prop] + '-offset-' + options.offset[prop]);
                        }
                    }
                }

                if (typeof options.special === 'string' && options.special === 'checkbox') {
                    return this.append(
                        '<div class="form-group">' +
                        '  <div class=":class">' +
                        '    <div class="checkbox">' +
                        '      <label alia-context></label>' +
                        '    </div>' +
                        '  </div>' +
                        '</div>', {
                            class: cls.join(' ')
                        });
                } else if (typeof options.special === 'string' && options.special === 'button') {
                    return this.append(
                        '<div class="form-group">' +
                        '  <div alia-context class=":class">' +
                        '  </div>' +
                        '</div>', {
                            class: cls.join(' ')
                        });
                } else {
                    return this.append(
                        '<div class="form-group">' +
                        '  <label class=":labelclass">:text</label>' +
                        '  <div alia-context class=":class"></div>' +
                        '</div>', {
                            labelclass: labelcls.join(' '),
                            class: cls.join(' '),
                            text: alia.getString(options.text)
                        });
                }

                break;
            case 'inline':
            case 'default':
                // Determine class
                var labelcls = ['sr-only'];

                if (typeof options.checkbox === 'boolean' && options.checkbox) {
                    return this.append(
                        '<div class="checkbox">' +
                        '  <label alia-context></label>' +
                        '</div>', {});
                } else {
                    return this.append(
                        '<div alia-context class="form-group">' +
                        '  <label class=":labelclass">:text</label>' +
                        '</div>', {
                            labelclass: labelcls.join(' '),
                            text: alia.getString(options.text)
                        });
                }
                break;
        }
    }
}());

alia.defineControl({
    name: 'form'
}, function() {
    function doField(ctx, field, model, options) {
        switch(field.type) {
            case 'checkbox':
                alia.layoutFormField(ctx, {
                    special: 'checkbox',
                    offset: options.label,
                    width: options.control
                }, function(ctx) {
                    alia.doCheckbox(ctx, {
                        checked: model.property(field.lens)
                    });
                    alia.doText(ctx, {
                        text: field.label
                    });
                });
                break;
            case 'textbox':
            case 'password':
                alia.layoutFormField(ctx, {
                    text: field.label,
                    labelwidth: options.label,
                    width: options.control
                }, function(ctx) {
                    alia.doTextbox(ctx, {
                        text: model.property(field.lens),
                        type: field.datatype || 'text',
                        placeholder: field.placeholder || '',
                        disabled: field.disabled
                    });
                });
                break;
            case 'typeahead':
                alia.layoutFormField(ctx, {
                    text: field.label,
                    labelwidth: options.label,
                    width: options.control
                }, function(ctx) {
                    alia.doTypeahead(ctx, {
                        value: model.property(field.lens),
                        type: field.sourcetype,
                        pool: field.source,
                        editable: field.editable
                    });
                });
                break;
            case 'datepicker':
                alia.layoutFormField(ctx, {
                    text: field.label,
                    labelwidth: options.label,
                    width: options.control
                }, function(ctx) {
                    alia.doDatepicker(ctx, {
                        placeholder: 'Enter Date',
                        date: model.property(field.lens)
                    });
                });
                break;
        }
    }

    return function(options) {
        // Append div element (for encapsulating widget)
        var div = this.append('<div alia-context></div>');

        var model;
        if (alia.isAccessor(options.model)) {
            model = options.model;
        } else {
            model = alia.state(options.model);
        }
        var fields = options.fields;
        var buttons = options.buttons;

        alia.layoutForm(div, {
            style: 'horizontal'
        }, function(ctx) {
            for (var i = 0; i < fields.length; ++i) {
                var field = fields[i];

                doField(ctx, field, model, options);

                if (Array.isArray(buttons)) {
                    alia.layoutFormField(ctx, {
                        special: 'button',
                        offset: options.label,
                        width: options.control
                    }, function(ctx) {
                        alia.layoutButtonGroup(ctx, {}, function(ctx) {
                            for (var i = 0; i < buttons.length; ++i) {
                                alia.doButton(ctx, {
                                    text: buttons[i].text
                                }).onClick(function(index) {
                                    return buttons[index].action
                                }(i))
                            }
                        })
                    });
                }
            }
        });

        div.getData = function() {
            return model.get();
        }

        div.refresh = function() {
        }

        return div;
    }
}());;// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Icon

alia.defineControl({
    name: 'icon',
}, function() {
    return function (options) {
        var cls = ['glyphicon'];
        if (typeof options.name === 'string') {
            cls.push('glyphicon-' + options.name);
        }

        var elm = this.append('<span alia-context class=":class"> </span>', {
            class: cls.join(' ')
        });

        if (alia.isAccessor(options.name)) {
            options.name.onResolve(function (value) {
                var cls = ['glyphicon'];
                if (typeof value === 'string') {
                    cls.push('glyphicon-' + value);
                }

                elm.removeAttr('class');
                elm.attr('class', cls.join(' '));
            })
        }

        return elm;
    }
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Textbox

alia.defineControl({
    name: 'textbox',
}, function() {

    var sizes = {
        large: 'input-lg',
        small: 'imput-sm'
    };

    var types = {
        text: 'text',
        email: 'email',
        number: 'number',
        password: 'password'
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            type: types.text,
            disabled: false,
            visible: true
        });

        // Determine class
        var cls = ['form-control'];
        if (typeof options.size === 'string' && sizes.hasOwnProperty(options.size)) {
            cls.push(sizes[options.size]);
        }

        // Append text element
        var elm = this.append('<input alia-context type=":type" class=":class">', {
            type: options.type,
            class: cls.join(' ')
        });

        // Set attributes
        if (typeof options.placeholder === 'string') {
            elm.attr('placeholder', options.placeholder);
        }

        // Bind properties
        elm.bindDisabled(options.disabled);
        elm.bindText(options.text, options.type);
        elm.bindVisible(options.visible);

        // Return component
        return elm;

        // var autofillPoller = function() {
        //     return Bacon.interval(50).take(10).map(get).filter(alia.isNotEmptyString).take(1);
        // };

        // var events = j.asEventStream("keyup input").merge(j.asEventStream("cut paste").delay(1)).merge(autofillPoller());
        // elm.defineProperty('text', options.text).bind(Bacon.Binding({
        //     initValue: alia.getString(options.text),
        //     get: get,
        //     events: events,
        //     set: function(value) {
        //         return j.val(value);
        //     }
        // }));        
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Checkbox

alia.defineControl({
    name: 'checkbox',
}, function() {

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            checked: false,
            visible: true
        });

        // Append checkbox element
        var elm = this.append('<input alia-context type="checkbox">');

        // Define properties
        var checked = elm.defineProperty('checked', options.checked);

        // Establish bindings
        elm.bindCheckboxField(checked);
        elm.bindVisible(options.visible);

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Textarea

alia.defineControl({
    name: 'textarea',
}, function() {

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true,
            resize: 'both'
        });

        // Append textarea element
        var elm = this.append('<textarea alia-context rows=":rows" class="form-control" style="resize::resize"></textarea>', {
            rows: options.rows,
            resize: options.resize
        });

        // Apply attributes
        if (typeof options.placeholder === 'string') {
            elm.attr('placeholder', options.placeholder);
        }

        // Apply styles
        elm.css('width', '100%');

        // Establish bindings
        elm.bindText(options.text, 'text');
        elm.bindVisible(options.visible);

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Select (Combo Box)

alia.defineControl({
    name: 'select',
}, function() {

    function doStaticOptions(elm, opts) {
        if (!Array.isArray(opts)) {
            return;
        }

        for (var i = 0; i < opts.length; ++i) {
            var opt = opts[i];
            if (typeof opt === 'string' || typeof opt === 'number') {
                elm.append('<option value=":text">:text</option>', {
                    text: opt
                });
            } else {
                elm.append('<option value=":value">:text</option>', {
                    value: (opt.hasOwnProperty('value')) ? opt.value : opt.text,
                    text: opt.text
                });
            }
        }
        $('#' + elm.id()).trigger('change');
    }

    function doOptions(elm, opts) {
        var len = 0;
        opts.property('.length').onResolve(function (size) {
            if (size < len) {
                len = size;
            } else {
                for (var i = len; i < size; ++i) {
                    var opt = opts.at(i);
                    doOption(elm, opt);
                }
            }
        })
    }

    function doOption(elm, opt) {
        var optelm;
        opt.observe(function (value) {
            if (typeof value === 'string' || typeof value === 'number') {
                optelm = elm.append('<option value=":text">:text</option>', {
                    text: value
                });
                $('#' + elm.id()).trigger('change');
            } else {
                optelm = elm.append('<option value=":value">:text</option>', {
                    value: (value.hasOwnProperty('value')) ? value.value : value.text,
                    text: value.text
                });
                $('#' + elm.id()).trigger('change');
            }
        }, function () {
            if (typeof optelm !== 'undefined') {
                $('#' + optelm.id()).remove();
                optelm = undefined;
            }
            $('#' + elm.id()).trigger('change');
        }, null);
    }

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Append checkbox element
        var elm = this.append('<select alia-context class="form-control"></select>');

        // Bind properties
        elm.bindSelectValue(options.selected);
        elm.bindVisible(options.visible);

        var opts = null;
        if (alia.isAccessor(options.options)) {
            doOptions(elm, options.options);
        } else {
            doStaticOptions(elm, options.options);
        }

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Date picker 

alia.defineControl({
    name: 'datepicker'
}, function() {
    return function (options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var elm = this.append('<input alia-context type="text" class="form-control">');

        $('#' + elm.id()).datepicker({
            startDate: options.startDate,
            endDate: options.endDate
        });
        
        // Set attributes
        if (typeof options.placeholder === 'string') {
            elm.attr('placeholder', options.placeholder);
        }

        elm.bindDate(options.date);
        elm.bindVisible(options.visible);

        return elm;
    }
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Typeahead

alia.defineControl({
    name: 'typeahead',
}, function() {

    var sizes = {
        large: 'input-lg',
        small: 'imput-sm'
    };

    return function(options) {

        var engine;
        if (options.type === 'string') {
            engine = new Bloodhound({
                datumTokenizer: function(d) {
                    return Bloodhound.tokenizers.whitespace(d);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                limit: 10,
                local: []
            });
        } else if (options.type === 'object') {
            engine = new Bloodhound({
                datumTokenizer: function(d) {
                    return Bloodhound.tokenizers.whitespace(d.display);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                limit: 10,
                local: []
            });
        }

        engine.initialize();

        // Set default options
        alia.applyDefaults(options, {
            disabled: false,
            visible: true
        });

        // Determine class
        var cls = ['form-control'];
        if (typeof options.size === 'string' && sizes.hasOwnProperty(options.size)) {
            cls.push(sizes[options.size]);
        }

        // Append text element
        var elm = this.append('<input alia-context type="text" class=":class">', {
            class: cls.join(' ')
        });

        // Make it a typeahead
        $('#' + elm.id()).typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        }, {
            name: 'typeahead-dataset',
            displayKey: function(value) {
                if (options.type === 'string') {
                    return value;
                } else if (options.type === 'object') {
                    return value.display;
                }
            },
            source: engine.ttAdapter()
        });

        // Set attributes
        if (typeof options.placeholder === 'string') {
            elm.attr('placeholder', options.placeholder);
        }

        var pools = {};

        function setPools() {
            engine.clear();
            for (var prop in pools) {
                engine.add(pools[prop]);
            }
        }

        if (alia.isAccessor(options.pool)) {
            options.pool.onResolve(function(pool) {
                pools[0] = pool;
                setPools();
            });
        } else if (Array.isArray(options.pool)) {
            for (var i = 0; i < options.pool.length; ++i) {
                if (alia.isAccessor(options.pool[i])) {
                    options.pool[i].onResolve(function (idx) {
                        return function (value) {
                            pools[idx] = JSON.parse(JSON.stringify(value));
                            setPools();
                        }
                    }(i))
                }
            }
        }

        // Bind properties
        elm.bindDisabled(options.disabled);
        elm.bindText(options.text, 'text');
        elm.bindVisible(options.visible);

        // Define property
        var value = elm.defineProperty('value', options.value);

        // Check whether editable
        elm.onFocusOut(function() {
            var found = false;
            elm.text.set($('#' + elm.id()).typeahead('val'));
            var val = elm.text.get();
            if (val === '') value.set(null);
            for (var prop in pools) {
                for (var j = 0; j < pools[prop].length; ++j) {
                    if (options.type === 'string' && pools[prop][j] === val) {
                        value.set(val);
                        found = true;
                        break;
                    } else if (options.type === 'object' && pools[prop][j].display === val) {
                        value.set(pools[prop][j].key);
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
            if (!found && !options.editable) {
                elm.text.set('');
                $('#' + elm.id()).typeahead('val', '');
            } else if (!found && options.editable) {
                value.set(val);
            }
        });

        // Return component
        return elm;
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Widget

alia.defineControl({
    name: 'repeat',
}, function() {


    return function(options) {

        // Append div element (for encapsulating widget)
        var div = this.append('<div alia-context></div>');
        

        // Initialize data
        var data = alia.state(options.data);
        var rowCount = null;
        data.onResolve(function(rows) {
            if (rows.length !== rowCount) {
                rowCount = rows.length;
                render();
            }
        });

        div.defineProperty('data', data);




        // var values = [];

        // var setter = function(index) {
        //     return function(value) {
        //         values[index] = value;
        //     }
        // }

        // Define render function
        function render() {
            div.empty();
            for (var i = 0; i < rowCount; ++i) {
                var ctx = div.append('<div alia-context></div>');
                var value = data.at(i);
                options.callback.call(null, ctx, value);
            };
        }

        // Render current state
        render();

        // Return component
        return div;
    }
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Jumbotron

alia.defineLayout({
    name: 'jumbotron',
}, function() {
    return function(options) {
        if (options.type === 'extend') {
            return this.append('<div class="jumbotron"><div alia-context class="container"></div></div>');
        } else {
            return this.append('<div alia-context class="jumbotron" id=":id"></div>');
        }
    };
}());;// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Lists

alia.defineLayout({
	name: 'unorderedList'
}, function(options) {
	return this.append('<ul alia-context></ul>');
});

alia.defineLayout({
	name: 'orderedList'
}, function(options) {
	return this.append('<ol alia-context></ol>');
});

alia.defineLayout({
	name: 'listItem'
}, function(options) {
	return this.append('<li alia-context></li>');
});

alia.defineLayout({
	name: 'descriptionList'
}, function() {

	var styles = {
		'default': null,
		'horizontal': 'dl-horizontal'
	};

	return function(options) {

		// Set default options
		alia.applyDefaults(options, {
			visible: true,
			style: 'default'
		}, {
			style: styles
		});

		// Determine class
		return this.append('<dl alia-context class=":class"></dl>', {
			class: _.compact([
				styles[options.style]
			]).join('')
		});
	}
}());

alia.defineLayout({
	name: 'descriptionTerm'
}, function(options) {
	return this.append('<dt alia-context></dt>');
});

alia.defineLayout({
	name: 'descriptionItem'
}, function(options) {
	return this.append('<dd alia-context></dd>');
});

alia.defineControl({
	name: 'descriptionList'
}, function(options) {

	var elm = alia.layoutDescriptionList(this, options, function(ctx) {
		for (var i = 0; i < options.items.length; ++i) {
			alia.layoutDescriptionTerm(ctx, {}, function(ctx) {
				alia.doText(ctx, {
					text: options.items[i].term
				});
			});
			alia.layoutDescriptionItem(ctx, {}, function(ctx) {
				alia.doText(ctx, {
					text: options.items[i].description
				});
			});
		}
	});

	return elm;

});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// List group

alia.defineLayout({
	name: 'listGroup'
}, function() {

	return function(options) {
		return this.append('<ul alia-context class="list-group"></ul>');
	};
}());

alia.defineLayout({
	name: 'listGroupItem'
}, function() {

	var styles = {
		default: null,
		success: 'list-group-item-success',
		info: 'list-group-item-info',
		warning: 'list-group-item-warning',
		danger: 'list-group-item-danger',
	};

	return function(options) {

		// Set default options
		alia.applyDefaults(options, {
			visible: true,
			style: 'default'
		}, {
			style: styles
		});

		var elm = this.append('<ul alia-context class=":class"></ul>', {
			class: _.compact([
				'list-group-item',
				styles[options.style]
			]).join('')
		});

		elm.bindVisible(options.visible);

		return elm;
	};
}());

alia.defineControl({
	name: 'listGroup'
}, function() {



	return function(options) {

	};
}());;'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Image

alia.defineControl({
    name: 'image'
}, function() {

    var styles = {
        rounded: 'img-rounded',
        circle: 'img-circle',
        thumbnail: 'img-thumbnail'
    }

    return function(options) {

        var cls = [];
        if (typeof options.style === 'string' && styles.hasOwnProperty(options.style)) {
            cls.push(styles[options.style]);
        }
        if (typeof options.responsive === 'boolean' && options.responsive) {
            cls.push('img-responsive');
        }

        var content=":text";
        if (typeof options.link === 'object' && options.link.hasOwnProperty('href')) {
            content = alia.replace('<a href=":href">:text</a>', {
                href: options.link
            });
        }

        var elm = this.append(alia.replace(content, { text: '<img src=":source" alt=":alt" class=":class">' }), {
            source: options.source,
            alt: options.alt || '',
            class: cls.join(' ')
        });

        // Return component
        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Media

alia.defineLayout({
    name: 'media'
}, function () {
    return function (options) {

        var html = [
            '<div class="media" style="cursor:pointer">',
            '  <a class="pull-left">',
            '    <img class="media-object" src=":source" alt=":alt">',
            '  </a>',
            '  <div alia-context class="media-body"></div>',
            '</div>'
        ];

        var elm = this.append(html.join(''), {
            source: options.source,
            alt: options.alt || ''
        });

        // Return component
        return elm;
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Modal

alia.defineLayout({
    name: 'modal'
}, function() {

    var sizes = {
        'large': 'modal-lg',
        'small': 'modal-sm'
    };

    return function(options) {

        // Determine classes
        var fade = '';
        var cls = ['modal-dialog'];
        if (typeof options.size === 'string' && sizes.hasOwnProperty(options.size)) {
            cls.push(sizes[options.size]);
        }
        if (typeof options.fade === 'undefined' || options.fade === true) {
            fade = 'fade'
        }

        // Append components
        var content =
            '<div alia-context class="modal :fade" tabindex="-1" role="dialog" aria-labelledby=":title" aria-hidden="true">' +
            '  <div class=":class">' +
            '    <div alia-context="content" class="modal-content"></div>' +
            '  </div>' +
            '</div>';
        var elm = this.append(content, {
            title: options.title,
            class: cls.join(' '),
            fade: fade
        });

        // Initialize modal using jquery
        $('#' + elm.id()).modal({
            backdrop: 'static',
            show: false
        });

        // Overwrite show and hide functions
        elm.hide = function() {
            $('#' + elm.id()).modal('hide');
        };
        elm.show = function() {
            $('#' + elm.id()).modal('show');
        }

        $('#' + elm.id()).on('shown.bs.modal', function (e) {
            $('#' + elm.id() + ' form:first *:input[type!=hidden][disabled!="disabled"][class!="form-control tt-hint"]:first').focus();
        });

        // Return component
        return elm;
    }
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Modal Header

alia.defineLayout({
    name: 'modalHeader'
}, function(options) {
    return this.append('content', '<div alia-context class="modal-header"></div>');
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Modal

alia.defineLayout({
    name: 'modalBody'
}, function(options) {
    return this.append('content', '<div alia-context class="modal-body"></div>');
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Modal

alia.defineLayout({
    name: 'modalFooter'
}, function(options) {
    return this.append('content', '<div alia-context class="modal-footer"></div>');
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Modal 

alia.defineControl({
    name: 'modalForm'
}, function() {

    var fieldTypes = {
        'password': {
            type: 'string',
            default: '',
            inputType: 'textbox'
        },
        'text': {
            type: 'string',
            default: '',
            inputType: 'textbox'
        },
        'number': {
            type: 'number',
            default: 0,
            inputType: 'textbox'
        },
        'boolean': {
            type: 'boolean',
            default: true,
            inputType: 'checkbox'
        },
        'typeahead': {
            default: '',
            inputType: 'typeahead'
        },
        'datepicker': {
            default: '',
            inputType: 'datepicker'
        }
    };

    return function(options) {

        // Determine form data (should eventually be moved to form control)
        var formdata = {};
        var formfields = [];
        for (var i = 0; i < options.fields.length; ++i) {
            var field = options.fields[i];
            if (typeof field.name !== 'string') {
                throw new Error("Invalid form field name");
            }
            var t;
            var fieldType;
            if (typeof field.type === 'string' && fieldTypes.hasOwnProperty(field.type)) {
                t = field.type;
                fieldType = fieldTypes[field.type];
            } else {
                t = 'text';
                fieldType = fieldTypes.text;
            }
            if (!alia.isAccessor(options.formdata)) {
                formdata[field.name] = typeof field.initValue === fieldType.type ? field.initValue : fieldType.default;
            }
            var fielddata = {
                type: fieldType.inputType,
                label: field.label,
                lens: '.' + field.name,
                datatype: t,
                placeholder: field.placeholder || '',
                disabled: field.disabled || false
            };
            // Add extra properties for typeahead
            if (fielddata.type === 'typeahead') {
                fielddata.sourcetype = field.sourcetype;
                fielddata.source = field.source;
                fielddata.editable = field.editable;
            }
            formfields.push(fielddata);
        }
        if (alia.isAccessor(options.formData)) {
            formdata = options.formData;
        }

        // Initialize state
        var submitting = alia.state(false);
        var message = alia.state(null);

        // Layout modal
        var modal = alia.layoutModal(this, {
            size: options.size,
            title: options.title,
            fade: options.fade
        }, function(ctx) {
            var modalCtx = ctx;

            alia.layoutModalHeader(ctx, {}, function(ctx) {
                alia.doButton(ctx, {
                    close: true,
                    text: '&times;'
                }).onClick(function() {
                    submitting.set(false);
                    message.set(null);
                    modal.hide();
                });
                alia.layoutHeading(ctx, {
                    type: 4,
                    text: options.title
                }, function(ctx) {});
            });
            var form;

            alia.layoutModalBody(ctx, {}, function(ctx) {
                form = alia.doForm(ctx, {
                    label: {
                        large: 3,
                        small: 4
                    },
                    control: {
                        large: 9,
                        small: 8
                    },
                    model: formdata,
                    fields: formfields
                });
            });

            alia.layoutModalFooter(ctx, {}, function(ctx) {
                alia.doText(ctx, {
                    text: message,
                    style: 'danger',
                    visible: message.then(alia.isNotEmptyString)
                });
                alia.doText(ctx, {
                    text: '&nbsp;&nbsp;&nbsp;',
                });
                alia.doButton(ctx, {
                    text: 'Cancel',
                    disabled: submitting
                }).onClick(function() {
                    form.refresh();
                    message.set(null);
                    modal.hide();
                });
                var saveBtn = alia.doButton(ctx, {
                    text: 'Save',
                    style: 'primary',
                    loading: submitting,
                    loadingStyle: 'expand-right'
                }).onClick(function() {
                    submitting.set(true);
                    var data = form.getData();
                    var resolve = function() {
                        submitting.set(false);
                        message.set(null);
                        modal.hide();
                        form.refresh();
                    };
                    var reject = function(msg) {
                        submitting.set(false);
                        message.set(msg);
                    }
                    modal.emitSubmit(data, resolve, reject);
                });

                if (options.onEnterKeySubmit) {
                    modalCtx.onEnterKey(function () {
                        saveBtn.doClick();
                    });
                }
            });
        });

        // Define events
        modal.defineEvent('Submit');

        // Return modal
        return modal;
    };
}());;'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Multiview Navigation Linkset

alia.defineLayout({
    name: 'multiviewNavigationLinkset'
}, function() {
    return function(options) {
        // Append list element
        var elm = this.append('<ul alia-context class="mulitview-navigation-linkset"></ul>');


        var self = this;
        elm.push = function() {
            self.push.apply(self, arguments);
            return this;
        };

        // Return component
        return elm;
    }
}())

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Multiview Navigation Header

alia.defineControl({
    name: 'multiviewNavigationHeader',
}, function() {
    return function(options) {

        // Append link element
        var elm = this.append('<li role="presentation" class="multiview-navigation-header">:text</li>', {
            text: alia.getString(options.text)
        });

        // Define and bind properties
        elm.bindHtml(elm.defineProperty('text', options.text));

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Multiview Navigation Item

alia.defineControl({
    name: 'multiviewNavigationItem',
}, function() {
    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var elm;
        if (options.hasOwnProperty('view')) {
            var elm = this.append('<li><a alia-context style="cursor: pointer;">:text</a></li>', {
                link: options.link,
                text: alia.getString(options.text)
            }).onClick(function () {
                this.push(options.view, options.query);
            }.bind(this));
            elm.bindHtml('text', options.text);
        } else if (options.hasOwnProperty('link')) {
            var elm = this.append('<li><a alia-context href=":link">:text</a></li>', {
                link: options.link,
                text: alia.getString(options.text)
            });
            elm.bindHtml('text', options.text);
        };

        elm.bindVisible(options.visible);

        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Multiview Navigation Item

alia.defineControl({
    name: 'multiviewNavigationDivider',
}, function() {
    return function(options) {
        return this.append('<li alia-context class="divider"></li>');
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Navbar

alia.defineLayout({
    name: 'navbar',
}, function() {

    var styles = {
        'default': 'navbar-default',
        'inverse': 'navbar-inverse'
    };

    var fixedPositions = {
        'top': 'navbar-fixed-top',
        'bottom': 'navbar-fixed-bottom'
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Determine class
        var cls = ['navbar'];
        if (typeof options.style === 'string' && styles.hasOwnProperty(options.style)) {
            cls.push(styles[options.style]);
        } else {
            cls.push(styles.default);
        }

        if (typeof options.fixed === 'string' && fixedPositions.hasOwnProperty(options.fixed)) {
            // if (options.fixed === 'top') $('body').css('padding-top', '51px');
            // if (options.fixed === 'bottom') $('body').css('padding-bottom', '51px');
            cls.push(fixedPositions[options.fixed]);
        }

        // Append containing component
        var containerContent =
            '<nav class=":class" role="navigation">' +
            '  <div alia-context class="container-fluid"></div>' +
            '</nav>';
        var container = this.append(containerContent, {
            class: cls.join(' ')
        });

        var brand;
        if (typeof options.brand === 'string') {
            brand = options.brand
        } else {
            brand = 'Brand';
        }

        // Append header component
        var header = container.append(
            '<div class="navbar-header">' +
            '  <button alia-context="collapse" type="button" class="navbar-toggle" data-toggle="collapse">' +
            '    <span class="sr-only">Toggle navigation</span>' +
            '    <span class="icon-bar"></span>' +
            '    <span class="icon-bar"></span>' +
            '    <span class="icon-bar"></span>' +
            '  </button>' +
            '  <a class="navbar-brand" href="#">:brand</a>' +
            '</div>', {
                brand: brand
            });

        // Append content component
        var content = container.append(
            '<div alia-context class="collapse navbar-collapse">' +
            '  <ul alia-context="nav" class="nav navbar-nav"></ul>' +
            '</div>');

        // Associate collapsable content
        header.kattr('collapse', 'data-target', '#' + content.id());

        container.bindVisible(options.visible);

        // Return component
        return content;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Navbar Form

alia.defineLayout({
    name: 'navbarForm'
}, function() {

    var roles = {
        search: 'search'
    };

    return function(options) {
        return this.append('<form alia-context class="navbar-form navbar-left"></form>');
    }
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Navbar Right

alia.defineLayout({
    name: 'navbarRight'
}, function() {
    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var elm = this.append('<ul alia-context="nav" class="nav navbar-nav navbar-right"></ul>');

        elm.bindVisible('nav', options.visible);

        return elm;
    }
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Navbar Link

alia.defineControl({
    name: 'navbarLink',
}, function() {
    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Append link element
        var elm = this.append('nav', '<li><a alia-context href=":link"></a></li>', {
            link: options.link,
        });

        // Define properties and bind to element
        var j = $('#' + elm.id());
        var text = elm.defineProperty('text', options.text);
        text.onResolve(function(value) {
            j.html(value);
        });
        text.onError(function(err) {
            j.empty();
        });

        elm.bindVisible(options.visible);

        // Return element
        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Navbar Dropdown

alia.defineLayout({
    name: 'navbarDropdown',
}, function() {
    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Append dropdown element
        var content =
            '<li alia-context="dropdown" class="dropdown">' +
            '  <a alia-context="link" class="dropdown-toggle" style="cursor:pointer;" data-toggle="dropdown">:text <b class="caret"></b></a>' +
            '  <ul alia-context class="dropdown-menu"></ul>' +
            '</li>';
        var elm = this.append('nav', content, {
            link: options.link
        });

        // Bind common properties
        elm.bindVisible('dropdown', options.visible);

        // Define and bind custom properties
        var text = elm.defineProperty('text', options.text);
        text.onResolve(function(value) {
            elm.khtml('link', value + ' <b class="caret"></b>');
        });
        text.onError(function (err) {
            elm.khtml('link', '');
        });

        // Return element
        return elm;
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Tabset

alia.defineLayout({
    name: 'panel',
}, function() {

    var styles = {
        'default': 'panel-default',
        'primary': 'panel-primary',
        'success': 'panel-success',
        'info': 'panel-info',
        'warning': 'panel-warning',
        'danger': 'panel-danger'
    };

    var headerStyles = {
        'default': null,
        'h1': 'h1',
        'h2': 'h2',
        'h3': 'h3',
        'h4': 'h4',
        'h5': 'h5',
        'h6': 'h6',
    }

    return function(options) {

        // Apply defaults
        alia.applyDefaults(options, {
            style: 'default',
            headerStyle: 'default',
            visible: true,
            collapsible: false,
            collapsed: false
        }, {
            style: styles,
            headerStyle: headerStyles
        });

        // Append component
        var html = '<div alia-context="div" class="panel :style">';
        if (options.header) {
            if (options.headerStyle) {
                html += '<div class="panel-heading"><:hs alia-context="header" class="panel-title"></:hs></div>';
            } else {
                html += '<div alia-context="header" class="panel-heading"></div>';
            }
        }
        html += '<div alia-context class="panel-body"></div>';
        if (options.footer) {
            html += '<div alia-context="footer" class="panel-footer"></div>';
        }
        html += '</div>';
        var elm = this.append(html, {
            style: styles[options.style],
            hs: headerStyles[options.headerStyle]
        });

        // Bind visibility
        elm.bindVisible('div', options.visible);

        // Define property
        if (options.collapsible) {
            elm.bindCollapse('', options.collapsed);

            if (options.headerStyle) {
                $('#' + elm.id('header')).parent().click(function () {
                    elm.collapsed.set(!elm.collapsed.get());
                });
            } else {
                // Bind click
                $('#' + elm.id('header')).click(function () {
                    elm.collapsed.set(!elm.collapsed.get());
                });
            }
        }

        // Establish bindings
        if (options.header) {
            var property = elm.defineProperty('header', options.header);
            property.onResolve(function (value) {
                $('#' + elm.id('header')).html(value);
            });
        }
        if (options.footer) {
            var property = elm.defineProperty('footer', options.footer);
            property.onResolve(function (value) {
                $('#' + elm.id('footer')).html(value);
            });
        }

        // Return component
        return elm;
    };
}());;// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Progress

alia.defineControl({
    name: 'progress'
}, function () {

    var styles = {
        'success': 'progress-bar-success',
        'info': 'progress-bar-info',
        'warning': 'progress-bar-warning',
        'danger': 'progress-bar-danger'
    }

    return function (options) {

        // Determine class
        var cls = ['progress-bar'];
        var rating = '';
        if (typeof options.rating === 'boolean' && options.rating === true) {
            rating = 'progress-rating';
        }
        if (typeof options.style === 'string' && styles.hasOwnProperty(options.style)) {
            cls.push(styles[options.style]);
        }

        var html = [
            '<div class="progress :rating">',
            '  <div class=":class :rating" role="progressbar" aria-valuenow=":now" aria-valuemin="0" aria-valuemax="100" style="width::now%">:now%</div>',
            '</div>'
        ];

        var elm = this.append(html.join(''), {
            now: options.now,
            rating: rating,
            class: cls.join(' ')
        });

        // Return component
        return elm;
    };
}());;"use strict";


alia.defineControl({
    name: 'pageSpinner'
}, function () {

    var spin_opts = {
        lines: 13, // The number of lines to draw
        length: 20, // The length of each line
        width: 10, // The line thickness
        radius: 30, // The radius of the inner circle
        corners: 1.0, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb or array of colors
        speed: 1.0, // Rounds per second
        trail: 60, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        className: 'table-spinner' // The CSS class to assign to the spinner
    };

    return function (options) {
        var elm = alia.viewport.append('<div alia-context class="page-spinner-background"></div>')

        var target = $('#' + elm.id())[0];
        var spinner = new Spinner(spin_opts);

        spinner.spin(target);

        $('#' + elm.id()).attr('style', '');

        elm.stop = function () {
            spinner.stop();
            $('#' + elm.id()).remove();
        }

        return elm;
    }
}());;'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Table

alia.defineLayout({
    name: 'table',
}, function() {

    var styles = {
        'bordered': 'table-bordered',
        'striped': 'table-striped',
        'hover': 'table-hover',
        'condensed': 'table-condensed'
    };

    return function(options) {

        // Determine class
        var cls = [];
        var style;
        if (typeof options.style === 'string') {
            style = options.style.split(',')
        } else if (Array.isArray(options.style)) {
            style = options.style;
        }
        if (style) {
            for (var i = 0; i < style.length; i++) {
                if (styles.hasOwnProperty(style[i])) {
                    cls.push(styles[style[i]])
                }
            }
        }

        // Append table element
        return this.append('<table alia-context class="table :class"></table>', {
            class: cls.join(' ')
        });
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Table Row

alia.defineLayout({
    name: 'tableRow',
}, function() {

    var styles = {
        'active': 'active',
        'success': 'success',
        'warning': 'warning',
        'danger': 'danger',
        'info': 'info'
    };

    return function(options) {

        var elm;
        if (options.type === 'heading') {
            elm = this.append('<thead><tr alia-context></tr></thead>');
        } else {
            elm = this.append('<tr alia-context></tr>');
        }

        elm.defineProperty('style', options.style);

        if (typeof options.selectable === 'boolean' && options.selectable) {
            elm.css('cursor', 'pointer');
        }

        elm.style.onResolve(function(value) {
            if (typeof value === 'string' && styles.hasOwnProperty(value)) {
                elm.attr('class', styles[value]);
            } else {
                elm.removeAttr('class');
            }
        });

        return elm;
    };
}());


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Table Cell

alia.defineLayout({
    name: 'tableCell',
}, function() {

    var styles = {};

    return function(options) {

        // Determine type
        var type = (options.type === 'heading') ? 'h' : 'd';

        // Append table element
        var elm = this.append('<t:type alia-context></t:type>', {
            type: type
        });

        // Check if sortable
        if (options.hasOwnProperty('sortable') && options.sortable === true) {
            elm.css('cursor', 'pointer');
            elm.defineProperty('sortOrder', '');
            elm.onClick(function() {
                if (elm.sortOrder.get() === '') {
                    elm.sortOrder.set('A');
                } else if (elm.sortOrder.get() === 'A') {
                    elm.sortOrder.set('D');
                } else {
                    elm.sortOrder.set('');
                }
            });
            alia.doText(elm, {
                style: 'info',
                text: elm.sortOrder
            }).class('add', 'pull-right');
        }

        return elm;
    };
}());

/**
 * @typedef {Object} Field
 * @property {boolean} [hidden=false] - Specifies whether the cell is hidden
 * @property {string} [filter] - Specifies the filter for the cell
 * @property {function} [map] - Specifies a way to map the cell data to something else
 * @property {string} [heading] - Denotes the heading for the column
 * @property {function} [sortPrimer] - The function to apply to the cell data before sorting
 * @property {string} property - The key or index into a row's object or array
 */

/**
 * @typedef {Field[]} Fields
 */

/**
 * @typedef {Object} Paging
 * @property {number} default - Indicates the default value for the list of values
 * @property {number[]} options - Specifies the list of page sizes available to the user
 */

/**
 * @typedef {Object} TableOptions
 * @property {(string|string[])} [style] - A comma-delimited list of styles (Possible values: 'bordered', 'striped', 'hover', and 'condensed')
 * @property {boolean} [selectable=false] - Specifies whether rows are selectable
 * @property {boolean} [sortable=false] - Specifies whether the table is sortable
 * @property {boolean} [spinner=false] - Specifies whether to use a loading spinner
 * @property {boolean} [removable=false] - Specifies whether to add a delete action column for deleting rows from the table
 * @property {boolean} [visible=true] - Specifies whether the table is visible
 * @property {string} [filter] - A string with which to filter the data
 * @property {Paging} [paging] - Specifies how the table should be paged
 * @property {Fields} fields - Denotes how each column is to be displayed
 * @property {Array[]|Object[]} data - The data to be tabulated (can be alia.state) (Array of Arrays not tested)
 */

/**
 * Handles the row click event
 * @name RowClick
 * @function
 * @arg {RowClickCallback} cb The callback function that handles row click events
 */

/**
 * This is an argument to the RowClick method
 * @callback RowClickCallback
 * @param {EventObject} event The jQuery click event
 * @param {Object} item The item corresponding to the row that was clicked
 */

/**
 * @typedef {Object} TableObject
 * @property {Accessor} currentItem The currently selected item
 * @property {Accessor} currentRow The currently selected row
 * @property {RowClick} onRowClick A function to register a event on a row click
 */

/**
 * Constructs a table
 * @name doTable
 * @function
 * @arg {Context} ctx The context in which to place the table
 * @arg {TableOptions} options The options for the table
 * @return {TableObject} The table component
 */

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Table Control

alia.defineControl({
    name: 'table'
}, function() {

    var styles = {
        'bordered': 'table-bordered',
        'striped': 'table-striped',
        'hover': 'table-hover',
        'condensed': 'table-condensed'
    };

    function getClass(options) {
        var cls = ['table'];
        var style;
        if (typeof options.style === 'string') {
            style = options.style.split(',')
        } else if (Array.isArray(options.style)) {
            style = options.style;
        }
        if (style) {
            for (var i = 0; i < style.length; i++) {
                if (styles.hasOwnProperty(style[i])) {
                    cls.push(styles[style[i]])
                }
            }
        }
        return cls;
    }

    function doHeader(header, options, body) {
        var cells = [];
        alia.layoutTableRow(header, {}, function(ctx) {
            for (var i = 0; i < options.fields.length; ++i) {
                if (!options.fields[i].hidden) {
                    cells.push(alia.layoutTableCell(ctx, {
                        type: 'heading',
                        sortable: options.sortable
                    }, function(ctx) {
                        alia.doText(ctx, {
                            text: options.fields[i].heading
                        });
                    }).sortOrder);
                }
            }
            if (options.removable === true) {
                alia.layoutTableCell(ctx, {
                    type: 'heading'
                }, function(ctx) {
                    var btn = alia.doButton(ctx, {
                        style: 'link'
                    }).onClick(function(event) {
                        options.data.set([]);
                    });
                    btn.css('padding', '0');
                    alia.doText(btn, {
                        text: ' Delete All '
                    });
                    alia.doIcon(btn, {
                        name: 'remove'
                    });
                });
            }
        });
        return alia.all(cells);
    }

    function doBody(table, body, options, lookup) {
        $('#' + body.id()).empty();
        var len = 0;
        options.data.property('.length').onResolve(function(size) {
            if (size < len) {
                len = size;
            } else {
                for (var i = len; i < size; ++i) {
                    doRow(table, body, options, i, lookup, function(idx) {
                        return function() {
                            var lookupArr = lookup.get();
                            var low = lookupArr.splice(idx, 1)[0];
                            for (var i = 0; i < lookupArr.length; ++i) {
                                if (lookupArr[i] > low) {
                                    lookupArr[i]--;
                                }
                            }
                            lookup.set(lookupArr);
                        }
                    }(i));
                    len++;
                }
            }
        });
    }

    function doRow(table, body, options, rowindex, lookup, onUnresolve) {
        alia.layoutTableRow(body, {
            selectable: options.selectable,
            style: table.currentRow.then(function(value) {
                return (value === rowindex) ? 'info' : '';
            })
        }, function(row) {
            options.data.at(rowindex).onUnresolve(function() {
                $('#' + row.id()).remove();
                onUnresolve();
            });

            // Row click
            if (options.clickable === true) {
                row.css('cursor', 'pointer');
            }
            row.onClick(function(event) {
                table.emitRowClick(options.data.get()[rowindex]);
            });

            // Row selection
            if (options.selectable === true) {
                row.onClick(function(event) {
                    table.currentRow.set(rowindex);
                    table.currentItem.set(options.data.get()[rowindex]);
                });
            }

            for (var i = 0; i < options.fields.length; ++i) {
                doCell(row, options, rowindex, i);
            }

            // Row deletion
            if (options.removable === true) {
                alia.layoutTableCell(row, {}, function(cell) {
                    var btn = alia.doButton(cell, {
                        style: 'link'
                    }).onClick(function(event) {
                        var tempData = options.data.get();
                        tempData.splice(rowindex, 1);
                        options.data.set(tempData);
                    });
                    btn.css('padding', '0');
                    alia.doIcon(btn, {
                        name: 'remove'
                    });
                });
            }
        });
    }

    function doCell(row, options, rowindex, colindex) {
        alia.layoutTableCell(row, {}, function(cell) {
            doCellContents(cell, options, rowindex, colindex);
            if (options.fields[colindex].hidden === true) {
                $('#' + cell.id()).hide();
            }
        });
    }

    function doCellContents(cell, options, rowindex, colindex) {
        var data = options.data;
        var field = options.fields[colindex];

        var contents;
        if (typeof field.map === 'function') {
            contents = data.property('.' + rowindex + field.property).then(field.map);
        } else {
            contents = data.property('.' + rowindex + field.property);
        }

        if (typeof field.editableType === 'string') {
            cell.css('padding', '0');
            switch (field.editableType) {
                case 'number':
                case 'text':
                    alia.doEditableTextbox(cell, {
                        type: field.editableType,
                        text: contents,
                        deferred: false
                    });
                    break;
            }
        } else {
            alia.doText(cell, {
                text: contents
            });
        }
    }

    function resolve(obj, name) {
        if (name.substr(0,1) === '.') {
            name = name.substring(1, name.length);
        }
        if (typeof name === 'string') {
            var names = name.split('.');
            var resolved = obj[names.shift()];
            if (names.length === 0) {
                return resolved;
            } else {
                return resolve(resolved, names.join('.'));
            }
        } else if (typeof name === 'number') {
            return obj[name];
        } else {
            return;
        }
    }

    function defaultCmp(a, b) {
        if (a == b) return 0;
        return (a < b) ? -1 : 1;
    }

    function getCmpFcn(primer, reverse) {
        var dfc = defaultCmp, // closer in scope
            cmp = defaultCmp;
        if (primer) {
            cmp = function(a, b) {
                return dfc(primer(a), primer(b));
            };
        }
        if (reverse === '') {
            return function(a, b) {
                return 0;
            };
        } else if (reverse === 'D') {
            return function(a, b) {
                return -1 * cmp(a, b);
            };
        }
        return cmp;
    }

    function getSortFunctions(sortOrders, options) {
        var fields = options.fields;
        var fcns = [];
        var sortIdx = 0;

        for (var i = 0; i < fields.length; ++i) {
            if (!fields[i].hidden) {
                fcns.push({
                    property: fields[i].property,
                    cmp: getCmpFcn(fields[i].sortPrimer, sortOrders[sortIdx])

                });
                sortIdx++;
            }
        }

        return fcns;
    }

    function manageSort(sortOrders, options, body, lookup, callback) {
        alia.join(sortOrders, options.data, function(arg0, arg1) {
            return [arg0, arg1];
        }).onResolve(function(state) {
            var lookupArr = lookup.get();
            if (lookupArr.length < state[1].length) {
                for (var i = lookupArr.length; i < state[1].length; ++i) {
                    lookupArr[i] = i;
                }
                lookup.set(lookupArr);
            }

            // Preprocess sort functions
            var sortFcns = getSortFunctions(state[0], options);

            lookup.set(performObjectSort(state[1], sortFcns, body, lookup.get()));
            callback();
        });
    }

    function swapDom(body, lookup, i, j) {
        var temp = lookup[i];
        lookup[i] = lookup[j];
        lookup[j] = temp;

        var nodeA = $('#' + body.id() + ' tr:nth-child(' + (i + 1) + ')');
        var nodeB = $('#' + body.id() + ' tr:nth-child(' + (j + 1) + ')');

        var aNextSibling = nodeA.next();
        if (aNextSibling.is(nodeB)) {
            nodeB.insertBefore(nodeA);
        } else {
            nodeA.insertBefore(nodeB);
            nodeB.insertBefore(aNextSibling);
        }
    }

    function partition(data, lookup, sortFcns, body, left, right) {
        var pivotIdx = Math.floor((right + left) / 2),
            i = left,
            j = right;

        while (i <= j) {
            var cmpResult;

            // While data[i] is less than the data at the pivot point
            do {
                if (i == pivotIdx) break;
                for (var sortIdx = 0; sortIdx < sortFcns.length; ++sortIdx) {
                    var resolvedA = resolve(data[lookup[i]], sortFcns[sortIdx].property);
                    var resolvedB = resolve(data[lookup[pivotIdx]], sortFcns[sortIdx].property);

                    // Compare the results
                    cmpResult = sortFcns[sortIdx].cmp(resolvedA, resolvedB);
                    if (cmpResult !== 0) break;
                }
                if (cmpResult < 0) {
                    i++;
                }
            } while (cmpResult < 0);

            // While data[j] is greater than the data at the pivot point
            do {
                if (j == pivotIdx) break;
                for (var sortIdx = 0; sortIdx < sortFcns.length; ++sortIdx) {
                    var resolvedA = resolve(data[lookup[j]], sortFcns[sortIdx].property);
                    var resolvedB = resolve(data[lookup[pivotIdx]], sortFcns[sortIdx].property);

                    // Compare the results
                    cmpResult = sortFcns[sortIdx].cmp(resolvedA, resolvedB);
                    if (cmpResult !== 0) break;
                }
                if (cmpResult > 0) {
                    j--;
                }
            } while (cmpResult > 0);

            if (i <= j) {
                swapDom(body, lookup, i, j);

                // Pivot moves with value
                if (pivotIdx == i) pivotIdx = j;
                else if (pivotIdx == j) pivotIdx = i;

                i++;
                j--;
            }
        }

        return i;
    }

    function quicksort(data, lookup, sortFcns, body, left, right) {
        var index;

        if (data.length > 1) {
            index = partition(data, lookup, sortFcns, body, left, right);

            // Quicksort the left
            if (left < index - 1) {
                quicksort(data, lookup, sortFcns, body, left, index - 1);
            }

            // Quicksort the right
            if (index < right) {
                quicksort(data, lookup, sortFcns, body, index, right);
            }
        }
    }

    function resetOrder(lookup, body) {
        var tempArr = [];
        for (var i = 0; i < lookup.length; ++i) {
            tempArr[lookup[i]] = $('#' + body.id() + ' tr:nth-child(' + (i + 1) + ')');
        }
        for (var i = 0; i < tempArr.length; ++i) {
            $('#' + body.id()).append(tempArr[i]);
        }
    }

    function performObjectSort(data, sortFcns, body, prevLookup) {
        if (prevLookup !== null) {
            resetOrder(prevLookup, body);
        }

        var lookup = [];
        for (var i = 0; i < data.length; ++i) {
            lookup.push(i);
        }
        quicksort(data, lookup, sortFcns, body, 0, data.length - 1);
        return lookup;
    }

    function filter(body, filter) {
        var filtered = [];
        if (filter) {
            $('#' + body.id() + ' tr').each(function(index, value) {
                $(value).show();
                var found = false;
                $(value).children('td').each(function(index, value) {
                    var t = $(value).text();
                    if (t.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        found = true;
                        return false;
                    }
                });
                if (!found) {
                    $(value).hide();
                    filtered.push(index);
                }
            });
        }
        return filtered;
    }

    function filterByColumns(body, filtered, filters) {
        for (var i = 0; i < filters.length; ++i) {
            if (typeof filters[i] === 'string') {
                $('#' + body.id() + ' tr').each(function(index, value) {
                    if (filtered.indexOf(index) < 0) {
                        var elm = $(value).children('td:nth-child(' + (i + 1) + ')');
                        var t = elm.text();
                        if (t.toLowerCase().indexOf(filters[i].toLowerCase()) < 0) {
                            $(value).hide();
                            filtered.push(index);
                        }
                    }
                });
            }
        }

        filtered.sort(function(a, b) {
            return a - b;
        });
    }

    function doPager(pager, body, pageSize, total, filtered) {
        var unfilteredRows = total - filtered.length;
        var pages = Math.ceil(unfilteredRows / pageSize);
        $('#' + pager.id()).empty();
        for (var i = 0; i < pages; ++i) {
            alia.layoutListItem(pager, {}, function(ctx) {
                alia.doLink(ctx, {
                    text: (i + 1) + ''
                }).onClick(function(idx) {
                    return function() {
                        rePage(pager, body, filtered, total, idx, pageSize);
                    }
                }(i));
            })
        }
        rePage(pager, body, filtered, total, 0, pageSize);
    }

    function rePage(pager, body, filtered, total, currentPage, pageSize) {
        $('#' + pager.id() + '.pagination li').removeClass('active');
        $('#' + pager.id() + '.pagination li:nth-child(' + (currentPage + 1) + ')').addClass('active');
        var filterIdx = 0;
        var nextSkip = filtered[filterIdx];
        var itemCount = 0;
        for (var i = 0; i < total; ++i) {
            if (i === nextSkip) {
                nextSkip = filtered[++filterIdx];
                continue;
            }
            if (itemCount < (currentPage * pageSize) || itemCount >= (currentPage + 1) * pageSize) {
                $('#' + body.id() + ' tr:nth-child(' + (i + 1) + ')').css('display', 'none');
            } else {
                $('#' + body.id() + ' tr:nth-child(' + (i + 1) + ')').css('display', 'table-row');
            }
            itemCount++;
        }
    }

    var spin_opts = {
        lines: 9, // The number of lines to draw
        length: 5, // The length of each line
        width: 1.5, // The line thickness
        radius: 2.7, // The radius of the inner circle
        corners: 0.8, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb or array of colors
        speed: 2.2, // Rounds per second
        trail: 45, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        className: 'table-spinner' // The CSS class to assign to the spinner
    };

    return function(options) {
        alia.applyDefaults(options, {
            sortable: false,
            selectable: false,
            removable: false,
            spinner: false,
            clickable: false,
            visible: true
        });

        // Determine class
        var cls = getClass(options);

        // Set up variables
        var selectedPageSize;
        var pager;

        var table = this.append('<table alia-context class=":class"></table>', {
            class: cls.join(' ')
        });

        // Handle selectables
        table.defineProperty('currentItem', null);
        table.defineProperty('currentRow', null);

        // Calculate span
        var span = options.fields.length;
        if (options.removable === true) span++;

        // Create sections of the table
        var header = table.append('<thead alia-context></thead>');
        var body = table.append('<tbody alia-context></tbody>');
        var footer = table.append('<tfoot><tr><td alia-context colspan=":span" class="footer-cell"></td></tr></tfoot>', {
            span: span
        });

        // Set up pager
        if (typeof options.paging === 'object' && typeof options.paging.default === 'number' && Array.isArray(options.paging.options)) {
            alia.layoutUnorderedList(footer, {}, function(pagination) {
                pager = pagination;
                pagination.class('add', 'pagination');
            });

            selectedPageSize = alia.doSelect(footer, {
                selected: options.paging.default,
                options: options.paging.options
            }).class('add', 'pull-right').selected;

            alia.doText(footer, {
                weight: 'bold',
                text: 'Page Size: '
            }).class('add', 'pull-right').css('margin-right', '5px').css('position', 'relative').css('top', '7px');
        }

        // Set up spinner in footer if applicable
        if (options.spinner === true) {
            var target = $('#' + footer.id(''))[0];
            var spinner = new Spinner(spin_opts);

            spinner.spin(target);

            options.data.observe(function(value) {
                spinner.stop();
            }, function() {
                spinner.spin(target);
            }, null);
        }

        // Populate header
        var sortOrders = doHeader(header, options, body);

        // Populate table body
        var lookupArr = [];
        if (typeof options.data.get() !== 'undefined') {
            for (var i = 0; i < options.data.get().length; ++i) {
                lookupArr.push(i);
            }
        }
        var lookup = alia.state(lookupArr);
        doBody(table, body, options, lookup);

        var filters = [];
        for (var i = 0; i < options.fields.length; ++i) {
            if (alia.isAccessor(options.fields[i].filter)) {
                filters.push(options.fields[i].filter);
            } else {
                filters.push(null);
            }
        }
        var observableFilters = alia.all(filters);
        // Perform and manage sort and filters
        manageSort(sortOrders, options, body, lookup, function() {
            // Page table
            if (typeof options.paging === 'object' && typeof options.paging.default === 'number' && Array.isArray(options.paging.options)) {
                alia.all([selectedPageSize, options.data, options.filter, observableFilters]).onResolve(function(value) {
                    var filtered = [],
                        selected = value[0];
                    if (typeof value[2] === 'string') {
                        filtered = filter(body, value[2]);
                    }
                    if (Array.isArray(value[3])) {
                        filterByColumns(body, filtered, value[3]);
                    }
                    if (typeof value[0] !== 'number') {
                        selected = parseInt(value[0]);
                    }
                    doPager(pager, body, selected, value[1].length, filtered);
                });
            }
        });

        table.bindVisible(options.visible);

        // Define events
        table.defineEvent('RowClick');

        return table;
    }
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Table Control

alia.defineControl({
    name: 'propertyTable'
}, function() {

    function doNormalTextDisplay(ctx, field, data) {
        var elm;
        if (typeof field.map === 'function') {
            elm = alia.doText(ctx, {
                text: data.property('.' + field.name).then(field.map)
            });
        } else {
            elm = alia.doText(ctx, {
                text: data.property('.' + field.name)
            });
        }
        elm.class('add', 'normal');
        return elm.width() + 13;
    }

    function doEditableTextDisplay(ctx, field, data, deferred) {
        var elm;
        switch (field.editableType) {
            case 'number':
            case 'text':
                elm = alia.doEditableTextbox(ctx, {
                    type: field.editableType,
                    text: data.property('.' + field.name),
                    deferred: deferred
                }).onSubmit(field.onSubmit);
                break;
            case 'boolean':
                elm = alia.doEditableBoolean(ctx, {
                    type: 'y/n',
                    value: data.property('.' + field.name),
                    map: field.map,
                    deferred: deferred,
                    'default': field.default
                }).onSubmit(field.onSubmit);
                break;
            default:
                throw new Error('Cannot render editable type ' + field.editableType);
        }
        return elm.width();
    }

    function makeListItem(options, field, min, i) {
        return function(item) {
            item.class('add', 'item');
            if (i % 2 == 1) item.class('add', 'item-right');

            alia.layoutDiv(item, {
                classes: 'wrap'
            }, function(wrap) {
                alia.doText(wrap, {
                    text: field.label + ':'
                }).class('add', 'name').class('add', 'text-muted');

                // Check whether field is editable
                if (typeof field.editableType === 'string' && typeof field.onSubmit === 'function') {
                    min = Math.max(doEditableTextDisplay(wrap, field, options.data, options.deferred), min);
                } else {
                    min = Math.max(doNormalTextDisplay(wrap, field, options.data, options.deferred), min);
                }
            });
        };
    }

    function doPropertyList(ctx, options) {
        alia.layoutDiv(ctx, {
            classes: 'property-list,clearfix'
        }, function(container) {
            var min = 0;

            if (options.newLine) {
                container.class('add', 'skinny');
            } else {
                container.onResize(function(width) {
                    if (width < 2 * (min + 150)) {
                        container.class('add', 'skinny');
                    } else {
                        container.class('remove', 'skinny');
                    }
                });
            }

            options.data.onResolve(function() {
                container.empty();
                alia.layoutUnorderedList(container, {}, function(list) {
                    for (var i = 0; i < options.fields.length; ++i) {
                        var field = options.fields[i];

                        alia.layoutListItem(list, {}, makeListItem(options, field, min, i));
                    }
                });
            });
        });
    }

    return function(options) {

        alia.applyDefaults(options, {
            deferred: true
        });

        var div = this.append('<div alia-context></div>');

        doPropertyList(div, options);
    };
}());;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Tabset

alia.defineLayout({
    name: 'tabset',
}, function() {

    var styles = {
        'horizontal': 'horizontal',
        'vertical': 'vertical'
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var style = styles[options.style] || styles.horizontal;
        var content = '';
        if (style === 'horizontal') {
            content =
                '<div class="container-fluid" alia-context>' +
                '  <div class="row">' +
                '    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">' +
                '      <ul alia-context="nav" class="nav nav-tabs"></ul>' +
                '      <div alia-context="content" class="tab-content"></div>' +
                '    </div>' +
                '  </div>' +
                '</div>';
        } else {
            content =
                '<div class="container-fluid" alia-context>' +
                '  <div class="row">' +
                '    <div class="col-lg-3 col-md-3 col-sm-4 col-xs-5">' +
                '      <ul alia-context="nav" class="nav nav-pills nav-stacked"></ul>' +
                '    </div>' +
                '    <div class="col-lg-9 col-md-9 col-sm-8 col-xs-7">' +
                '      <div alia-context="content" class="tab-content"></div>' +
                '    </div>' +
                '  </div>' +
                '</div>';
        }
        var elm = this.append(content);

        // Bind visibility
        elm.bindVisible(options.visible);

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Tab

alia.defineLayout({
    name: 'tab',
}, function() {

    return function(options) {

        // Define properties
        // this.defineProperty('title', options.title);

        // Determine class
        var cls = [];
        if (typeof options.active === 'boolean' && options.active) {
            cls.push('active');
        }

        var content = this.append('content', '<div alia-context class="tab-pane :class"></div>', {
            class: cls.join(' ')
        });

        var nav = this.append('nav', '<li alia-context class=":class"><a data-target=":target" data-toggle="tab" style="cursor:pointer;">:title</a></li>', {
            class: cls.join(' '),
            target: '#' + content.ids[''],
            title: alia.getString(options.title)
        }); // Removed onClick - I don't think it's needed - Kyle

        return content;
    };
}());


// TODO: This element needs to depend on something other than the parent_child_ids to determine type of tab to apply;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Headings

alia.defineLayout({
    name: 'heading'
}, function() {
    var headerTypes = {
        1: 'h1',
        2: 'h2',
        3: 'h3',
        4: 'h4',
        5: 'h5',
        6: 'h6'
    };

    return function(options) {
        // Set default options
        alia.applyDefaults(options, {
            type: 'h1',
            visible: true
        });

        var elm = this.append('<:type alia-context></:type>', {
            type: headerTypes[options.type]
        });

        elm.bindHtml('text', options.text);
        elm.bindVisible(options.visible);

        return elm;
    };
}());

alia.defineControl({
    name: 'heading'
}, function() {
    var headerTypes = {
        1: 'h1',
        2: 'h2',
        3: 'h3',
        4: 'h4',
        5: 'h5',
        6: 'h6'
    };

    return function(options) {
        // Set default options
        alia.applyDefaults(options, {
            type: 'h1',
            visible: true
        });

        var elm = this.append('<:type alia-context></:type>', {
            type: headerTypes[options.type]
        });

        elm.bindHtml('text', options.text);
        elm.bindVisible(options.visible);

        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Link

alia.defineControl({
    name: 'link'
}, function() {
    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var elm = this.append('<a alia-context style="cursor: pointer"></a>');

        if (typeof options.name === 'string') {
            elm.attr('name', options.name);
        }

        elm.bindHtml('text', options.text);
        elm.bindVisible(options.visible);

        return elm
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Text

alia.defineControl({
    name: 'text',
}, function() {

    var weights = {
        'italics': '<em>:text</em>',
        'bold': '<strong>:text</strong>'
    };
    var sizes = {
        'small': '<small>:text</small>'
    };

    var styles = {
        muted: 'text-muted',
        primary: 'text-primary',
        success: 'text-success',
        info: 'text-info',
        warning: 'text-warning',
        danger: 'text-danger'
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        var cls = [];
        if (typeof options.style === 'string' && styles.hasOwnProperty(options.style)) {
            cls.push(styles[options.style]);
        }

        var span = this.append('<span alia-context class=":class"></span>', {
            class: cls.join(' ')
        });

        function render(str) {
            span.empty();
            //var str = alia.get(options.text);
            if (str === undefined) return;
            if (typeof options.filter === 'function') {
                str = options.filter(str);
            }
            if (typeof options.weight === 'string' && weights.hasOwnProperty(options.weight)) {
                str = weights[options.weight].replace(':text', str);
            }
            if (typeof options.size === 'string' && sizes.hasOwnProperty(options.size)) {
                str = sizes[options.size].replace(':text', str);
            }
            span.html(str);
        }

        if (alia.isAccessor(options.text)) {
            options.text.observe(function(value) {
                render(value);
            }, function() {
                render();
            });
        } else {
            render(options.text);
        }

        span.bindVisible(options.visible);

        return span;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Break

alia.defineControl({
    name: 'break',
}, function(options) {
    return this.append('<br />');
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Paragraph

alia.defineControl({
    name: 'paragraph',
}, function() {

    var styles = {
        'lead': 'lead'
    };

    var alignments = {
        'left': 'text-left',
        'center': 'text-center',
        'right': 'text-right',
        'justify': 'text-justify'
    };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Determine class
        var cls = [];
        if (typeof options.style === 'string' && styles.hasOwnProperty(options.style)) {
            cls.push(styles[options.style]);
        }
        if (typeof options.alignment === 'string' && alignments.hasOwnProperty(options.alignment)) {
            cls.push(alignments[options.alignment]);
        }

        // Append button element
        var elm = this.append('<p alia-context class=":class">:text</p>', {
            class: cls.join(' '),
            text: alia.getString(options.text)
        });

        // Create bindings
        elm.bindHtml('text', options.text);
        elm.bindVisible(options.visible);

        // Return component
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Blockquote

alia.defineControl({
    name: 'blockquote'
}, function() {

    var styles = {
        'default': null,
        'reverse': 'blockquote-reverse'
    }

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true,
            style: 'default'
        }, {
            style: styles
        });

        // Append element
        var content =
            '<blockquote alia-context class=":class">' +
            '  <p alia-context="quote"></p>' +
            '</blockquote>';
        var elm = this.append(content, {
            class: _.compact([
                styles[options.style]
            ]).join('')
        });

        // Add footer
        if (options.footer) {
            var foot = elm.append('<footer alia-context></footer>');
            var footer = foot.bindHtml('footer', options.footer);
            elm.defineProperty('footer', footer);
        }

        // Bind html
        elm.bindHtml('quote', 'text', options.text);

        // Return element
        return elm;
    };
}());

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Markdown

alia.defineControl({
    name: 'markdown',
}, function() {

    // var styles = {
    //     'lead': 'lead'
    // };

    // var alignments = {
    //     'left': 'text-left',
    //     'center': 'text-center',
    //     'right': 'text-right',
    //     'justify': 'text-justify'
    // };

    return function(options) {

        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Get markdown converter
        var converter = Markdown.getSanitizingConverter();
        Markdown.Extra.init(converter, {
            highlighter: "highlight",
            table_class: "table table-striped"
        });

        // Append button element
        var elm = this.append('<div alia-context></div>');

        // Generate markdown
        var j = $('#' + elm.id());
        var text = elm.defineProperty('text', options.text)
        text.onResolve(function(value) {
            j.empty();
            var html = converter.makeHtml(value);
            j.append(html);
            $('code').each(function(i, e) {
                hljs.highlightBlock(e);
            });
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, elm.id()]);
        });

        // Create bindings
        elm.bindVisible(options.visible);

        // Return component
        return elm;
    };
}());

alia.defineControl({
    name: 'horizontalRule'
}, function(options) {
    return this.append('<hr />')
});;'use strict';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Widget

alia.defineControl({
    name: 'widget',
}, function() {

    var displays = {
        inlineBlock: 'inline-block'
    }

    var float = {
        'right': 'pull-right',
        'left': 'pull-left'
    };

    return function(options) {
        // Set default options
        alia.applyDefaults(options, {
            visible: true
        });

        // Append div element (for encapsulating widget)
        var div = this.append('<div alia-context></div>');

        if (typeof options.display === 'string' && displays.hasOwnProperty(options.display)) {
            div.css('display', displays[options.display]);
        }
        if (typeof options.margin === 'number') {
            div.css('margin', options.margin + 'px');
        }
        if (typeof options.float === 'string' && float.hasOwnProperty(options.float)) {
            div.class('add', float[options.float]);
        }

        var values = [];

        var set = function(index, value) {
            values[index] = value;
        }

        // Define render function
        function render() {
            for (var i = 0; i < values.length; ++i) {
                if (typeof values[i] === 'undefined') {
                    return;
                }
            }
            div.empty();
            var args = [div];
            for (var i = 0; i < values.length; ++i) {
                args.push(values[i]);
            }
            options.fcn.apply(null, args);
        }

        // Bind to argument changes
        for (var i = 0; i < options.args.length; ++i) {
            if (alia.isAccessor(options.args[i])) {
                values.push(undefined);
                options.args[i].onResolve(function (index) {
                    return function (value) {
                        set(index, value);
                        render();
                    }
                }(i));
            } else {
                values.push(options.args[i]);
            }
        }

        // Render current state
        render();

        div.bindVisible(options.visible);

        // Return component
        return div;
    }
}());;'use strict';

alia.defineProvider({
    name: '$'
}, function() {
    return $;
});;'use strict';

alia.defineProvider({
    name: '$window'
}, function() {
    return window;
});;'use strict';

alia.defineProvider({
	name: '$log',
	dependencies: ['$window']
}, function($window) {

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Private variables

	var debug = true;

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Private functions

	function consoleLog(type) {
		var console = $window.console || {};
		var fcn = console[type] || console.log || alia.noop;
		var hasApply = false;

		// Note: reading fcn.apply throws an error in IE11 in IE8 document mode.
		// The reason behind this is that console.log has type "object" in IE8...
		try {
			hasApply = !!fcn.apply;
		} catch (e) {}

		if (hasApply) {
			return function() {
				var args = [];
				forEach(arguments, function(arg) {
					args.push(formatError(arg));
				});
				return logFn.apply(console, args);
			};
		}

		// we are IE which either doesn't have window.console => this is noop and we do nothing,
		// or we are IE where console.log doesn't have apply so we log at least first 2 args
		return function(arg1, arg2) {
			logFn(arg1, arg2 == null ? '' : arg2);
		};
	}


	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Provider

	return {};
});;alia.defineProvider({
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
            var event = alia.broadcast('locationChangeStarted', [current.absUrl, currBrowserUrl]);
            if (event.isDefaultPrevented()) {
                parse(currBrowserUrl);
            } else {
                browserUrl(current.absUrl);
                alia.broadcast('locationChanged', current.absUrl);
            }
        };
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
    };

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
    };

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

    function search(search, value) {
        switch (arguments.length) {
            case 0:
                return current.search;
            case 1:
                if (alia.isString(search)) {
                    current.search = alia.url.parseQuery(search);
                } else if (alia.isObject(search)) {
                    current.search = search;
                } else {
                    throw new Error('The first argument of the `$location#search()` call must be a string or an object.');
                }
                break;
            default:
                if (alia.isUndefined(value) || value === null) {
                    delete current.search[search];
                } else {
                    current.search[search] = value;
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



    function url(url, replace) {
        if (alia.isUndefined(url)) {
            return current.url;
        }

        var match = pathRegEx.exec(url);
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

    $(window).on('popstate', function(e) {
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
});;alia.defineProvider({
    name: '$route',
    dependencies: ['$', '$location']
}, function($, $location) {

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Private variables

    var routes = {};

    var current = null;

    //var viewport = new Element();
    //var viewport = $('#alia-viewport');

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Private functions

    function load(path) {
        if (routes.hasOwnProperty(current.path)) {
            var route = routes[current.path];
            // console.log(route);
            if (route.workspace) {
                // console.log("$route.load: workspace", current.path);
                current.context = alia.stageWorkspaceContext();
                current.type = 'workspace'
            } else if (route.multiview) {
                // console.log("$route.load: multiview", current.path);
                current.context = alia.stageMultiviewContext();
                current.type = 'multiview'
            } else {
                // console.log("$route.load: view", current.path);
                current.context = alia.stageViewContext();
                current.type = 'view'
            }
            // console.log("resolve");
            alia.resolve(route.dependencies, [current.context], {
                $params: current.params,
                $query: current.query
            }).onResolve(function(args) {
                // console.log("nope");
                route.ctor.apply(null, args);
                if (current.type === 'workspace' && typeof current.query.task === 'string') {
                    var workspace = current.context;
                    var signature = workspace.signature(current.query.task, current.query);
                    if (workspace.currentSignature() !== signature) {
                        workspace.push(current.query.task, current.query);
                    }
                } else if (current.type === 'multiview' && typeof current.query.view === 'string') {
                    var multiview = current.context;
                    var signature = multiview.signature(current.query.view, current.query);
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
            var params = matcher($location.path(), routes[path]);
            if (params) {
                match = {
                    path: path,
                    params: params,
                    query: $location.search()
                };
                break;
            }
        }
        return match;


        // // Match a route
        // var params, match;
        // angular.forEach(routes, function(route, path) {
        //     if (!match && (params = switchRouteMatcher($location.path(), route))) {
        //         match = inherit(route, {
        //             params: angular.extend({}, $location.search(), params),
        //             pathParams: params
        //         });
        //         match.$$route = route;
        //     }
        // });
        // // No route matched; fallback to "otherwise" route
        // return match || routes[null] && inherit(routes[null], {
        //     params: {},
        //     pathParams: {}
        // });
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
        // console.log(url);
        var next = parseRoute();
        if (!current || current.path !== next.path) {
            current = next;
            // console.log("load");
            load();
        } else if (current.type === 'workspace' && typeof next.query.task === 'string') {
            var workspace = current.context;
            var signature = workspace.signature(next.query.task, next.query);
            // console.log("route.update: workspace push", workspace.currentSignature() !== signature);
            if (workspace.currentSignature() !== signature) {
                workspace.push(next.query.task, next.query);
            }
        } else if (current.type === 'multiview' && typeof next.query.view === 'string') {
            var multiview = current.context;
            var signature = multiview.signature(next.query.view, next.query);
            // console.log("route.update: multiview push", multiview.currentSignature() !== signature);
            if (multiview.currentSignature() !== signature) {
                // console.log(next.query);
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
            // console.log("loading");
            // console.log(opts);
            //load(opts.path);
            // console.log(opts.path);
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
});;'use strict';

alia.defineProvider({
    name: '$request',
    dependencies: ['$']
}, function($) {

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Private functions

    function compose(url, params, query) {
        for (var p in params) {
            url = url.replace(':' + p, params[p]);
        }
        var q = [];
        if (Array.isArray(query)) {
            for (var i = 0; i < query.length; ++i) {
                if (query[i].hasOwnProperty('key') && query[i].hasOwnProperty('value')) {
                    q.push(query[i].key + '=' + query[i].value);
                }
            }
        } else {
            for (var p in query) {
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

    // function fromAjax(ajax, verbose) {
    //     return Bacon.fromBinder(function(sink) {
    //         ajax.then(function(data, textStatus, jqXHR) {
    //             if (verbose === true) {
    //                 return sink({
    //                     body: data,
    //                     status: textStatus,
    //                     res: jqXHR
    //                 });
    //             } else {
    //                 return sink(data);
    //             }
    //         }, function(jqXHR, textStatus, errorThrown) {
    //             return sink(new Bacon.Error(jqXHR));
    //         });
    //         return function() {};
    //     });
    // };

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
                reject(new Bacon.Error(res));
            });
        });

        // return Bacon.fromBinder(function(sink) {
        //     promise.then(function(data, textStatus, jqXHR) {
        //         sink({
        //             body: data,
        //             status: textStatus,
        //             statusCode: jqXHR.status,
        //             xhr: jqXHR
        //         });
        //     }, function(jqXHR, textStatus, errorThrown) {
        //         var res = {
        //             error: errorThrown,
        //             status: textStatus,
        //             statusCode: jqXHR.status,
        //             xhr: jqXHR
        //         };
        //         var event = alia.broadcast('requestError', [res]);
        //         if (event.defaultPrevented) {
        //             //parse(currBrowserUrl);
        //         } else {
        //             //subject.onError(res);
        //         }
        //         sink(new Bacon.Error(res));
        //     });
        // });
    };

    $request.get = function(url, params, query) {
        return $request({
            url: url,
            method: 'GET',
            params: params,
            query: query
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
            json: body
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