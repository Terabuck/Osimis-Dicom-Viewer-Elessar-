from datetime import datetime
import csv

from orthancRestApi import OrthancClient
from orthancServer import OrthancServer
from .benchmarkCase import BenchmarkCase

OrthancServer.executableFolder = '../build/';


class BenchmarkManager:
    def __init__(self, cache, trialCount):
        # load orthanc process
        self._server = OrthancServer('ORTHANC_BCM', 'ORTHANC_BCM', 5111, 5080)

        # launch orthanc
        self._server.launch('orthanc.json')

        # load orthanc rest client
        self._client = OrthancClient('http://localhost:5080/')

        # self.cache = cache
        self._trialCount = trialCount

        self._benchmarkCases = []

    def add(self, instance, frame, quality, comment, gzip):
        relativeURL = "/osimis-viewer/images/{instance}/{frame}/{quality}" \
            .format(quality=quality, instance=instance, frame=frame)

        case = BenchmarkCase(
            server = self._server,
            restClient = self._client,
            relativeURL = relativeURL,
            trialCount = self._trialCount,
            comment = comment,
            gzip = gzip
        )

        self._benchmarkCases.append(case)

        return case

    def close(self):
        self._server.stop()


    def toString(self):
        print()
        for case in self._benchmarkCases:
            print()
            print(case.toString())

    def writeCSV(self, filePath):
        with open(filePath, 'a', newline='') as csvFile:
            csvWriter = csv.writer(csvFile, dialect='excel')

            for i in range(0, len(self._benchmarkCases)):
                case = self._benchmarkCases[i]

                # write the csv header prior to the first benchmark case
                if i == 0:
                    csvWriter.writerow(["Date", "Comment", "gzip"] + list(case.getAverageValues().keys()) + list(case.getInfo().keys()))

                # write each benchmark cases
                currentDate = datetime.now().strftime('%Y/%m/%d %H:%M')
                csvWriter.writerow([currentDate, str(case.getComment()), str(case.hasGZIP())] + list(case.getAverageValues().values()) + list(case.getInfo().values()))


