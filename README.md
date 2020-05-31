# Talan cli
has next features:
* provides uniform development environment for multiple projects
* reflects complex company structure as part of environment structure
* reserves space for shared labraries and components
* smooth on-boarding procedure for new developers
* flexible structure for micro-services architecture, SOA, N-ties when every service can be stored using multi-repo/mono-repo approach. Switch between storage models. It good to have somewhere meta description about all services are included into solution.

Solution should be uniform from build/test/package perspective for local/CI builds

Override subset of projects parameters. For example, you may want to store your Dev/QA/UAT environment's configurations in some shared place, but in the same time be able to change some of them during local development/debug

Manage multiple version of external libraries/frameworks: java, nodejs, maven, boost etc. to be able switch between projects quickly.

Approach should be platform agnostic

Approach should be polyglot programming friendly



* 
* Multi-components management system
* Helps dealing with Standalon/SOA/Microservices architectures, split & merge repositories with less pain than usual
* Manages structure of projects using hierarchy of components
* Defines complex relations between components using 'inherits' & 'depends' lists
* Setups fully isolated development environments

## Setup
* Install Nodejs 12.x or higher (https://nodejs.org)
  Linux: 
  ```
  curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
  sudo bash nodesource_setup.sh
  sudo apt-get install -y gcc g++ make
  sudo apt-get install -y nodejs
  node -v
  ```
* Install tln-cli 
  ```
  sudo npm i -g tln-cli
  tln --version
  ```

## Usage scenarios

### Configure your workspace
* Goto to home folder

  Linux/MacOs: ```cd ~```
  Windows: ```d: && cd /```

* Create projects' home and tell tln about it
  ```
  mkdir projects
  cd projects
  tln init-config
  ```
* List available components, inspect steps for java and install openjdk-12.0.2 and node-12.10.0
  ```
  tln ls
  tln ls java
  tln inspect openjdk-12.0.2 --yaml
  tln install openjdk-12.0.2:node-12.10.0
  ```
* Checkout how virtual dev env works
  ```
  java -version
  tln exec -c "java -version" openjdk-12.0.2
  ```
* Configure your first project
  ```
  mkdir company && cd company && tln init-config
  mkdir team && cd team && tln init-config
  mkdir project && cd project && tln init-config
  ```
* Edit .tln.conf to add java & node dependencies
  ```
  change 
    depends: (tln) => [/*'java'*/],
  to
    depends: (tln) => ['openjdk-12.0.2', 'node-12.10.0'],
  ```
* Validate your setup
  ```
  tln exec -c "java -version && node -v && npm -v"
  ```

  Expected output:  
  ```
  openjdk version "12.0.2" 2019-07-16
  OpenJDK Runtime Environment (build 12.0.2+10)
  OpenJDK 64-Bit Server VM (build 12.0.2+10, mixed mode, sharing)
  v12.10.0
  6.10.3
  ```

### Configure your team workspace

### Create skeleton for microsevices project using mono-repo


## Similar projects
* https://github.com/mateodelnorte/meta
* https://github.com/lerna/lerna
* https://sdkman.io
