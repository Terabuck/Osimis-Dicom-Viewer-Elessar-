from helpers import LogHelpers
import logging
from orthancRestApi import OrthancClient

client = OrthancClient('http://localhost:8042')
instanceIds = client.getRequest('/instances')

for instanceId in instanceIds:
	frameIndexes = client.getRequest('/instances/' + instanceId + '/frames')
	for frameIndex in frameIndexes:
		client.getRequest('/nuks/'+str(instanceId)+'/'+str(frameIndex)+'/resize:150/8bit/jpeg:100/klv')
		client.getRequest('/nuks/'+str(instanceId)+'/'+str(frameIndex)+'/resize:1000/8bit/jpeg:100/klv')
		client.getRequest('/nuks/'+str(instanceId)+'/'+str(frameIndex)+'/8bit/jpeg:100/klv')
