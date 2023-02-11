# Demo

Docker image of the Osimis Web Viewer with dicom samples.

Requires `/backend/scripts/buildDocker.sh` to be executed.

It includes:
- An orthanc server instance.
- Orthanc configuration for public access.
- The Osimis Web Viewer.
- `orthancPopulator`: Populate the demo with anonymized DICOM samples.
- `scripts/buildDocker.sh`: A script to build and populate the demo.
- `scripts/startDocker.sh`: A script to start the demo.
- `scripts/stopDocker.sh`: A script to stop the demo.