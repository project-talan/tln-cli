# Management of environment variables & dotenv files

> Show me your .env file and I will tell you what issues your project has

Managing environment variables is not an easy task to do, especially with SOA or Microservices architecture. In some cases it may require additional abstraction layer to sucessfully address all challenges.

Let's go deeper into use cases.

Hierachy bellow represents not very complex stucture, but this will be enought to demonstrate key features.
For demonstration purpose we can assume that `project1` and `project2` are stored in separate repositories. At the right side of component, you can see list of environment variables defined at component level (by default they should be stored inside `.env.template` file)
```
 /
 └ company
   └ department
     └ teamone
       ├ project1            [VERSION=20.6.0, HUB_HOST=localhost:12321]
       └ project2            [VERSION=20.7.0, HUB_HOST=localhost:32123]
         ├ dbs
         │ ├ mongo           [CONNECTION=localhost:27017]
         │ └ postgresql      [CONNECTION=localhost:5432]
         ├ msgbrs
         │ └ kafka           [BOOTSTRAP_SERVERS=localhost:29092]
         └ services          [HOST=myserver.io]
           ├ api             [PORT=9081]
           └ auth            [PORT=9082]
```

* First obvious step is to collect all variables from project's root. If we execute next command from `company/department/teamone/project1`
  > \> tln dotenv --downstream=2
  
    the output will be (by default, it will be stored inside `.env` file)
    ```
      DBS_MONGO_CONNECTION=localhost:27017
      DBS_POSTGRESQL_CONNECTION=localhost:5432
      HUB_HOST=localhost:32123
      MSGBRS_KAFKA_BOOTSTRAP_SERVERS=localhost:29092
      SERVICES_API_PORT=9081
      SERVICES_AUTH_PORT=9082
      SERVICES_HOST=myserver.io
      VERSION=20.7.0
    ```
    As you can see, this is complete `.env` file and it can be used by `k8s` or `docker-compose`
    
* When you need to debug specific component, you can collect environment variables not only from nested components, but also from parents. Run bellow command from `company/department/teamone/project1/services/api`
   > \> tln dotenv --upstream=2
    ```
     DBS_MONGO_CONNECTION=localhost:27017
     DBS_POSTGRESQL_CONNECTION=localhost:5432
     HUB_HOST=localhost:32123
     MSGBRS_KAFKA_BOOTSTRAP_SERVERS=localhost:29092
     PORT=9081
     SERVICES_AUTH_PORT=9082
     SERVICES_HOST=myserver.io
     VERSION=20.7.0
    ```
    The difference is that `api` component is used as an anchor and all other variables are constructed relative to it. Variable `PORT` was generated without any prefixes.
    
You can combine both options `--upstream` and `--downstream` to achieve any traversal scenario required by your use case.   

## Full command specification
```
tln dotenv [--upstream=<uint>] [--downstream=<uint>] [--input=<string>] [--output=<string>] [--prefix=<string>]
```
| Option name  | Description | Default |
| ------------- | ------------- | ------------- |
| upstream  | Number of levels above current component | 0 |
| downstream  | Number of levels below current component | 0 |
| input  | Input template file name | .env.template  |
| output  | Output file name | .env  |
| prefix  | String which will be prepended to each variable name | null  |
