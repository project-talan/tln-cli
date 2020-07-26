# Management of environment variables & dotenv files

Let's go deeper into use cases.

Hierachy bellow represents not very complex stucture, but this will be enought to demonstrate key features.
`project1` and `project2` are stored in separate repositories. At the right side of component, you can see list of environment variables defined at this level (by default they should be stored inside `.env.template` file)
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
    As you can see, this is ready-to-use `.env` file and it can be immediately used with `k8s` or `docker compose`
    
