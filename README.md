* provides `uniform` development environment for multiple projects
* reflects `complex company structure`
* reserves space for `shared` libraries and components
* ensure `smooth on-boarding` procedure
* grants `flexible` structure for `micro-services, SOA & N-ties` architecture
* `melts` borders between `mono- and multi- repo` structures
* `stores` configuration for IaC, `minimize` CI configuration
* is platform `agnostic`
* is `polyglot programming friendly`

## Prerequisites
* Install Nodejs 12.x or higher (https://nodejs.org)
* Install tln-cli 
  ```
  sudo npm i -g tln-cli
  tln --version
  ```

## Quick start
Let say, you've joined Calbro.com company to head software project development. You will need to build new service as part of multiple already in-production applications.
First of all, you will configure your local development environment, checkout existing projects and create initials structue for the project.

### Local development environment home
* Go to your home folder
  * Linux/MacOs: ```cd ~```
  * Windows: ```d: && cd /```

* Create projects' home and tell `tln` about it
  ```
  mkdir projects
  cd projects
  tln config --terse
  ```
Now you can list all available to install third-parties components like Nodejs, Java, Angular, Boost etc. We will have detailed look into this features in the next sections.
  ```
  tln ls
  tln ls java --all
  tln ls nodejs:angular:cmake
  ```

### Calbro projects home
At this point we are ready to start configuring structure for Calbro.com projects.
  ```
  mkdir calbro
  cd calbro
  tln config --terse
  ```
If you check created configuration file `.tln.con`, you will see next JSON structure
```
module.exports = {
  tags: async (tln) => [],
  dotenvs: async (tln) => [],
  env: async (tln, env) => {},
  options: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  steps: async (tln) => [],
  components: async (tln) => []
}
```
Open this file using your favorite editor and add your git user name and working email:
```
module.exports = {
  tags: async (tln) => [],
  options: async (tln) => [],
  dotenvs: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  env: async (tln, env) => {
    env.TLN_GIT_USER = 'Alice';
    env.TLN_GIT_EMAIL = 'alice@calbro.com';
  },
  steps: async (tln) => [],
  components: async (tln) => []
}
```
This information will be used by all subsequent git calls inside this and all subdirectories.

### Checkout, configure & build existing projects
Calbo is a big companies and has a lot of departments and ongoing projects. You know that Calbro is using `tln` to deal with internal complexity, so onboarding should be straightforward. 

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
