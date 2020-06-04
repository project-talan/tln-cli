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
Let's say, you've joined Calbro.com company to head software project development. You will need to build new service as part of multiple already in-production applications.
First of all, you will configure your local development environment, checkout existing projects and create initials structure for the project.

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
* Now you can list all available to install third-parties components like Nodejs, Java, Angular, Boost etc. We will have detailed look into this features in the next sections.
    ```
    tln ls
    tln ls java --all
    tln ls nodejs:angular:cmake
    ```

### Calbro projects home
* At this point you are ready to start configuring structure for Calbro's projects.
  ```
  mkdir calbro
  cd calbro
  tln config --terse
  ```
* If you check created configuration file `.tln.con`, you will see next JSON structure
  ```
  module.exports = {
    tags: async (tln) => [],
    dotenvs: async (tln) => [],
    env: async (tln, env) => {},
    options: async (tln, yargs) => [],
    inherits: async (tln) => [],
    depends: async (tln) => [],
    steps: async (tln) => [],
    components: async (tln) => []
  }
  ```
* Open this file using your favorite editor and add your git user name, working email and update `inherits` array with `git` component:
  ```
  module.exports = {
    tags: async (tln) => [],
    dotenvs: async (tln) => [],
    env: async (tln, env) => {
      env.TLN_GIT_USER = 'Alice';
      env.TLN_GIT_EMAIL = 'alice@calbro.com';
    },
    options: async (tln, yargs) => [],
    inherits: async (tln) => ['git'],
    depends: async (tln) => [],
    steps: async (tln) => [],
    components: async (tln) => []
  }
  ```
  This information will be used by all subsequent git calls inside this and all subdirectories.

### Checkout, configure & build existing projects
Calbo is a big company and has a lot of departments and ongoing projects. You know that Calbro is using `tln` to deal with internal complexity, so onboarding should be straightforward.
* You are part of `teamone` department and this can be reflected on to development environment structure.
  ```
  mkdir teamone
  cd teamone
  tln config --repo https://github.com/project-talan/tln-calbro-teamone.git
  tln ls
  ```
  Two last commands will do the magic: connect with teamone list of projects and display them to you
* At this point, you need to get source code for existing projects, build it and become familiar with implemented functionality
  ```
  tln clone calbro-scanner:calbro-portal
  tln prereq:init -r
  tln install -r --depends
  tln build -r
  ```
  First command will use `git clone` and your credentials which were defined early inside `.tln.conf`. Second command will generate `.env` file if any using template and run initialization commands like `npm i`. Third one will install all necessary `third-parties` components. Last one will recursivelly `build` all components

## Similar projects
* https://github.com/mateodelnorte/meta
* https://github.com/lerna/lerna
* https://sdkman.io
