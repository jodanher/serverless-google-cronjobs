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

    // console.log(this.serverless.pluginManager.hooks);

    this.jobService = new JobServices(google, credentials);
    this.hooks = {
      'after:deploy:deploy': () => this.setup('after:deploy:deploy'),
    };
  }

  log(name) {
    if (this.options.verbose) {
      const slsCli = this.serverless.cli;
      slsCli.log(name);
    }
  }

  setup = (hook) => {
    this.log(hook);
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

        const event = fn.events.filter(({ event }) => event).map(({ event }) => event).find(({ schedule }) => schedule);
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
        resource: topicName,
        schedule,
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
