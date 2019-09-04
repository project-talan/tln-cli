# Talan CLI

* Multi-component management system
* Helps to deal with Monolith-SOA-Microservices architecure, split & merge repositories
* Manage structure of projects using hierarchy of components
* Manage complex relations between components using 'inherits' & 'depends' lists

## Setup
* Install NodeJS
  ```
  curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
  sudo bash nodesource_setup.sh
  sudo apt-get install -y gcc g++ make
  sudo apt-get install -y nodejs
  ```
* Install tln-cli ```npm i -g tln-cli```

## Usage scenarios

### Installing
* Get list of all available components ```tln ls /```
* Docker ```tln install docker```

### List available components


## Similar projects
* https://github.com/mateodelnorte/meta
* https://github.com/lerna/lerna
* https://sdkman.io
