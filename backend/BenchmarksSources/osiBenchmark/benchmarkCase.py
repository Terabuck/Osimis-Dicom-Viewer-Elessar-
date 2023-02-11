from collections import OrderedDict
from .benchmarkCaseTrial import BenchmarkCaseTrial
import json


class BenchmarkCase:
    def __init__(self, server, restClient, relativeURL, trialCount, comment, gzip=False):
        self._trials = []
        self._comment = comment
        self._gzip = gzip

        for x in range(0, trialCount):
            trial = BenchmarkCaseTrial(server, restClient, relativeURL, self._gzip)
            self._trials.append(trial)

    def getTrialCount(self):
        return len(self._trials)

    def getTotalValues(self):
        totalValues = OrderedDict()

        for i in range(0, self.getTrialCount()):
            trial = self._trials[i]

            for key, value in trial.items():
                if i == 0:
                    totalValues[key] = value
                else:
                    totalValues[key] += value

            print(trial)
            print(totalValues)
            
            if not trial.hasSameKeys(totalValues):
                # @note this method expect each trial to have the same benchmark
                # meta-data
                raise Exception(
                    'incompatible successive trials of a same benchmark (the execution is certainly random)')

        return totalValues

    def hasGZIP(self):
        return self._gzip

    def getAverageValues(self):
        totalValues = self.getTotalValues()
        avgValues = OrderedDict()

        for key, value in totalValues.items():
            avgValues[key] = totalValues[key] / len(self._trials)

        return avgValues

    def getInfo(self):
        return self._trials[0].getFrameInformations()

    def getComment(self):
        return self._comment

    def toString(self):
        return str(self.getComment()) + "\n" + \
               json.dumps(self.getInfo(), indent=2) + "\n" + \
               json.dumps(self.getAverageValues(), indent=2)

