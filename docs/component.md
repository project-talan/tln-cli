# What is Component?

**Components is an element of hierarchical structure which provides configuration information for SDLC.**

* Is Company a Component? - Yes. It explicitly defines username and email for all employees.
* Is Department a Component? - Yes. It holds all nested projects.
* Is Project a Component? - Yes. It may contain repository for mono-repo or list of repositories for milti-repo configuration.
* etc.


## Local dev environment
At file system level, any folder which contains tln configuration file (.tln.conf) will be recognized as a Component and processed by any tln command.
You can turn any folder into Component by running next command
```
> mkdir test-tln && cd test-tln
> tln config
```
this will generate **.tln.conf** from template
```
/*
  tln.logger[.con() | .trace() | etc]
  tln.getOsInfo(): 
    { type: 'Linux', platform: 'linux', kernel: '4.4.0-159-generic', os: 'linux', dist: 'Ubuntu Linux', codename: 'xenial', release: '16.04' }
    { type: 'Windows_NT', platform: 'win32', kernel: '10.0.17763', os: 'win32' }
  const path = require('path');
*/
module.exports = {
  options: async (tln, args) => {/*
    args
      .prefix('TLN_MY_COMPONENT')
      .option('configuration', { describe: 'Configuration to build' default: null, type: 'string' });
  */},
  env: async (tln, env) => {

  /*
    env.TLN_GIT_USER = 'john.doe';
    env.PATH = [path.join(env.TLN_COMPONENT_HOME, 'bin'), env.PATH].join(path.delimiter);
  */},
  dotenvs: async (tln) => [/*'.env'*/],
  inherits: async (tln) => [/*'git'*/],
  depends: async (tln) => [/*'java/openjdk-11.0.2'*/],
  steps: async (tln) => [/*
    {
      id: 'hi',
      desc: 'Say Hi from component home',
      builder: async (tln, script) => {
        script.set(['echo Hi, home: ${TLN_COMPONENT_HOME}']);
        // return true; // to prevent chain execution
      }
    }
  */],
  components: async (tln) => [/*
    { id: 'sub-component', tags: async (tln) => [], ... }
  */]
}
```
Once you become familiar with file format you can generate lightweight **.tln.conf**
```
> tln config --terse
```

```
module.exports = {
  options: async (tln, args) => {},
  env: async (tln, env) => {

  },
  dotenvs: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  steps: async (tln) => [],
  components: async (tln) => []
}
```

### Options section
Options section gives you an access to the command line parameters. Any parameter after **double dash --** will be parsed and sent to the component's steps to process.
```
module.exports = {
  options: async (tln, args) => {
    args
      .prefix('TLN_PROJECT')
      .option('environment', { describe: 'Environment to use', default: 'ci', type: 'string' });
  },
  env: async (tln, env) => {
  },
  dotenvs: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  steps: async (tln) => [
    {
      id: 'test', desc: 'Test tln-cli options feature',
      builder: async (tln, script) => {
        script.set([`
echo Environment ${script.env.TLN_PROJECT_ENVIRONMENT} will be used
        `]);
      }
    }
  ],
  components: async (tln) => []
}
```

```
> tln test
Environment ci will be used
> tln test -- --environment dev01
Environment dev01 will be used
```

### Env section
Env section allows you to initialize environment variables during tln command execution.
```
module.exports = {
  options: async (tln, args) => {},
  env: async (tln, env) => {
    env.TLN_PROJECT_DATE = (new Date()).toISOString();
  },
  dotenvs: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  steps: async (tln) => [
    {
      id: 'test', desc: 'Test tln-cli env feature',
      builder: async (tln, script) => {
        script.set([`
echo Current date: ${script.env.TLN_PROJECT_DATE}
        `]);
      }
    }
  ],
  components: async (tln) => []
}
```

```
> tln test
Current date: 2021-06-06T19:19:52.190Z
```

### Dotenvs section
Dotenvs section is an array of dontenv files. tln-cli will add parse mechanism before shell script execution, so any variable from the file will be acessible.
```
module.exports = {
  options: async (tln, args) => {},
  env: async (tln, env) => {
  },
  dotenvs: async (tln) => ['.env'],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  steps: async (tln) => [
    {
      id: 'test', desc: 'Test tln-cli dotenvs feature',
      builder: async (tln, script) => {
        script.set([`
echo Variable from donenv file: \${MY_VAR}
        `]);
      }
    }
  ],
  components: async (tln) => []
}
```

```
> tln test --dry-run
[/root/test-tln]
#!/bin/bash -e
if [ -f ".env" ]; then export $(envsubst < ".env" | grep -v ^# | xargs); fi

echo Variable from donenv file: ${MY_VAR}

> echo MY_VAR=MY_VAL > .env
> tln test 
Variable from donenv file: MY_VAL
```

### Inherits section
Inherits section defines list of components which are used as "base classes" for current component. All steps are defined inside inherited components can be executed in context of current component.
```
module.exports = {
  options: async (tln, args) => {},
  env: async (tln, env) => {
    env.TLN_UID = 'io.project.service.auth';
    env.TLN_VERSION = '21.6.0';
  },
  dotenvs: async (tln) => [],
  inherits: async (tln) => ['docker'],
  depends: async (tln) => [],
  steps: async (tln) => [],
  components: async (tln) => []
}
```

```
> tln docker-build --dry-run --detach
[/root/test-tln]
#!/bin/bash -e

docker build -t io.project.service.auth:21.6.0 .
```

### Depends section
Depends section defines list of components which should be "visible" during tln command execution via environment variables.
```
module.exports = {
  options: async (tln, args) => {},
  env: async (tln, env) => {
  },
  dotenvs: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => ['mvn-3.6.3', 'openjdk-11.0.2', 'go-1.14.4'],
  steps: async (tln) => [],
  components: async (tln) => []
}
```

```
> tln install --depends --detach
> tln exec -c "java -version && mvn -v && go version" --detach
openjdk version "11.0.2" 2019-01-15
OpenJDK Runtime Environment 18.9 (build 11.0.2+9)
OpenJDK 64-Bit Server VM 18.9 (build 11.0.2+9, mixed mode)
Apache Maven 3.6.3 (cecedd343002696d0abb50b32b541b8a6ba2883f)
Maven home: /tmp/tln/maven/mvn-3.6.3
Java version: 11.0.2, vendor: Oracle Corporation, runtime: /tmp/tln/java/openjdk-11.0.2
Default locale: en, platform encoding: UTF-8
OS name: "linux", version: "4.15.0-143-generic", arch: "amd64", family: "unix"
go version go1.14.4 linux/amd64
```

### Steps section
Steps section is a list of isolated steps. Every steps is peace of shell/cmd code is dynamically generated during tln command execution.
```
module.exports = {
  options: async (tln, args) => {},
  env: async (tln, env) => {
  },
  dotenvs: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  steps: async (tln) => [
    {
      id: 'say-hi', desc: 'Say Hi', builder: async (tln, script) => {
        script.set([`
echo Hi from first shell command, component home: ${script.env.TLN_COMPONENT_HOME}
echo Hi from second shell command, component id: ${script.env.TLN_COMPONENT_ID}
        `]);
      }
    }
  ],
  components: async (tln) => []
}
```

```
> tln say-hi
Hi from first shell command, component home: /root/test-tln
Hi from second shell command, component id: /
```

### Components section
Components section is used to define list of nested "virtual" components

```
module.exports = {
  options: async (tln, args) => {},
  env: async (tln, env) => {
  },
  dotenvs: async (tln) => [],
  inherits: async (tln) => [],
  depends: async (tln) => [],
  steps: async (tln) => [],
  components: async (tln) => [
    {
      id: 'component1',
      components: async (tln) => [
        { id: 'component11' },
        { id: 'component12',
          components: async (tln) => [
            { id: 'component121' },
            { id: 'component122' }
          ]
        },
        { id: 'component13' }
      ]
    }
  ]
}
```

```
> tln ls component1 -d 2
 component1 *
 ├ component11 *
 ├ component12 *
 │ ├ component121 *
 │ └ component122 *
 └ component13 *
```
