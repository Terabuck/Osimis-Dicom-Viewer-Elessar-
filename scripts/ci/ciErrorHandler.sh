# Cleanup on error & exit with last error status.
# File has to be sourced.
# This intend to replace "set -e"
#
# Usage:
# 	$ source errorHandler.sh

# uncomment to activate debug mode
# set -x

branchName=${1:-$(git rev-parse --abbrev-ref HEAD)} #if no argument defined, get the branch name from git

# create error handler
function errorHandler {
	local lastError=$?

	echo "Handling error ${lastError}..." 1>&2

	# start from root folder
	tmpPwd=$(pwd)
	cd "${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"/
	
	# cleanup (& provide branch name argument)
	./scripts/ci/ciCleanup.sh $branchName &> /dev/null

	# move back to the previous folder
	cd $tmpPwd

	# exit with error status
    exit $lastError
}

# call errorHandler on error
trap errorHandler INT TERM ERR

