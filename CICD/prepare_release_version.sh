#!/usr/bin/env bash

# Copyright (c) 2018-2024, RTE (http://www.rte-france.com)
# See AUTHORS.txt
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0
# This file is part of the OperatorFabric project. 

display_usage() {
	echo "This script makes the necessary changes to version controlled files to prepare for a RELEASE version."
	echo -e "Usage:\n"
	echo -e "\tprepare_release_version.sh [OPTIONS] \n"
	echo -e "options:\n"
	echo -e "\t-v, --version  : string. Version to be released (X.X.X.RELEASE)"
}

# Read parameters
while [[ $# -gt 0 ]]
do
key="$1"
# echo $key
case $key in
    -v|--version)
    newVersion="$2"
    shift # past argument
    shift # past value
    ;;
    -h|--help)
    shift # past argument
display_usage
    exit 0
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done

# Get current version from VERSION file (can be SNAPSHOT or X.X.X.RELEASE in the case of a fix)
oldVersion=$(cat VERSION)
echo "Current version is $oldVersion (based on VERSION file)"


# Check that new version is a RELEASE version as expected
if [[ $newVersion != *.RELEASE ]]; then
  echo "Specified version is not a RELEASE version, this script shouldn't be used."
  exit 1;
fi

echo "Preparing $newVersion"

# Replace old version with new version

echo "Updating version for pipeline in VERSION file"
sed -i "s/$oldVersion/$newVersion/g" VERSION;

echo "Replacing $oldVersion with $newVersion in swagger.yaml files"
find . -name swagger.yaml | xargs sed -i "s/\(version: *\)$oldVersion/\1$newVersion/g";
# With the current command, if the "version" key appears somewhere else in the file it will be affected as well.
# That's why oldVersion is part of the pattern, as it is less likely that another version key would appear with the exact same value.
# The issue is that if the value has been mistakenly modified and is not $oldVersion, it won't be updated

echo "Using $newVersion for lfeoperatorfabric images in dev and docker environment docker compose files"
# String example for regexp: image: "lfeoperatorfabric/of-web-ui:0.13.1.RELEASE"
sed -i "s/\( *image *: *\"lfeoperatorfabric\/.*:\)\(.*\)\"/\1$newVersion\"/g" ./config/docker/docker-compose.yml;
sed -i "s/\( *image *: *\"lfeoperatorfabric\/.*:\)\(.*\)\"/\1$newVersion\"/g" ./config/dev/docker-compose.yml;

echo "Using $newVersion for lfeoperatorfabric/of-opfab-cli"
sed -i "s/lfeoperatorfabric\/of-opfab-cli:.*/lfeoperatorfabric\/of-opfab-cli:$newVersion/" ./cli/opfabDockerCli.sh;
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$newVersion\"/" ./cli/src/package.json


echo "Using $newVersion for About menu in web-ui.json files"
jq --arg a "${newVersion}" '.opfabVersion = $a' ./ui/main/package.json > "tmp" && mv "tmp" ./ui/main/package.json

echo "The following files have been updated: "
echo | git status --porcelain
