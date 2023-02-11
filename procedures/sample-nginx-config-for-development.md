# this file is in amazy@amazy-VirtualBox:/etc/nginx/sites-available/default 
# you'll need to change the root to the webviewer repo on your dev machine
# 
# To build the frontend, you may use:
# - ./scripts/ci/setEnv.sh
# - ./scripts/ci/ciBuildFrontend.sh
#
# Then, you may launch a native Orthanc with the WVB enabled (Orthanc is assumed to listen on port 8042)
# To access orthanc with the new WVB frontend, open http://localhost:9638/viewer/orthanc/app/explorer.html

server {
	listen 9638 default_server;
	listen [::]:9638 default_server;

	root /var/www/html;

	# Add index.php to the list if you are using PHP
	index index.html index.htm index.nginx-debian.html;

	server_name _;

	location / {
		# First attempt to serve request as file, then
		# as directory, then fall back to displaying a 404.
		try_files $uri $uri/ =404;
	}

	location /viewer/orthanc/osimis-viewer/app/ {
		rewrite /viewer/orthanc/osimis-viewer/app(.*) $1 break;
	    root /home/amazy/osimis-webviewer-plugin.git/frontend/build;
	}
	location /viewer/orthanc/ {
		rewrite /viewer/orthanc(.*) $1 break;
		proxy_pass http://127.0.0.1:8042;
		proxy_set_header Host $http_host;
		proxy_set_header my-auth-header good-token;
		proxy_request_buffering off;
		proxy_max_temp_file_size 0;
		client_max_body_size 0;
	}
}

