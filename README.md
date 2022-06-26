# Talan CLI - Advanced Component Management System

<img alt="ccf" align="right" src="https://raw.githubusercontent.com/project-talan/tln-cli/master/docs/banner.jpg" width="300">

Talan CLI (`tln`) is an open-source framework for managing third-party components from wide range of ecosystems (Java, Node.js, C++, Golang, Angular etc.). `tln` helps to create fully `isolated` development environments, uniformly manage `mono- & multi-` repo configurations, build `smooth onboaring` experience, melt borders between `local` development environments and `CI/CT/CD` setups, get maximum from `Polyglot Programming Polyglot Persistence` (4Ps) design.

Upcoming 2.x release will bring new key feature: AaC - Architecture-as-Code.

## Similar or related projects
[Brew](https://brew.sh/), [Conan](https://conan.io/), [Meta](https://github.com/mateodelnorte/meta), [Lerna](https://github.com/lerna/lerna), [SDKMAN](https://sdkman.io), [jEnv](https://www.jenv.be/), [Chocolatey](https://chocolatey.org/)

## Prerequisites
* Install `Nodejs 14.x` or higher (https://nodejs.org)

  Linux
  ```
  curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
  sudo bash nodesource_setup.sh
  sudo apt install nodejs && node -v
  ```
* Make sure that `wget` is accessible via command line (Linux/MacOS)
* Make sure that `Powershell` script can be executed (Windows):
  ```
  set-executionpolicy remotesigned
  ```
  or
  ```
  set-ExecutionPolicy unrestricted
  ```
* Install tln-cli 
  ```
  npm i -g tln-cli && tln --version
  ```

## Quick start <sub><sup>~3 min</sup></sub>
* Create folder where all your projects will be located
  * Linux/MacOs
    ```
    cd ~
    ```
  * Windows (you can use any disk, disk d: is used for demonstration purpose)
    ```
    d:
    cd /
    ```
  ```
  mkdir projects && cd projects && tln config --terse
  ```

* Create folder for the `hellotalan` project (inside `projects` folder)
  ```
  mkdir hellotalan && cd hellotalan && tln config --terse
  ```
* Edit `.tln.conf` file to get next configuration (you can just copy-paste it)
  ```
  module.exports = {
    options: async (tln, args) => {},
    env: async (tln, env) => {},
    dotenvs: async (tln) => [],
    inherits: async (tln) => [],
    depends: async (tln) => ['openjdk-18', 'mvn-3.8.5', 'go-1.18.3', 'node-16.15.1', 'kubectl-1.23.7', 'firebase-11.0.1'],
    steps: async (tln) => [
      {
        id: "versions",
        builder: async (tln, script) => script.set([
          'java -version && echo && mvn -v && echo && go version && echo && node -v && echo && kubectl version --client && echo && firebase --version'
        ])
      }
    ],
    components: async (tln) => []
  }
  ```
* Next command will install all components were listed inside `depends` section from `.tln.conf`. Components will be installed inside `projects` folder and `will not affect any other already installed software`.
  ```
  tln install --depends
  ```
* Check version of installed components
  ```
  tln versions
  ```
  ```
  openjdk version "18" 2022-03-22
  OpenJDK Runtime Environment (build 18+36-2087)
  OpenJDK 64-Bit Server VM (build 18+36-2087, mixed mode, sharing)

  Apache Maven 3.8.5 (3599d3414f046de2324203b78ddcf9b5e4388aa0)
  Maven home: /root/projects/maven/mvn-3.8.5
  Java version: 18, vendor: Oracle Corporation, runtime: /root/projects/java/openjdk-18
  Default locale: en, platform encoding: UTF-8
  OS name: "linux", version: "4.15.0-180-generic", arch: "amd64", family: "unix"

  go version go1.18.3 linux/amd64

  v16.15.1

  Client Version: version.Info{Major:"1", Minor:"23", GitVersion:"v1.23.7", GitCommit:"42c05a547468804b2053ecf60a3bd15560362fc2", GitTreeState:"clean", BuildDate:"2022-05-24T12:30:55Z", GoVersion:"go1.17.10", Compiler:"gc", Platform:"linux/amd64"}

  11.0.1
  ```

## tln architecture & in-depth details
* [What is Component?](docs/component.md)
* [Management of environment variables & dotenv files](docs/dotenv.md)
* [Versioning](docs/versioning.md)
* [Mono- & multi-repo configurations](docs/repos.md)
* [MVTs - Minimal Vaible Templates](docs/mvt.md)
* [Software Development Life Cycle](docs/sdlc.md)


## Real life scenario <sub><sup>~15 min</sup></sub>
Let's say, you've joined Calbro.com company to head software project development. You will need to build new service as part of multiple already in-production applications. Your first steps are: configure local development environment, checkout existing projects and create initial structure for the new one.

### Calbro projects home
* First step is to configure Calbro components
  * Linux/MacOs
    ```
    > cd ~/projects
    ```
  * Windows
    ```
    > d:
    > cd /projects
    ```
  ```
  > mkdir calbro
  > cd calbro
  ```
  For the next command replace Alice account name and email with your own (for this tutorial, please use your Github account)
  ```
  > tln config --terse -e TLN_GIT_USER=Alice -e TLN_GIT_EMAIL=alice@calbro.com --inherit git
  ```
  
* If you check created configuration file `.tln.conf`, you will see following JSON structure
  ```
  module.exports = {
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
* You are part of `teamone` team and this should be reflected as part of your local dev environment
  ```
  > mkdir teamone
  > cd teamone
  
  # for ssh access
  > tln config --repo git@github.com:project-talan/calbro-teamone-tln.git
  # for https access
  # tln config --repo https://github.com/project-talan/tln-calbro-teamone.git
  
  > tln ls
  ```
  Two last commands will do the magic: get teamone list of projects and display them to you
  
  Configuration file `.tln/.tlf.conf` can unhide more details
  ```
  module.exports = {
    options: async (tln) => [],
    dotenvs: async (tln) => [],
    inherits: async (tln) => [],
    depends: async (tln) => [],
    env: async (tln, env) => {
      env.TLN_GIT_SSH_PREFIX = 'git@github.com:';
      env.TLN_GIT_HTTPS_PREFIX = 'https://github.com/';  
      env.TLN_GIT_ORIGIN = `${env.TLN_GIT_USER}/${env.TLN_COMPONENT_ID}.git`;
      env.TLN_GIT_UPSTREAM = `project-talan/${env.TLN_COMPONENT_ID}.git`;
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
  # for ssh access
  > tln clone calbro-scanner:calbro-portal
  # for https access
  # tln clone calbro-scanner:calbro-portal -- --https
  
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

It's also not clear will be project based on SOA or Microservices or even N-tier, so you are ok to start with mono repo, but at the same time you want to build structure which can be splitted later if needed.

Calbro software development culture also includes recommendation to reuse wide range of project templates and you will follow this practice too.

* This is how your initial concept looks like:
  * Admin `Frontend` - `Angular`, a couple of developers have joined your team recently with necessary skills, Admin `Backend` - `Nodejs`
  * `API` service - `Go`, since this is general company strategy and your project should be aligned with it
  * `Auth` service will utilize `Nodejs` again, since it will be handled by the developer who will be working on Admin part
  * You need to have two types of persistent storages - `SQL & NoSQL`, because initial analysis shows that we can't have "shoes for all feets" approach
  * Managment wants to go with `mobile-first` approach, so you will try satisfy this requirement by using `Cordova` and reuse our Javascript based frontend
  * `Main portal` web part will use `React`, because it's cool
  * We also need `Java` to build our automated test framework

* So, here we go (you can copy commands below into create.sh script and execute them in a single run)
  ```
  mkdir calbro-reporting && \
  cd calbro-reporting && \
  tln init-repo && \
  tln config --terse && git add . && git commit -m"empty repo" && \
  tln subtree-add -- --prefix static/admin --subtree https://github.com/project-talan/tln-angular.git --ref master && \
  tln subtree-add -- --prefix static/portal --subtree https://github.com/project-talan/tln-react.git --ref master && \
  tln subtree-add -- --prefix services/admin --subtree https://github.com/project-talan/tln-nodejs.git --ref master && \
  tln subtree-add -- --prefix services/api --subtree https://github.com/project-talan/tln-golang.git --ref master && \
  tln subtree-add -- --prefix services/auth --subtree https://github.com/project-talan/tln-nodejs.git --ref master && \
  tln subtree-add -- --prefix dbs/mongo --subtree https://github.com/project-talan/tln-mongodb.git --ref master && \
  tln subtree-add -- --prefix dbs/postgresql --subtree https://github.com/project-talan/tln-postgresql.git --ref master && \
  tln subtree-add -- --prefix mobile/cordova --subtree https://github.com/project-talan/tln-cordova.git --ref master && \
  tln subtree-add -- --prefix qa/api --subtree https://github.com/project-talan/tln-java.git --ref master && \
  tln subtree-add -- --prefix qa/load --subtree https://github.com/project-talan/tln-java.git --ref master && \
  tln subtree-add -- --prefix qa/e2e --subtree https://github.com/project-talan/tln-java.git --ref master && \
  tln config dbs:mobile:qa:services:static --terse && \
  git add . && git commit -m"Initial skeleton" && \
  cd ..
  ```
  Windows (create.cmd)
  ```
  mkdir calbro-reporting && ^
  cd calbro-reporting && ^
  tln init-repo && ^
  tln config --terse && git add . && git commit -m"empty repo" && ^
  tln subtree-add -- --prefix static/admin --subtree https://github.com/project-talan/tln-angular.git --ref master && ^
  tln subtree-add -- --prefix static/portal --subtree https://github.com/project-talan/tln-react.git --ref master && ^
  tln subtree-add -- --prefix services/admin --subtree https://github.com/project-talan/tln-nodejs.git --ref master && ^
  tln subtree-add -- --prefix services/api --subtree https://github.com/project-talan/tln-golang.git --ref master && ^
  tln subtree-add -- --prefix services/auth --subtree https://github.com/project-talan/tln-nodejs.git --ref master && ^
  tln subtree-add -- --prefix dbs/mongo --subtree https://github.com/project-talan/tln-mongodb.git --ref master && ^
  tln subtree-add -- --prefix dbs/postgresql --subtree https://github.com/project-talan/tln-postgresql.git --ref master && ^
  tln subtree-add -- --prefix mobile/cordova --subtree https://github.com/project-talan/tln-cordova.git --ref master && ^
  tln subtree-add -- --prefix qa/api --subtree https://github.com/project-talan/tln-java.git --ref master && ^
  tln subtree-add -- --prefix qa/load --subtree https://github.com/project-talan/tln-java.git --ref master && ^
  tln subtree-add -- --prefix qa/e2e --subtree https://github.com/project-talan/tln-java.git --ref master && ^
  tln config dbs:mobile:qa:services:static --terse && ^
  git add . && git commit -m"Initial skeleton" && ^
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
  ├ angular
  │ ├ angular-9.1.8
  │ └ angular-9.1.7
  ├ calbro
  │ └ teamone
  │   ├ calbro-portal
  │   ├ calbro-reporting
  │   │ ├ dbs
  │   │ │ ├ mongo
  │   │ │ └ postgresql
  │   │ ├ mobile
  │   │ │ └ cordova
  │   │ ├ qa
  │   │ │ ├ api
  │   │ │ ├ e2e
  │   │ │ └ load
  │   │ ├ services
  │   │ │ ├ admin
  │   │ │ ├ api
  │   │ │ └ auth
  │   │ └ static
  │   │   ├ admin
  │   │   └ portal
  │   └ calbro-scanner
  ├ cordova
  │ └ cordova-9.0.0
  ├ golang
  │ └ go-1.14.4
  ├ hellotalan
  ├ java
  │ ├ openjdk-14.0.1
  │ └ openjdk-11.0.2
  ├ maven
  │ └ mvn-3.6.3
  └ nodejs
    └ node-14.4.0
  ```
