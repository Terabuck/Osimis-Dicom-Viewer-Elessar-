chai.config.includeStack = true;;

xdescribe('size', function() {

    describe('directive', function() {
        
        osi.beforeEach();
        osi.afterEach();

        it('could set a specific width and height', function() {
            $rootScope.opts = {
              width: '100px',
              height: '70px'
            };

            var element = osi.directive('<div wv-size="opts"></div>');
            
            expect(element.width(), 'width').to.be.closeTo(+$rootScope.opts.width.replace('px', ''), 1);
            expect(element.height(), 'height').to.be.closeTo(+$rootScope.opts.height.replace('px', ''), 1);
        });

        it('could set a specific width and scale height', function() {
            $rootScope.opts = {
                width: '100px',
                height: 1/3
            };

            var element = osi.directive('<div wv-size="opts"></div>');
            
            osi.digest();

            expect(element.width(), 'width').to.be.closeTo(+$rootScope.opts.width.replace('px', ''), 1);
            expect(element.height(), 'height').to.be.closeTo(+$rootScope.opts.width.replace('px', '') * (1/3), 1);
        });

        it('could set a specific height and scale width', function() {
            $rootScope.opts = {
                height: '100px',
                width: 1/3,
            };

            var element = osi.directive('<div wv-size="opts"></div>');
            
            osi.digest();

            expect(element.height(), 'height').to.be.closeTo(+$rootScope.opts.height.replace('px', ''), 1);
            expect(element.width(), 'width').to.be.closeTo(+$rootScope.opts.height.replace('px', '') * (1/3), 1);
        });

        it('could set the width and height of its first ancestor having wv-size-tag', function() {
            $rootScope.opts = {
                width: '[wv-size-tag]',
                height: '[wv-size-tag]'
            };

            var element = osi.directive([
                '<div style="width: 100px; height: 200px;" wv-size-tag>',
                    '<div wv-size="opts">',
                    '</div>',
                '</div>'
            ].join(''));

            expect(element.children().height(), 'height').to.be.closeTo(200, 1);
            expect(element.children().width(), 'width').to.be.closeTo(100, 1);
        });
        
        it('could set the same height of its first ancestor having wv-size-tag and scale the width', function() {
            $rootScope.opts = {
                height: '[wv-size-tag]',
                width: 1/3
            };

            var element = osi.directive([
                '<div style="height: 100px;" wv-size-tag>',
                    '<div wv-size="opts">',
                    '</div>',
                '</div>'
            ].join(''));

            expect(element.children().height(), 'height').to.be.closeTo(100, 1);
            expect(element.children().width(), 'width').to.be.closeTo(100 * (1/3), 1);
        });
        
        it('could set the width of its first ancestor having wv-size-tag and scale the height', function() {
            $rootScope.opts = {
                width: '[wv-size-tag]',
                height: 1/3
            };

            var element = osi.directive([
                '<div style="width: 100px;" wv-size-tag>',
                    '<div wv-size="opts">',
                    '</div>',
                '</div>'
            ].join(''));

            expect(element.children().width(), 'width').to.be.closeTo(100, 1);
            expect(element.children().height(), 'height').to.be.closeTo(100 * (1/3), 1);
        });

        it('should react to window change', function() {
            $rootScope.opts = {
                width: '[wv-size-tag]',
                height: 1/3
            };

            var element = osi.directive([
                '<div style="width: 50px" wv-size-tag>',
                    '<div wv-size="opts">',
                    '</div>',
                '</div>'
            ].join(''));

            // expect normal value
            expect(element.children().width(), 'width').to.be.closeTo(50, 1);
            expect(element.children().height(), 'height').to.be.closeTo(50 * (1/3), 1);
            
            // double the width
            element.width('100px'); 

            // expect no change - they are not yet propagated (waiting window#resize)
            expect(element.children().width(), 'width').to.be.closeTo(50, 1);
            expect(element.children().height(), 'height').to.be.closeTo(50 * (1/3), 1);
            
            // expect changes once window is resized
            $(window).resize();
            osi.flush(); // flush _.debounce's set timeout..
            
            expect(element.children().width(), 'width').to.be.closeTo(100, 1); // expect the width to have doubled
            expect(element.children().height(), 'height').to.be.closeTo(100 * (1/3), 1);
        });
        
        xit('should not trigger useless reflows', function() {
          // a bit hard to test on headless browsers :)
          expect(true).to.be.false;
        });
    });

    describe('directive\'s controller', function() {

        beforeEach(function() {
            bard.appModule('webviewer');

            bard.inject(this, '$compile', '$httpBackend', '$rootScope', '$timeout');

            _.forEach(orthanc.raw, function(data, path) {
              $httpBackend
                .when('GET', '/' + path)
                .respond(data);
            });
        });

        it('could set a specific width and height', function() {
            $rootScope.opts = {
              width: '100px'
            };

            var element = osi.directive('<div wv-size="opts"></div>');
            var ctrl = element.controller('wvSize');
            
            ctrl.setHeight('70px');

            expect(element.width(), 'width').to.be.closeTo(+$rootScope.opts.width.replace('px', ''), 1);
            expect(element.height(), 'height').to.be.closeTo(+70, 1);
        });

        it('could set a specific width and scale height', function() {
            $rootScope.opts = {
                width: '100px'
            };

            var element = osi.directive('<div wv-size="opts"></div>');
            var ctrl = element.controller('wvSize');
            
            ctrl.setHeight(1/3);

            expect(element.width(), 'width').to.be.closeTo(+$rootScope.opts.width.replace('px', ''), 1);
            expect(element.height(), 'height').to.be.closeTo(+$rootScope.opts.width.replace('px', '') * (1/3), 1);
        });

        it('could set a specific height and scale width', function() {
            $rootScope.opts = {
                height: '100px'
            };

            var element = osi.directive('<div wv-size="opts"></div>');
            var ctrl = element.controller('wvSize');

            ctrl.setWidth(1/3);

            
            // expect the scope variable to have been updated
            expect($rootScope.opts.width).to.be.closeTo(1/3, 1);
            expect(element.height(), 'height').to.be.closeTo(+$rootScope.opts.height.replace('px', ''), 1);
            expect(element.width(), 'width').to.be.closeTo(+$rootScope.opts.height.replace('px', '') * (1/3), 1);
        });

        it('could set the same height of its first ancestor having wv-size-tag and scale the width', function() {
            $rootScope.opts = {
                height: '[wv-size-tag]'
            };

            var element = osi.directive([
                '<div style="height: 100px" wv-size-tag>',
                    '<div wv-size="opts">',
                    '</div>',
                '</div>'
            ].join(''));
            var ctrl = element.children('[wv-size]').controller('wvSize');

            ctrl.setWidth(1/3);
            
            // expect the scope var to have been updated
            expect($rootScope.opts.width).to.be.closeTo(1/3, 1);
            expect(element.children().height(), 'height').to.be.closeTo(100, 1);
            expect(element.children().width(), 'width').to.be.closeTo(100 * (1/3), 1);
        });
        
        it('could set the width of its first ancestor having wv-size-tag and scale the height', function() {
            $rootScope.opts = {
                width: '[wv-size-tag]'
            };

            var element = osi.directive([
                '<div style="width: 100px" wv-size-tag>',
                    '<div wv-size="opts">',
                    '</div>',
                '</div>'
            ].join(''));
            var ctrl = element.children('[wv-size]').controller('wvSize');

            ctrl.setHeight(1/3);

            // expect the scope var to have been updated
            expect($rootScope.opts.height).to.be.closeTo(1/3, 1);
            expect(element.children().width(), 'width').to.be.closeTo(100, 1);
            expect(element.children().height(), 'height').to.be.closeTo(100 * (1/3), 1);
        });

        it('could listen to size changes', function() {
            $rootScope.opts = {
                width: '100px',
                height: '100px'
            };

            // init directive
            var element = osi.directive('<div wv-size="opts"></div>');
            var ctrl = element.controller('wvSize');

            // listen to size updates
            var onUpdateCallback = sinon.spy();
            var unlisten = ctrl.onUpdate(onUpdateCallback);

            // check if the listener is called
            $rootScope.opts.width = '100px'; // no change
            osi.digest();
            expect(onUpdateCallback.callCount).to.equal(0);

            $rootScope.opts.width = '200px'; // one change
            osi.digest();
            expect(onUpdateCallback.callCount).to.equal(1);

            $rootScope.opts.width = '150px'; // two changes
            $rootScope.opts.height = 2;
            osi.digest();
            expect(onUpdateCallback.callCount).to.equal(2);

            // check if unlistening work
            unlisten();
            $rootScope.opts.width = '33px'; // one change
            osi.digest();
            expect(onUpdateCallback.callCount).to.equal(2); // no new listener trigger
        });

        it('could return size in pixels', function() {
            $rootScope.opts = {
                width: '[wv-size-tag]',
                height: '100px'
            };

            // init directive
            var element = osi.directive([
                '<div style="width: 200px" wv-size-tag>',
                    '<div wv-size="opts">',
                    '</div>',
                '</div>'
            ].join(''));
            var ctrl = element.children('[wv-size]').controller('wvSize');

            // check if the size is in pixel
            // @note this may trigger reflow !
            var width = ctrl.getWidthInPixel();
            var height = ctrl.getHeightInPixel();

            expect(width).to.equal(200);
            expect(height).to.equal(100);
        });
    });

});