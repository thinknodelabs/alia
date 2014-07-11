/* Alia.js (utils.js)
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


}(window.alia = window.alia || {}));