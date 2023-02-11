from helpers import LogHelpers
import logging
from orthancRestApi import OrthancClient

client = OrthancClient('http://localhost:8042')
instanceIds = client.getRequest('/instances')

for instanceId in instanceIds:
	frameIndexes = client.getRequest('/instances/' + instanceId + '/frames')
	for frameIndex in frameIndexes:
		client.getRequest('/osimis-viewer/images/cleancache/'+str(instanceId)+'/'+str(frameIndex)+'/high-quality')
		client.getRequest('/osimis-viewer/images/cleancache/'+str(instanceId)+'/'+str(frameIndex)+'/medium-quality')
		client.getRequest('/osimis-viewer/images/cleancache/'+str(instanceId)+'/'+str(frameIndex)+'/low-quality')
		client.getRequest('/osimis-viewer/images/cleancache/'+str(instanceId)+'/'+str(frameIndex)+'/pixeldata-quality')
