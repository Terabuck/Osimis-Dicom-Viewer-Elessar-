from helpers import LogHelpers
import logging
from osiBenchmark import BenchmarkManager

# prerequisites:
#   - having orthanc db2
#   $ aws s3 sync s3://osimisviewerdicomfiles/orthancDb2 ../../orthanc_data_2 # install orthancDb2 - ~4GO
#
#   - creating virtual env
#   $ pyvenv env
#
#   - load virtual env
#   $ source env/bin/activate # source virtual env
#
#   - install python toolbox dependencies
#   $ pip install -r requirements.txt
#
#   - building webviewer pro in release mode in the Build folder
#   $ mkdir ../Build
#   $ cd ../Build/
#   $ cmake .. -DCMAKE_BUILD_TYPE=Release -DALLOW_DOWNLOADS=ON -DSTATIC_BUILD=ON -DENABLE_CACHE=OFF -DBENCHMARK=ON
#   $ make
#   $ cd BenchmarksSources
#
#   - opening orthanc with the provided orthanc.json
#   $ ../subtrees/binaries.git/Orthanc orthanc.json
#
#   - update orthanc.json to your local paths
#
# usage:
#   $ python benchmarkRestApi.py

def addBenchmarkCases(benchmarkManager, quality, gzip):
    benchmarkManager.add(instance='3ad3515c-cae5ec82-97f271ca-1e35e62d-a56ac7e2', frame=0,
                         quality=quality, gzip=gzip, comment=('MAMMO', 'DML', 'monoframe dicom single image', 'big file'))

    benchmarkManager.add(instance='b78dbf2b-2e731d41-d8831d11-06fb5be2-ded5efa5', frame=0,
                         quality=quality, gzip=gzip, comment=('MAMMO', 'TOMMO DMLO #1', 'monoframe dicom single image'))

    benchmarkManager.add(instance='fb8ebb6c-84575ce2-809075ee-f9291a90-8b7b39b6', frame=0,
                         quality=quality, gzip=gzip, comment=('MAMMO', 'TOMMO DMLO #2', 'multiframe dicom'))

    benchmarkManager.add(instance='fb8ebb6c-84575ce2-809075ee-f9291a90-8b7b39b6', frame=1,
                         quality=quality, gzip=gzip, comment=('MAMMO', 'TOMMO DMLO #2', 'multiframe dicom'))

    benchmarkManager.add(instance='fb8ebb6c-84575ce2-809075ee-f9291a90-8b7b39b6', frame=30,
                         quality=quality, gzip=gzip, comment=('MAMMO', 'TOMMO DMLO #2', 'multiframe dicom'))

    benchmarkManager.add(instance='a4fab0f2-82286da6-9dc32e17-91eafc7e-17d29bc5', frame=0,
                         quality=quality, gzip=gzip, comment=('MAMMO', 'DCC', 'monoframe dicom single image', 'big file'))

    benchmarkManager.add(instance='39be12ef-cbbdf94f-3a6c9dae-7b81b31e-32968419', frame=0,
                         quality=quality, gzip=gzip, comment=('NEURO/IRM', 'T2W/FE-EPI', 'monoframe dicom in serie', 'low resolution'))
    benchmarkManager.add(instance='606cd6e8-2335177a-6491441c-11e4f6aa-66b8a008', frame=0,
                         quality=quality, gzip=gzip, comment=('NEURO/IRM', 'T2W/FE-EPI', 'monoframe dicom in serie', 'low resolution'))
    benchmarkManager.add(instance='b69e8d99-c3466b3f-7d20830d-7a02f562-617b6686', frame=0,
                         quality=quality, gzip=gzip, comment=('NEURO/IRM', 'T2W/FE-EPI', 'monoframe dicom in serie', 'low resolution'))
    benchmarkManager.add(instance='197bed4e-73de7045-868e0784-b30c7b79-0c1e723d', frame=0,
                         quality=quality, gzip=gzip, comment=('NEURO/IRM', 'T1/3D/FFE/C', 'monoframe dicom in serie', 'low resolution'))
    benchmarkManager.add(instance='507063f3-5a110df1-11821938-4e648b68-551cc3b7', frame=0,
                         quality=quality, gzip=gzip, comment=('NEURO/IRM', 'T1/3D/FFE/C', 'monoframe dicom in serie', 'low resolution'))
    benchmarkManager.add(instance='a616ac3d-a3ca5776-648ac13e-98c5f399-77a8bcf8', frame=0,
                         quality=quality, gzip=gzip, comment=('NEURO/IRM', 'T1/3D/FFE/C', 'monoframe dicom in serie', 'low resolution'))


if __name__ == '__main__':
    LogHelpers.configureLogging(logging.INFO)
    logger = LogHelpers.getLogger("BenchmarkCase")

    benchmarkManager = BenchmarkManager(cache=False, trialCount=5)
    addBenchmarkCases(benchmarkManager, quality = 'low-quality', gzip = False)
    addBenchmarkCases(benchmarkManager, quality = 'medium-quality', gzip = False)
    addBenchmarkCases(benchmarkManager, quality = 'high-quality', gzip = False)
    addBenchmarkCases(benchmarkManager, quality = 'pixeldata-quality', gzip = False)

    benchmarkManager.close()

    benchmarkManager.writeCSV('file.csv')

    print(benchmarkManager.toString())
    print()

    logger.info('done')
