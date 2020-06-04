#!/bin/bash

mvn archetype:generate -DarchetypeArtifactId=jersey-quickstart-grizzly2 \
-DarchetypeGroupId=org.glassfish.jersey.archetypes -DinteractiveMode=false \
-DgroupId=com.calbro -DartifactId=scanner -Dpackage=com.calbro \
-DarchetypeVersion=2.31