# Talan CLI

* Multi-component management system
* Helps to deal with Monolith-SOA-Microservices architecure, split & merge repositories
* Manage structure of projects using hierarchy of components
* Manage complex relations between components using 'inherits' & 'depends' lists

## Setup
* Install NodeJS
  ```
  curl -sL https://deb.nodesource.com/setup_11.x -o nodesource_setup.sh
  sudo bash nodesource_setup.sh
  sudo apt-get install -y gcc g++ make
  sudo apt-get install -y nodejs
  node -v
  ```
* Install tln-cli 
  ```
  npm i -g tln-cli
  tln --version
  ```

## Usage scenarios

### Configure working space
* Goto to home folder
  ```
  cd ~
  ----
  d: && cd /
  ```
* Create projects' home and tell tln about it
  ```
  mkdir projects
  cd projects
  tln init-config
  ```
* List available components, inspect steps for java and install openjdk-12.0.2
  ```
  tln ls
  tln ls java
  tln inspect openjdk-12.0.2 --yaml
  tln install openjdk-12.0.2
  ```

### Installing
* Get list of all available components ```tln ls /```
* Docker ```tln install docker```

### List available components


## Similar projects
* https://github.com/mateodelnorte/meta
* https://github.com/lerna/lerna
* https://sdkman.io
