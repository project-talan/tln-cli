# Talan cli
is
* `uniform` development environment for multiple projects
* tool to reflect `complex internal company structure`
* helper for `shared` libraries and components management
* a set of rules for `smooth on-boarding` procedure
* `flexible` structure for `micro-services, SOA & N-ties` architecture
* `ambrella solution` for `mono- and multi- repo` approaches
* `IaC`
* platform `agnostic`
* `polyglot programming friendly`

## Prerequisites
* Install Nodejs 12.x or higher (https://nodejs.org)
* Install tln-cli 
  ```
  sudo npm i -g tln-cli
  tln --version
  ```

## Quick start <sub><sup>~10 min</sup></sub>
Let's say, you've joined Calbro.com company to head software project development. You will need to build new service as part of multiple already in-production applications.

First of all, you need to configure your local development environment, checkout existing projects and create initials projet structure.

### Local development environment home
* Go to your home folder
  * Linux/MacOs
    ```
    cd ~
    ```
  * Windows
    ```
    d:
    cd /
    ```

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
  
* If you check created configuration file `.tln.conf`, you will see next JSON structure
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
  
* Open this file using your favorite editor and add your git user name and working email (for this demo, please use your Github account) and update `inherits` array with `git` component:
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
  
* At this point, you are ready to get source code for existing projects, build it and start checking existing functionality
  ```
  tln clone calbro-scanner:calbro-portal
  tln install calbro-portal:calbro-scanner --depends
  tln prereq:init -r
  tln build -r
  ```
  * First command will use `git clone` and your credentials which were defined early inside `.tln.conf`.
  * Second will install all necessary `third-parties` components.
  * Third one will generate `.env` file if any using template and run initialization commands like `npm i`.
  * The last command will recursivelly `build` all components

### Skeletin for new project
You project is still at early stage, there are a lot of uncertainty, but you have to push it forward.

It's also to clear will be project based on SOA or Microservices, so you are ok to start with mono repo, but at the same time you want to build structure which can be slitted later if needed.

Calbro software development culture also includes recommendation to reuse wide range of project templates and you will follow this practice.

This is how your initial concept looks like:
* admin frontend - Angular, a couple of developers have joined your team recently with necessary skills, backend - Nodejs
* API service - Go, since this is general company strategy and your project should be aligned with it
* Auth service will utilize Nodejs again, since it will be handled by the developer which will be working on admin part
* You need to have two types of persistance storages - SQL & NoSQL, because initial analysis shows that we can't have "shoes for all feets" approach
* Managment wants to go with mobile-first approach, so we will try satisfy this request by using Cordova and reuse our Javascript based frontend
* Main portal web part will use React, because it's cool

So, here we go (you can just copy whole script below and execute it as a single command)




## Similar projects
* https://github.com/mateodelnorte/meta
* https://github.com/lerna/lerna
* https://sdkman.io
* https://chocolatey.org/
