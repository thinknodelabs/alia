/*
 * Url Unit Tests
 *
 * Author(s):  Kyle Burnett <kburnett@dotdecimal.com>
 *
 * Copyright:  (c) 2014 .decimal, Inc. All rights reserved.
 */

describe('url', function() {

    describe('#encodePath()', function() {
        it('should encode the provided path', function() {
            var path = 'path/to/something';
            expect(alia.url.encodePath(path)).to.eql(path);
        });
    });

    describe('#encodeUriSegment()', function() {

    });

    describe('#encodeUriQuery()', function() {

    });

    describe('#isSameOrigin()', function() {

    });

    describe('#parseQuery()', function() {

    });

    describe('#resolve()', function() {

    });

    describe('#toQueryString()', function() {

    });

    describe('#tryDecodeURIComponent()', function() {

    });

});