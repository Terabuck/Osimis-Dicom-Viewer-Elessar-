FROM nginx:1.10.2

RUN rm /etc/nginx/conf.d/*

# This config is bound directly to `http://orthanc_populated:8042/`
# because nginx doesn't allow to use ENV variable. That URL refers
# to a service set in the `docker-compose.yml` file available at
# the root.
COPY nginx.conf /etc/nginx/conf.d/

EXPOSE 80