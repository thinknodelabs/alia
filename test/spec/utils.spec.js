/*
 * Utils Unit Tests
 *
 * Author(s):  Kyle Burnett <kburnett@dotdecimal.com>
 *
 * Copyright:  (c) 2014 .decimal, Inc. All rights reserved.
 */

describe('utils', function() {

    describe('alia.isArray()', function() {
        it('should return true if the values are arrays', function() {
            var arr1 = [];
            var arr2 = [1,2,3];
            var arr3 = [];
            arr3.push(1);
            arr3.push(2);
            arr3.push(3);
            var arr4 = [];
            arr4[2] = 3;
            var arr5 = new Array();
            var arr6 = new Array(3);
            expect(alia.isArray(arr1)).to.be.true;
            expect(alia.isArray(arr2)).to.be.true;
            expect(alia.isArray(arr3)).to.be.true;
            expect(alia.isArray(arr4)).to.be.true;
            expect(alia.isArray(arr5)).to.be.true;
            expect(alia.isArray(arr6)).to.be.true;
        });

        it('should return false if the values are not arrays', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = null;
            var value4 = undefined;
            var value5 = {};
            var value6 = document.body;
            var value7 = 'string';
            expect(alia.isArray(value1)).to.be.false;
            expect(alia.isArray(value2)).to.be.false;
            expect(alia.isArray(value3)).to.be.false;
            expect(alia.isArray(value4)).to.be.false;
            expect(alia.isArray(value5)).to.be.false;
            expect(alia.isArray(value6)).to.be.false;
            expect(alia.isArray(value7)).to.be.false;
        });
    });

    describe('alia.isArrayLike()', function() {
        it('should return true if the object is array-like', function() {
            var arr1 = [];
            var arr2 = [1,2,3];
            var arr3 = [];
            arr3.push(1);
            arr3.push(2);
            arr3.push(3);
            var arr4 = [];
            arr4[2] = 3;
            var arr5 = new Array();
            var arr6 = new Array(3);
            var arr7 = 'string';
            var arr8 = {
                length: 0
            };
            var arr9 = {
                0: 'one',
                length: 1
            };
            expect(alia.isArrayLike(arr1)).to.be.true;
            expect(alia.isArrayLike(arr2)).to.be.true;
            expect(alia.isArrayLike(arr3)).to.be.true;
            expect(alia.isArrayLike(arr4)).to.be.true;
            expect(alia.isArrayLike(arr5)).to.be.true;
            expect(alia.isArrayLike(arr6)).to.be.true;
            expect(alia.isArrayLike(arr7)).to.be.true;
            expect(alia.isArrayLike(arr8)).to.be.true;
            expect(alia.isArrayLike(arr9)).to.be.true;
        });

        it('should return false if the object is not array-like', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = null;
            var value4 = {};
            var value5 = {
                2: 'two',
                length: 1
            };
            expect(alia.isArrayLike(value1)).to.be.false;
            expect(alia.isArrayLike(value2)).to.be.false;
            expect(alia.isArrayLike(value3)).to.be.false;
            expect(alia.isArrayLike(value4)).to.be.false;
            expect(alia.isArrayLike(value5)).to.be.false;
        });
    });

    describe('alia.isDefined()', function() {
        it('should return true if the value is defined', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = 'string';
            var value4 = null;
            var value5 = {};
            var value6 = [];
            expect(alia.isDefined(value1)).to.be.true;
            expect(alia.isDefined(value2)).to.be.true;
            expect(alia.isDefined(value3)).to.be.true;
            expect(alia.isDefined(value4)).to.be.true;
            expect(alia.isDefined(value5)).to.be.true;
            expect(alia.isDefined(value6)).to.be.true;
        });

        it('should return false if the value is not defined', function() {
            var value1 = undefined;
            expect(alia.isDefined(value1)).to.be.false;
        });
    });

    describe('alia.isNull()', function() {
        it('should return true if the value is null', function() {
            var value1 = null;
            expect(alia.isNull(value1)).to.be.true;
        });

        it('should return false if the value is not null', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = 'string';
            var value4 = undefined;
            var value5 = {};
            var value6 = [];
            expect(alia.isNull(value1)).to.be.false;
            expect(alia.isNull(value2)).to.be.false;
            expect(alia.isNull(value3)).to.be.false;
            expect(alia.isNull(value4)).to.be.false;
            expect(alia.isNull(value5)).to.be.false;
            expect(alia.isNull(value6)).to.be.false;
        });
    });

    describe('alia.isNotNull()', function() {
        it('should return true if the the value is not null', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = 'string';
            var value4 = undefined;
            var value5 = {};
            var value6 = [];
            expect(alia.isNotNull(value1)).to.be.true;
            expect(alia.isNotNull(value2)).to.be.true;
            expect(alia.isNotNull(value3)).to.be.true;
            expect(alia.isNotNull(value4)).to.be.true;
            expect(alia.isNotNull(value5)).to.be.true;
            expect(alia.isNotNull(value6)).to.be.true;
        });

        it('should return false if the value is null', function() {
            var value1 = null;
            expect(alia.isNotNull(value1)).to.be.false;
        });
    });

    describe('alia.isObject()', function() {
        it('should return true if the value is an object', function() {
            var value1 = {};
            var value2 = [];
            expect(alia.isObject(value1)).to.be.true;
            expect(alia.isObject(value2)).to.be.true;
        });

        it('should return false if the value is not an object', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = 'string';
            var value4 = null;
            var value5 = undefined;
            expect(alia.isObject(value1)).to.be.false;
            expect(alia.isObject(value2)).to.be.false;
            expect(alia.isObject(value3)).to.be.false;
            expect(alia.isObject(value4)).to.be.false;
            expect(alia.isObject(value5)).to.be.false;
        });
    });

    describe('alia.isString()', function() {
        it('should return true if the value is a string', function() {
            var value1 = 'string';
            expect(alia.isString(value1)).to.be.true;
        });

        it('should return false if the value is not a string', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = undefined;
            var value4 = null;
            var value5 = {};
            var value6 = [];
            expect(alia.isString(value1)).to.be.false;
            expect(alia.isString(value2)).to.be.false;
            expect(alia.isString(value3)).to.be.false;
            expect(alia.isString(value4)).to.be.false;
            expect(alia.isString(value5)).to.be.false;
            expect(alia.isString(value6)).to.be.false;
        });
    });

    // describe('alia.isEmptyString()', function() {
    //     it('should return true if the value is an empty string', function() {
    //         var value1 = '';
    //         expect(alia.isEmptyString(value1)).to.be.true;
    //     });

    //     it('should return false if the value is not an empty string', function() {
    //         var value1 = true;
    //         var value2 = 1;
    //         var value3 = undefined;
    //         var value4 = null;
    //         var value5 = {
    //             length: 0
    //         };
    //         var value6 = [];
    //         var value7 = 'string';
    //         expect(alia.isString(value1)).to.be.false;
    //         expect(alia.isString(value2)).to.be.false;
    //         expect(alia.isString(value3)).to.be.false;
    //         expect(alia.isString(value4)).to.be.false;
    //         // expect(alia.isString(value5)).to.be.false;
    //         expect(alia.isString(value6)).to.be.false;
    //         expect(alia.isString(value7)).to.be.false;
    //     });
    // });

    // describe('alia.isNotEmptyString()', function() {

    // });

    describe('alia.isUndefined()', function() {
        it('should return true if the value is undefined', function() {
            var value1 = undefined;
            expect(alia.isDefined(value1)).to.be.false;
        });

        it('should return false if the value is not defined', function() {
            var value1 = true;
            var value2 = 1;
            var value3 = 'string';
            var value4 = null;
            var value5 = {};
            var value6 = [];
            expect(alia.isDefined(value1)).to.be.true;
            expect(alia.isDefined(value2)).to.be.true;
            expect(alia.isDefined(value3)).to.be.true;
            expect(alia.isDefined(value4)).to.be.true;
            expect(alia.isDefined(value5)).to.be.true;
            expect(alia.isDefined(value6)).to.be.true;
        });
    });

    describe('alia.isWindow()', function() {

    });

    describe('alia.int()', function() {

    });

    describe('alia.lowercase()', function() {

    });

    describe('alia.noop()', function() {

    });

});