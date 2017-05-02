# RData Query Server

Based on Express and Mongoose

[![Build Status](https://travis-ci.org/rdata-systems/rdata-query-server.svg?branch=master)](https://travis-ci.org/rdata-systems/rdata-query-server)

## Warning
This software is currently in it's beta stage. The newest versions might (and most likely will) break the backwards compatibility.

## Usage
```javascript
const app = require('rdata-query-server');
app.run();
```

The Query Server is a REST Api server that allows users to pull the data back from the database.

## Accessing the data
The events and contexts logged by [rdata-server](https://github.com/rdata-systems/rdata-server) are returned in a form of REST resources.

# Authorization
Before you make a query, you **must** provide a valid access token in the `Authorization` HTTP header, or URL/body parameter `accessToken`.
The HTTP header must look like this:

| Key | Value | 
| -- | -- |
| Authorization | Bearer: TOKEN123456...| 

Please, refer to the [rdata-auth-server](https://github.com/rdata-systems/rdata-auth-server) for more information regarding access and refresh tokens.


# Querying
This server provides 2 REST Api endpoints, `/contexts` and `/events`.
The same querying rules are applied to both of them.

You can provide the following query paremeters to query the data:

| Source | Key | Description | Default value | Example value | 
| -------|-----|-------------|---------------|---------------|
| GET query or body | `query` | Query for filtering the data. See [MongoDB documentation](https://docs.mongodb.com/manual/tutorial/query-documents/) for the detailed documentation | {} |  { "name": "MyGameEvent" } |
| GET query | `skip` | Skips the provided number of documents | 0 | 5 | 
| GET query | `limit` | Limits the number of document by the provided amount | 0 | 15 | 
| GET query | `sort` | Sorts the result by the provided rule. See [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/cursor.sort/) for the detailed documentation | {} | { "time": "asc" } | 

# Query value examples:
You can provide a MongoDB-style query for filtering the documents.

Here are some useful examples:

`{ "name": "MyAwesomeContext" }` - returns only "MyAwesomeContext" contexts

`{ "name": {"$in": ["MyAwesomeContext", "MySuperContext"]} }` - returns only "MyAwesomeContext" and "MySuperContext" contexts

`{ "data.isCorrect": true }` - returns contexts with data.isCorrect being true

`{ "timeStarted": {"$gte": 1493742320562 } }` - returns contexts that started after *1493742320562*

`{ "timeEnded": {"$lte": 1493742320562 } }` - returns contexts that started before *1493742320562*








