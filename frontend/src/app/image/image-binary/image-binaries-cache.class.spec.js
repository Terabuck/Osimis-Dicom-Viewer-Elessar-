describe('image binary', function() {

    describe('cache', function() {
        
        it('shall cache a request', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create a fake image download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.resolve();

            // Cache the fake request
            cache.add(imageId, quality, request);

            // Except the cached request to be available
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, request, "Retrieved request should equal original request");
        });

        it('shall let failed requests be removed', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create a fake failed image download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.reject();

            // Cache the fake request
            cache.add(imageId, quality, request);

            // Wait for the request to fail
            // @note It's up to the user of the cache to remove the request when
            // the request has failed
            return request
                .then(function() {
                    assert(false, "Request should fail");
                }, function(err) {
                    // Once request has failed,
                    // Remove request from cache
                    cache.remove(imageId, quality);

                    // Except the request to not be cached
                    var cachedRequest = cache.get(imageId, quality);
                    assert.equal(cachedRequest, null, "Failed request should not be cached");
                });
        });
        
        it('shall prevent to cache an already cached request', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.resolve();

            // Cache the fake request
            cache.add(imageId, quality, request);

            // Cache the fake request a second time
            var hasThrown = false;
            try {
                cache.add(imageId, quality, request);
            }
            catch(e) {
                hasThrown = true;
            }

            // Check the second caching has thrown
            assert.equal(hasThrown, true, "Should have thrown");
        });

        it('shall cache lossless & pixeldata quality images in the same scope', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake lossless image 400mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOSSLESS;
            var request = Promise.resolve();
            var requestSize = 1024*1024*400; // 400mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Create & cache a fake pixeldata image 400mo download request
            var imageId2 = 'yyy';
            var quality2 = osimis.quality.PIXELDATA;
            var request2 = Promise.resolve();
            var requestSize2 = 1024*1024*400; // 400mo
            cache.add(imageId2, quality2, request2); // cache the fake request
            cache.setBinarySize(imageId2, quality2, requestSize2); // set the request size as more than max cache size

            // Flush the cache
            // @note There is no constraint over the flushing priority in this case
            cache.flush();

            // Check one of the request is still in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, null, "Request should have been flushed");

            // Check the other is not
            var cachedRequest2 = cache.get(imageId2, quality2);
            assert.equal(cachedRequest2, request2, "Request should not have been flushed");
        });
    });

    describe('cache flush', function() {

        it('should remove low quality images when total LQ cache > 300mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 301mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.resolve();
            var requestSize = 1024*1024*301; // 301mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is no longer in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, null, "Request should have been flushed");
        });

        it('shall keep low quality images when total LQ cache < 300mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 299mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.resolve();
            var requestSize = 1024*1024*299; // 299mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is still in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, request, "Request should not have been flushed");
        });

        it('should remove medium quality images when total MQ cache > 700mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 701mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.MEDIUM;
            var request = Promise.resolve();
            var requestSize = 1024*1024*701; // 701mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is no longer in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, null, "Request should have been flushed");
        });

        it('shall keep medium quality images when total MQ cache < 700mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 699mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.MEDIUM;
            var request = Promise.resolve();
            var requestSize = 1024*1024*699; // 699mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is still in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, request, "Request should not have been flushed");
        });

        it('should remove lossless quality images when total HQ cache > 700mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 701mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOSSLESS;
            var request = Promise.resolve();
            var requestSize = 1024*1024*701; // 701mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is no longer in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, null, "Request should have been flushed");
        });

        it('shall keep lossless quality images when total HQ cache < 700mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 699mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOSSLESS;
            var request = Promise.resolve();
            var requestSize = 1024*1024*699; // 699mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is still in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, request, "Request should not have been flushed");
        });

        it('should remove pixeldata quality images when total HQ cache > 700mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 701mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.PIXELDATA;
            var request = Promise.resolve();
            var requestSize = 1024*1024*701; // 701mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is no longer in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, null, "Request should have been flushed");
        });

        it('shall keep pixeldata quality images when total HQ cache < 700mo', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 699mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.PIXELDATA;
            var request = Promise.resolve();
            var requestSize = 1024*1024*699; // 699mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Flush the cache
            cache.flush();

            // Check the request is still in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, request, "Request should not have been flushed");
        });

        it('should not erase the entire cache', function() {
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 150mo download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.resolve();
            var requestSize = 1024*1024*150; // 300mo
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Create & cache a second fake image 150mo download request
            var imageId2 = 'yyy';
            var quality2 = osimis.quality.LOW;
            var request2 = Promise.resolve();
            var requestSize2 = 1024*1024*150; // 300mo
            cache.add(imageId2, quality2, request2); // cache the fake request
            cache.setBinarySize(imageId2, quality2, requestSize2); // set the request size as more than max cache size
            
            // Flush the cache
            // @note There is no constraint over the flushing priority in this case
            cache.flush();

            // Check one of the request is still in cache
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, null, "Heavy request should have been flushed");

            // Check the other is not
            // @note Request2 might get flushed as well in this case (since it might get flushed prior to the big one),
            //       this assert is not a constraint but just for test
            var cachedRequest2 = cache.get(imageId2, quality2);
            assert.notEqual(cachedRequest2, null, "The flush shouldn't affect the whole cache");
        });

        it('shall let the user locks a request from flushing', function() {
            // see risk
            // When a study total size is larger than the cache max size, its preloading
            // overloads the caching mechanism.
            
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 10go download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.resolve();
            var requestSize = 1024*1024*1024*10; // 10go
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Lock the request
            cache.push(imageId, quality);
            cache.push(imageId, quality);
            cache.pop(imageId, quality);            

            // Flush cache
            cache.flush()

            // Request should still be cached
            var cachedRequest = cache.get(imageId, quality);
            assert.notEqual(cachedRequest, null, "The flush shouldn't removed locked requests");

            // Unlock the request
            cache.pop(imageId, quality);
        });

        it('shall let the user unlocks a request from flushing', function() {
            // see risk
            // When a study total size is larger than the cache max size, its preloading
            // overloads the caching mechanism.
            
            // Create a cache
            var cache = new osimis.ImageBinariesCache();

            // Create & cache a fake image 10go download request
            var imageId = 'xxx';
            var quality = osimis.quality.LOW;
            var request = Promise.resolve();
            var requestSize = 1024*1024*1024*10; // 10go
            cache.add(imageId, quality, request); // cache the fake request
            cache.setBinarySize(imageId, quality, requestSize); // set the request size as more than max cache size

            // Lock the request
            cache.push(imageId, quality);

            // Unlock the request
            cache.pop(imageId, quality);

            // Flush cache
            cache.flush()

            // Request should not be cached anymore
            var cachedRequest = cache.get(imageId, quality);
            assert.equal(cachedRequest, null, "The flush shouldn't removed locked requests");
        });
    });
});