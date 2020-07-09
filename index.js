'use strict';

const { google } = require('googleapis');

class JobServices {
  constructor(googleLib, credentials) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentials;

    const auth = new googleLib.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    this.auth = auth.getClient();

    this.cloudscheduler = googleLib.cloudscheduler('v1');
  }

  commandJob = async (action, params) => {
    const auth = await this.auth;
    const request = {
      auth,
      ...params,
    };
    return this.cloudscheduler.projects.locations.jobs[action](request);
  }

  listJob = (parent) => {
    return this.commandJob('list', { parent });
  }

  createJob = (parent, resource) => {
    return this.commandJob('create', { parent, resource });
  }

  patchJob = (name, resource) => {
    return this.commandJob('patch', { name, resource });
  }

  deleteJob = (name) => {
    return this.commandJob('delete', { name });
  }
}

class ServerlessPlugin {

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    const {
      provider: { name, credentials },
    } = serverless.service;

    if (name !== 'google') {
      throw new Error('Compatible plug-in only for google provider');
    }

    console.log(this.serverless.pluginManager.hooks);

    this.jobService = new JobServices(google, credentials);

    this.hooks = {
      'before:config:credentials:config': () => this.log('before:config:credentials:config'),
      'after:config:credentials:config': () => this.log('after:config:credentials:config'),
      'create:create': () => this.log('create:create'),
      'install:install': () => this.log('install:install'),
      'before:package:cleanup': () => this.log('before:package:cleanup'),
      'package:createDeploymentArtifacts': () => this.log('package:createDeploymentArtifacts'),
      'package:function:package': () => this.log('package:function:package'),
      'before:deploy:deploy': () => this.log('before:deploy:deploy'),
      'after:deploy:deploy': () => this.setup(),
      'invoke:local:loadEnvVars': () => this.log('invoke:local:loadEnvVars'),
      'after:invoke:invoke': () => this.log('after:invoke:invoke'),
      'after:invoke:local:invoke': () => this.log('after:invoke:local:invoke'),
      'after:info:info': () => this.log('after:info:info'),
      'after:logs:logs': () => this.log('after:logs:logs'),
      'login:login': () => this.log('login:login'),
      'logout:logout': () => this.log('logout:logout'),
      'after:metrics:metrics': () => this.log('after:metrics:metrics'),
      'after:remove:remove': () => this.log('after:remove:remove'),
      'after:rollback:rollback': () => this.log('after:rollback:rollback'),
      'slstats:slstats': () => this.log('slstats:slstats'),
      'config:credentials:config': () => this.log('config:credentials:config'),
    };
  }

  log(name) {
    if (this.options.verbose) {
      const slsCli = this.serverless.cli;
      slsCli.log(name, 'Hook');
    }
  }

  setup = () => {
    const { service } = this.serverless;
    const { provider, functions } = service;

    this.createScheduleEvent(provider, functions);
  }

  getJobName = (parent, name) => {
    return `${parent}/jobs/${name}-job`;
  }

  findScheduleEvents = async (functions = {}, parent) => {
    const { data: { jobs = [] } } = await this.jobService.listJob(parent);
    const jobNames = jobs.map(job => job.name);

    return Object.keys(functions)
      .map(name => {
        const fn = functions[name];
        const jobName = this.getJobName(parent, fn.name);

        const event = fn.events.find(event => Object.keys(event).includes('schedule'));
        const jobExists = jobNames.includes(jobName);

        let action = 'none';
        if (event) {
          action = jobExists ? 'update' : 'create';
        } else if (jobExists) {
          action = 'remove';
        }

        return {
          action,
          functionName: fn.name,
          event,
        };
      });
  }

  executeJobAction = async (parent, scheduleEvent) => {
    const { functionName, event, action } = scheduleEvent;

    const name = this.getJobName(parent, functionName);

    let response;
    if (action === 'remove') {
      response = await this.jobService.deleteJob(name);
    } else {
      const {
        schedule: {
          rate: schedule,
          resource: topicName,
        },
      } = event;

      const resource = {
        schedule,
        pubsubTarget: {
          topicName,
          attributes: {
            timestamp: Date.now().toString(),
          },
        },
      };
      switch (action) {
        case 'create':
          response = await this.jobService.createJob(parent, { ...resource, name });
          break;
        case 'update':
          response = await this.jobService.patchJob(name, resource);
          break;
      }
    }

    return response;
  }

  createScheduleEvent = async (provider, functions) => {
    const { project, region } = provider;

    const parent = `projects/${project}/locations/${region}`;

    const scheduleEvents = await this.findScheduleEvents(functions, parent);

    const filtered = scheduleEvents.filter(({ action }) => action !== 'none');
    if (filtered.length) {
      const promises = filtered.map(async (scheduleEvent) => {
        const response = await this.executeJobAction(parent, scheduleEvent);

        if (this.options.verbose) {
          const slsCli = this.serverless.cli;
          slsCli.log(`Job ${response.config.method} action[${scheduleEvent.action}] ${response.data.name ? response.data.name : ''}`);
        }

        return response;
      });

      const response = await Promise.all(promises);
      console.log(response.length);
    }
  }
}

module.exports = ServerlessPlugin;
