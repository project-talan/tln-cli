# What is Component?

**Components is an element of hierarchical structure which stores information involved in software development.**

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
