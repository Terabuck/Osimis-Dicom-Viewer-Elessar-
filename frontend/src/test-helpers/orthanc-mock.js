window.orthanc = (function(orthanc) {
    
	orthanc.studies = {
		withMultiFrameInstances: orthanc.raw['studies/4eddbf0e-719f42fb-4c6cea20-a778371c-51868ee5']
	};
	orthanc.seriesList = {
		with2SingleFrameInstances: orthanc.raw['series/a14c33b2-f2c9488a-bde0f4c6-8d4abde2-5bdf3c74'],
		with2MultiFrameInstances: orthanc.raw['series/a763443a-c8e1bc0a-c557ae4f-ed8acaf3-7a526448']
	};
	
	orthanc.sortedInstances = {
		with2SingleFrameInstances: orthanc.raw['series/a14c33b2-f2c9488a-bde0f4c6-8d4abde2-5bdf3c74/ordered-slices'],
		with2MultiFrameInstances: orthanc.raw['series/a763443a-c8e1bc0a-c557ae4f-ed8acaf3-7a526448/ordered-slices']
	};

	orthanc.firstInstanceOf = {
		'a14c33b2-f2c9488a-bde0f4c6-8d4abde2-5bdf3c74': orthanc.raw['instances/0c5e8dff-34e6361f-f0fbb147-1f7c0ef8-e1dd726d'],
		'a763443a-c8e1bc0a-c557ae4f-ed8acaf3-7a526448': orthanc.raw['instances/b4315b65-8cd20f50-036c510c-6776a8e0-b515e775']
	}

	orthanc.instances = {
		withSingleFrame: orthanc.raw['instances/27b24a79-6ef843d4-1e014566-4cb06360-2b9eda28'],
		with30Frames: orthanc.raw['instances/0d76c26b-1e36515d-0fec1815-7db3052a-1c5c5d6e']
	}

	orthanc.instancePixels = {
		singleFrame: orthanc.raw['web-viewer/instances/jpeg95-27b24a79-6ef843d4-1e014566-4cb06360-2b9eda28_0'],
		// firstMultiFrame: orthanc.raw['web-viewer/instances/jpeg95-27b24a79-6ef843d4-1e014566-4cb06360-2b9eda28_0'],
		multiFrame: [
			orthanc.raw['web-viewer/instances/jpeg95-0d76c26b-1e36515d-0fec1815-7db3052a-1c5c5d6e_0'],
			orthanc.raw['web-viewer/instances/jpeg95-0d76c26b-1e36515d-0fec1815-7db3052a-1c5c5d6e_1']
		]
	}

	return orthanc;
})(window.orthanc || {});