# Benchmark orthanc by parsing its output

from datetime import datetime, timedelta
import math, re
from collections import OrderedDict
import time


class BenchmarkCaseTrial(OrderedDict):
    # BenchmarkCaseTrial['TOTAL_CLIENT_TIME'] = TOTAL_CLIENT_TIME_IN_MS
    # BenchmarkCaseTrial['<CPP_BENCH_NAME>'] = CPP_BENCH_IN_MS

    # contains data relative to the processed image
    # does not contain benchmark

    def __init__(self, server, restClient, relativeURL, gzip=False):
        super().__init__()

        self._frameInfo = OrderedDict()
        self._gzip = gzip

        headers = None
        if self._gzip is True: 
            headers = {"Accept-Encoding": "gzip"}

        print("NEW REQUEST: " + relativeURL)

        # listen to orthanc output
        server.setStdoutCallback(lambda msg: self.__onOrthancStdout(msg))

        # trigger rest request and time it
        start = datetime.now()
        restClient.getRequest(relativeURL)
        end = datetime.now()

        # Wait for the output thread to do its job
        # @todo do better
        time.sleep(1)

        # store the total bench timing as the TOTAL_CLIENT_TIME key
        timeDelta = end - start
        self['TOTAL_CLIENT_TIME'] = math.ceil(
            timeDelta.days * 86400000 + timeDelta.seconds * 1000 + timeDelta.microseconds / 1000)

        # unlisten orthanc output
        server.setStdoutCallback(None)

    def __onOrthancStdout(self, msg):
        # retrieve & parse BENCH marker from orthanc output
        matchs = re.match(r"BENCH: (?:(\w+) (\d+)|(\[\w+\]) (.+))$", msg)
        if matchs:
            name = matchs.group(1) or matchs.group(3)

            if name in self:
                raise Exception('This bench value has already been stored in the trial')

            if (matchs.group(1)):
                # store the bench timing as the <name> key
                timeInMs = matchs.group(2)
                self[name] = int(timeInMs)
            elif (matchs.group(3)):
                # store bench logs
                value = matchs.group(4)
                self._frameInfo[name] = value

    def hasGZIP(self):
        return self._gzip

    def hasSameKeys(self, dictionary):
        result = True

        for key in self.keys():
            result &= key in dictionary.keys()

        for key in dictionary.keys():
            result &= key in self.keys()

        return result

    def getFrameInformations(self):
        return self._frameInfo
