# talan cli (tln) - Advanced Component Management System

## Motivation
Modern software development has a complex internal structure.
Here is just a couple of challanges we are facing every day:
* multiple versions (branches) of your product can rely on different versions of third-party components
* polyglot programming environment assumes dependencies from a lot of external components and from different ecosystems (java, nodejs, c++, javscript etc.)
* onboarding procedure for the new developer in most cases is non-trivial process
* multiple teams inside big company usally do the same things by a different ways extremelly increasing overhead
* use uniform build process for the local development and CI is a bit of a challange
* ... put your daily software development headaches here

## Key features
* `uniform` installation procedure for wide range of third-party components and tracking their history of versions
* ability to create fully isolated development environments, here even every branch can use different version of third-party components
* additional layer to store common information about company/team/projects/service (list of projects, SCM parameters etc.) and user/environment specidic data (user name/email, environment variables etc.)
* all configurations are fully customizable, user can define any environment variable, SDLC steps, .env files to be part of development process
* simple configuration file will help to manage `mono- and multi- repo` approaches and mixed variations too.
* the same dependency installation and build process can be used inside local development environment and at CI side without any changes.

## Prerequisites
* Install Nodejs 12.x or higher (https://nodejs.org)
* Install tln-cli 
  ```
  > npm i -g tln-cli
  > tln --version
  ```

## Quick start <sub><sup>~15 min</sup></sub>
Let's say, you've joined Calbro.com company to head software project development. You will need to build new service as part of multiple already in-production applications. You first steps are: configure your local development environment, checkout existing projects and create initial structure for the new one.

### Local development environment home
* Go to your home folder
  * Linux/MacOs
    ```
    > cd ~
    ```
  * Windows
    ```
    > d:
    > cd /
    ```

* Next step is to create folder where all your projects will be located
  ```
  > mkdir projects
  > cd projects
  > tln config --terse
  ```
  
* tln ships with a long list of recipes for third-party components deployment. Any time you need specific version of Java, Angular, Nodejs, Boost, Cordova, Maven, Gradle, Golang etc. simply use install command to add this component into your local development environment.
  ```
  > tln ls
  > tln ls java --all
  > tln ls nodejs:angular:cmake
  > tln install openjdk-14.0.1:angular-9.1.8:cmake-3.17.3
  ```

### Calbro projects home
* Now you are ready to start configuring Calbro specific components
  ```
  > mkdir calbro
  > cd calbro
  > tln config --terse
  ```
  
* If you check created configuration file `.tln.conf`, you will see following JSON structure
  ```
  module.exports = {
    tags: async (tln) => [],
    options: async (tln, args) => {},
    env: async (tln, env) => {},
    dotenvs: async (tln) => [],
    inherits: async (tln) => [],
    depends: async (tln) => [],
    steps: async (tln) => [],
    components: async (tln) => []
  }
  ```
  
* Open this file using your text editor, add your `git user name and working email` (for this tutorial, please use your Github account) and update `inherits` array with `git` component
  ```
  module.exports = {
    tags: async (tln) => [],
    options: async (tln, args) => {},
    env: async (tln, env) => {
      env.TLN_GIT_USER = 'Alice';
      env.TLN_GIT_EMAIL = 'alice@calbro.com';
    },
    dotenvs: async (tln) => [],
    inherits: async (tln) => ['git'],
    depends: async (tln) => [],
    steps: async (tln) => [],
    components: async (tln) => []
  }
  ```
  This information will be used by all subsequent git calls.

### Checkout, configure & build existing projects
Calbo is a big company and has a lot of teams and ongoing projects. You know that Calbro is using `tln` to deal with internal complexity, so onboarding should be straightforward.
* You are part of `teamone` team and this can be reflected into development environment structure
  ```
  > mkdir teamone
  > cd teamone
  > tln config --repo https://github.com/project-talan/tln-calbro-teamone.git
  > tln ls
  ```
  Two last commands will do the magic: connect with teamone's list of projects and display them to you
  
  Configuration file .tln/.tlf.conf can unhide more details
  ```
  module.exports = {
    tags: async (tln) => [],
    options: async (tln) => [],
    dotenvs: async (tln) => [],
    inherits: async (tln) => [],
    depends: async (tln) => [],
    env: async (tln, env) => {
      env.TLN_GIT_ORIGIN = `https://github.com/${env.TLN_GIT_USER}/${env.TLN_COMPONENT_ID}.git`;
      env.TLN_GIT_UPSTREAM = `https://github.com/project-talan/${env.TLN_COMPONENT_ID}.git`;
    },
    steps: async (tln) => [],
    components: async (tln) => [
      { id: 'calbro-scanner' },
      { id: 'calbro-portal' }
    ]
  }
  ```
  
* At this point, you are ready to get source code of the existing projects, build it and start checking implemented functionality
  ```
  > tln clone calbro-scanner:calbro-portal
  > tln install calbro-portal:calbro-scanner --depends
  > tln prereq:init -r
  > tln build -r
  ```
  * First command will use `git clone` and your credentials were defined early inside `.tln.conf`
  * Second will install all necessary `third-parties` components
  * Third one will generate `.env` file if any, using template, and run initialization commands like `npm i`
  * The last command will recursivelly `build` all components

### Skeleton for the new project
You project is still at early stage, there are a lot of uncertainty, but you have to push it forward.

It's also not clear will be project based on SOA or Microservices, so you are ok to start with mono repo, but at the same time you want to build structure which can be splitted later if needed.

Calbro software development culture also includes recommendation to reuse wide range of project templates and you will follow this practice.

* This is how your initial concept looks like:
  * Admin Frontend - Angular, a couple of developers have joined your team recently with necessary skills, Admin Backend - Nodejs
  * API service - Go, since this is general company strategy and your project should be aligned with it
  * Auth service will utilize Nodejs again, since it will be handled by the developer which will be working on Admin part
  * You need to have two types of persistent storages - SQL & NoSQL, because initial analysis shows that we can't have "shoes for all feets" approach
  * Managment wants to go with mobile-first approach, so you will try satisfy this requirement by using Cordova and reuse our Javascript based frontend
  * Main portal web part will use React, because it's cool
  * We also need Java to build our automated test framework

* So, here we go
  ```
  mkdir calbro-reporting && \
  cd calbro-reporting && \
  tln init-repo && \
  tln config --terse && git add . && git commit -m"empty repo" && \
  tln add-subtree -- --prefix static/admin --subtree https://github.com/project-talan/tln-angular.git --ref master && \
  tln add-subtree -- --prefix static/portal --subtree https://github.com/project-talan/tln-react.git --ref master && \
  tln add-subtree -- --prefix services/admin --subtree https://github.com/project-talan/tln-nodejs.git --ref master && \
  tln add-subtree -- --prefix services/api --subtree https://github.com/project-talan/tln-golang.git --ref master && \
  tln add-subtree -- --prefix services/auth --subtree https://github.com/project-talan/tln-nodejs.git --ref master && \
  tln add-subtree -- --prefix dbs/mongo --subtree https://github.com/project-talan/tln-mongodb.git --ref master && \
  tln add-subtree -- --prefix dbs/postgresql --subtree https://github.com/project-talan/tln-postgresql.git --ref master && \
  tln add-subtree -- --prefix mobile/cordova --subtree https://github.com/project-talan/tln-cordova.git --ref master && \
  tln add-subtree -- --prefix qa/api --subtree https://github.com/project-talan/tln-java.git --ref master && \
  tln add-subtree -- --prefix qa/load --subtree https://github.com/project-talan/tln-java.git --ref master && \
  tln add-subtree -- --prefix qa/e2e --subtree https://github.com/project-talan/tln-java.git --ref master
  tln config dbs:mobile:qa:services:static --terse && \
  git add . && git commit -m"Initial skeleton" && \
  cd ..
  ```

* Initial structure is ready and we can verify mounted subtrees
  ```
  > tln ls-subtrees calbro-reporting
  ```
  | Prefix | Subtree | Ref |
  |-----------|-----------|-----------|
  | static/admin | https://github.com/project-talan/tln-angular.git | master |
  | static/portal | https://github.com/project-talan/tln-react.git | master |
  | services/admin | https://github.com/project-talan/tln-nodejs.git | master |
  | services/api | https://github.com/project-talan/tln-golang.git | master |
  | services/auth | https://github.com/project-talan/tln-nodejs.git | master |
  | dbs/mongo | https://github.com/project-talan/tln-mongodb.git | master |
  | dbs/postgresql | https://github.com/project-talan/tln-postgresql.git | master |
  | mobile/cordova | https://github.com/project-talan/tln-cordova.git | master |
  | qa/api | https://github.com/project-talan/tln-java.git | master |
  | qa/load | https://github.com/project-talan/tln-java.git | master |
  | qa/e2e | https://github.com/project-talan/tln-java.git | master |

* And the final step is to observe ready to use development environment structure with all necessary dependencies
  ```
  > tln ls / -d 5 --all --installed-only
  ```
  ```
    /
    ├ calbro
    │ └ teamone
    │   ├ calbro-scanner
    │   ├ calbro-portal
    │   └ calbro-reporting
    │     ├ dbs
    │     │ ├ mongo
    │     │ └ postgresql
    │     ├ mobile
    │     │ └ cordova
    │     ├ qa
    │     │ ├ api
    │     │ ├ e2e
    │     │ └ load
    │     ├ services
    │     │ ├ admin
    │     │ ├ api
    │     │ └ auth
    │     └ static
    │       ├ admin
    │       └ portal
    ├ angular
    │ └ angular-9.1.7
    ├ java
    │ └ openjdk-11.0.2
    └ maven
      └ mvn-3.6.3
  ```


## Similar projects
* https://brew.sh/
* https://github.com/mateodelnorte/meta
* https://github.com/lerna/lerna
* https://sdkman.io
* https://chocolatey.org/
