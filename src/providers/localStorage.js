/* localStorage Provider
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
}(alia));