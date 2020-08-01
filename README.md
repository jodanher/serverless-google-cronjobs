# serverless-google-cronjobs

## Pre-request
Follow below link to setup google account for deploying your first serveless application. [Google account setup](https://www.serverless.com/framework/docs/providers/google/guide/credentials/)

## Setup

### Install Serverless
```bash
npm install -g serverless
```
### Install Plugin
```bash
npm install serverless-google-cronjobs
```

## Setting the credentials and project
Update the ``credentials`` and your ``project`` property in the ``serverless.yml`` file.

## Usage

Update the plugin list in the ``serverless.yml`` file.
```yaml
plugins:
  - serverless-google-cronjobs
```
Set schedule property in the your function's parameters
```yaml
functions
  hello:
    handler: hello
    events:
      - event:
          eventType: providers/cloud.pubsub/eventTypes/topic.publish
          resource: 'projects/<projectId>/topics/<topicName>'
          schedule: '* * * * *' # required
          timeZone: 'UTC' # optional
          target: pubsubTarget, appEngineHttpTarget or httpTarget # required
```

>[schedule](https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules)

>[timeZone](https://cloud.google.com/dataprep/docs/html/Supported-Time-Zone-Values_66194188#american-time-zones)

>[target](hhttps://cloud.google.com/scheduler/docs/reference/rest/v1/projects.locations.jobs?hl=pt-br)