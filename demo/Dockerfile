# let's start from an image with the sample data already in and we'll copy the viewer lib in it
# note that we need an Orthanc SDK 1.3.1
FROM osimis/orthanc-pro:18.5.1-demo-populated

ENV WVP_ENABLED=false
ENV WVB_ENABLED=true

COPY ./osimis-webviewer.json /etc/orthanc/osimis-webviewer.json

# we must copy the .so file in the 'disabled' folder to overwrite the existing one
COPY binaries/libOsimisWebViewer.so /usr/share/orthanc/plugins-disabled/libOsimisWebViewer.so
