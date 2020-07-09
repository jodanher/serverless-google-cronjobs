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

    this.jobService = new JobServices(google, credentials);

    this.hooks = {
      'interactiveCli:initializeService': () => this.log('interactiveCli:initializeService'),
      'interactiveCli:setupAws': () => this.log('interactiveCli:setupAws'),
      'interactiveCli:tabCompletion': () => this.log('interactiveCli:tabCompletion'),
      'before:config:credentials:config': () => this.log('before:config:credentials:config'),
      'after:config:credentials:config': () => this.log('after:config:credentials:config'),
      'config:tabcompletion:install:install': () => this.log('config:tabcompletion:install:install'),
      'config:tabcompletion:uninstall:uninstall': () => this.log('config:tabcompletion:uninstall:uninstall'),
      'create:create': () => this.log('create:create'),
      'install:install': () => this.log('install:install'),
      'package:createDeploymentArtifacts': () => this.log('package:createDeploymentArtifacts'),
      'package:function:package': () => this.log('package:function:package'),
      'before:deploy:deploy': () => this.log('before:deploy:deploy'),
      'after:deploy:deploy': () => this.log('after:deploy:deploy'),
      'invoke:local:loadEnvVars': () => this.log('invoke:local:loadEnvVars'),
      'after:invoke:invoke': () => this.log('after:invoke:invoke'),
      'after:invoke:local:invoke': () => this.log('after:invoke:local:invoke'),
      'after:info:info': () => this.log('after:info:info'),
      'after:logs:logs': () => this.log('after:logs:logs'),
      'after:metrics:metrics': () => this.log('after:metrics:metrics'),
      'print:print': () => this.log('print:print'),
      'after:remove:remove': () => this.log('after:remove:remove'),
      'after:rollback:rollback': () => this.log('after:rollback:rollback'),
      'slstats:slstats': () => this.log('slstats:slstats'),
      'plugin:plugin': () => this.log('plugin:plugin'),
      'plugin:install:install': () => this.log('plugin:install:install'),
      'plugin:uninstall:uninstall': () => this.log('plugin:uninstall:uninstall'),
      'plugin:list:list': () => this.log('plugin:list:list'),
      'plugin:search:search': () => this.log('plugin:search:search'),
      'config:credentials:config': () => this.log('config:credentials:config'),
      'aws:common:validate:validate': () => this.log('aws:common:validate:validate'),
      'aws:common:cleanupTempDir:cleanup': () => this.log('aws:common:cleanupTempDir:cleanup'),
      'aws:common:moveArtifactsToPackage:move': () => this.log('aws:common:moveArtifactsToPackage:move'),
      'aws:common:moveArtifactsToTemp:move': () => this.log('aws:common:moveArtifactsToTemp:move'),
      'package:cleanup': () => this.log('package:cleanup'),
      'package:initialize': () => this.setup(),
      'package:setupProviderConfiguration': () => this.log('package:setupProviderConfiguration'),
      'before:package:compileFunctions': () => this.log('before:package:compileFunctions'),
      'before:package:compileLayers': () => this.log('before:package:compileLayers'),
      'package:finalize': () => this.log('package:finalize'),
      'aws:package:finalize:mergeCustomProviderResources': () => this.log('aws:package:finalize:mergeCustomProviderResources'),
      'aws:package:finalize:saveServiceState': () => this.log('aws:package:finalize:saveServiceState'),
      'deploy:deploy': () => this.log('deploy:deploy'),
      'deploy:finalize': () => this.log('deploy:finalize'),
      'aws:deploy:deploy:createStack': () => this.log('aws:deploy:deploy:createStack'),
      'aws:deploy:deploy:checkForChanges': () => this.log('aws:deploy:deploy:checkForChanges'),
      'aws:deploy:deploy:uploadArtifacts': () => this.log('aws:deploy:deploy:uploadArtifacts'),
      'aws:deploy:deploy:validateTemplate': () => this.log('aws:deploy:deploy:validateTemplate'),
      'aws:deploy:deploy:updateStack': () => this.log('aws:deploy:deploy:updateStack'),
      'aws:deploy:finalize:cleanup': () => this.log('aws:deploy:finalize:cleanup'),
      'invoke:invoke': () => this.log('invoke:invoke'),
      'info:info': () => this.log('info:info'),
      'aws:info:validate': () => this.log('aws:info:validate'),
      'aws:info:gatherData': () => this.log('aws:info:gatherData'),
      'aws:info:displayServiceInfo': () => this.log('aws:info:displayServiceInfo'),
      'aws:info:displayApiKeys': () => this.log('aws:info:displayApiKeys'),
      'aws:info:displayEndpoints': () => this.log('aws:info:displayEndpoints'),
      'aws:info:displayFunctions': () => this.log('aws:info:displayFunctions'),
      'aws:info:displayLayers': () => this.log('aws:info:displayLayers'),
      'aws:info:displayStackOutputs': () => this.log('aws:info:displayStackOutputs'),
      'logs:logs': () => this.log('logs:logs'),
      'metrics:metrics': () => this.log('metrics:metrics'),
      'remove:remove': () => this.log('remove:remove'),
      'before:rollback:initialize': () => this.log('before:rollback:initialize'),
      'rollback:rollback': () => this.log('rollback:rollback'),
      'rollback:function:rollback': () => this.log('rollback:function:rollback'),
      'package:compileLayers': () => this.log('package:compileLayers'),
      'package:compileFunctions': () => this.log('package:compileFunctions'),
      'package:compileEvents': () => this.log('package:compileEvents'),
      'before:remove:remove': () => this.log('before:remove:remove'),
      'after:package:finalize': () => this.log('after:package:finalize'),
      'deploy:function:initialize': () => this.log('deploy:function:initialize'),
      'deploy:function:packageFunction': () => this.log('deploy:function:packageFunction'),
      'deploy:function:deploy': () => this.log('deploy:function:deploy'),
      'before:deploy:list:log': () => this.log('before:deploy:list:log'),
      'before:deploy:list:functions:log': () => this.log('before:deploy:list:functions:log'),
      'deploy:list:log': () => this.log('deploy:list:log'),
      'deploy:list:functions:log': () => this.log('deploy:list:functions:log'),
      'before:invoke:local:loadEnvVars': () => this.log('before:invoke:local:loadEnvVars'),
      'invoke:local:invoke': () => this.log('invoke:local:invoke'),
      'upgrade:upgrade': () => this.log('upgrade:upgrade'),
      'uninstall:uninstall': () => this.log('uninstall:uninstall'),
      'before:package:finalize': () => this.log('before:package:finalize'),
      'after:aws:package:finalize:mergeCustomProviderResources': () => this.log('after:aws:package:finalize:mergeCustomProviderResources'),
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
