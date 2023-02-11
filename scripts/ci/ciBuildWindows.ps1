param(
     [Parameter(Position=0)][string]$branchName = "unknown",
     [Parameter(Position=1)][string]$viewerVersion = "0.0.0-0-gxxxxxxxx-dirty", # git describe --tags --long --dirty=-dirty
     [Parameter(Position=2)][string]$action = "build"  # build/publish
)

write-host "branchName = $branchName"
write-host "viewerVersion = $viewerVersion"
write-host "action = $action"

# create a virtual env
python -m venv env
env\Scripts\activate.ps1

pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE}

pip install awscli
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE}

python buildWindowsOsx.py $branchName $viewerVersion $action
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE}

deactivate
