/*
 * Alia Unit Tests
 *
 * Author(s):  Kyle Burnett <kburnett@dotdecimal.com>
 *
 * Copyright:  (c) 2014 .decimal, Inc. All rights reserved.
 */

describe('alia', function() {

    it('should contain the correct starting properties', function() {
        expect(alia).to.include.keys('version', 'viewport', 'alerts', 'header', 'url');
        expect(alia.viewport).to.have.property('ids').and.to.be.an.object;
        expect(alia.alerts).to.have.property('ids').and.to.be.an.object;
        expect(alia.header).to.have.property('ids').and.to.be.an.object;
    });

    it('should respond to static methods', function() {
        var staticMethods = ['defineControl', 'defineHeader', 'defineLayout', 'defineMultiview',
                             'defineProvider', 'resolve', 'defineService', 'defineView'];
        for (var i = 0; i < staticMethods.length; ++i) {
            expect(alia).itself.to.respondTo(staticMethods[i]);
        }
    });
});