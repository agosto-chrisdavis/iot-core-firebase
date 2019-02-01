/** @module DeviceManager */
'use strict';

const Logging = require('@google-cloud/logging');
const logging = new Logging();
const logName = 'playerlogs';
const log = logging.log(logName);

const REGISTRY_ID = "android";
const API_TOKEN = "1234";
const DEFAULT_CONFIG = {"loggingEnabled":false,"loggingLevel":2};

/**
 * A collection of cloud functions for iot devices
 */
class DeviceManager {


  /**
   * validates header for a Authorization token
   * @param {Request} request @see {@link http://expressjs.com/en/api.html#req}
   * @returns {boolean}
   */
  static hasValidToken(request) {
    const token = request.get('Authorization');
    return this.apiAccessTokens.indexOf(token) !== -1;
  }

  /**
   *
   * @param {admin.app.App} admin  @see {@link https://firebase.google.com/docs/reference/admin/node/admin.app.App}
   * @param {IotCore} iotCore
   * @param {String} deviceId
   * @param {Object} data
   * @return {Promise<Object>}
   */
  static sendCommandToIotDevice(admin,iotCore,deviceId,data) {
    // send normal command
    return iotCore.initializeClient()
      .then(()=>iotCore.sendDeviceCommand(deviceId,REGISTRY_ID,data))
      .catch(error=>{
        console.warn(error);
        data.confirmed = false;
        return Promise.resolve(`${error}`)
      })
  }

  /**
   * current version of the functions
   * @param {Response} response @see {@link http://expressjs.com/en/api.html#res}
   */
  static fnVersion(response) {
    const p = require('./package.json');
    response.status(200).send({'version' : p.version});
  }

  /**
   * @param {admin.app.App} admin  @see {@link https://firebase.google.com/docs/reference/admin/node/admin.app.App}
   * @param {IotCore} iotCore
   * @param {Request} request @see {@link http://expressjs.com/en/api.html#req}
   * @param {Response} response @see {@link http://expressjs.com/en/api.html#res}
   * @return {Promise<any>}
   */
  static registerIotDevice(admin,iotCore, request, response) {
    if(this.hasValidToken(request)) {
      if(request.body.deviceId && request.body.rsaCertificate) {
        const deviceId = request.body.deviceId;
        const rsaCertificate = request.body.rsaCertificate;
        return iotCore.initializeClient()
          .then(()=>iotCore.createRsaDevice(deviceId,REGISTRY_ID,rsaCertificate))
          .then(()=>iotCore.sendDeviceConfig(deviceId,REGISTRY_ID,DEFAULT_CONFIG))
          .then(()=>{
            const data = {projectId:iotCore.projectdId(),registryId:REGISTRY_ID};
            response.status(200).send(data);
            return Promise.resolve(data)
          })
          .catch((error)=>{
            console.warn(error);
            const code = error.code ? error.code: 401;
            response.status(code).send(`Error: ${error}`);
            return Promise.resolve(error)
          });
      }
    }
    response.status(401).send('Invalid Parameters');
    return Promise.resolve({});
  }

  /**
   *
   * @param {admin.app.App} admin  @see {@link https://firebase.google.com/docs/reference/admin/node/admin.app.App}
   * @param {IotCore} iotCore
   * @param {string} deviceId
   * @returns {Promise<object>}
   */
  static resetIotDevice(admin,iotCore,deviceId) {
    const data = {reset:true};
    console.log(`Reseting deciceId ${deviceId} and deviceKey ${deviceKey}`);
    return iotCore.initializeClient()
      .then(()=>iotCore.sendDeviceCommand(deviceId,REGISTRY_ID,data))
      .then(()=>iotCore.deleteDevice(deviceId,REGISTRY_ID))
  }


  /**
   * save device state to firebase db
   * @param {admin.app.App} admin  @see {@link https://firebase.google.com/docs/reference/admin/node/admin.app.App}
   * @param {Object} data
   * @param deviceId
   * @return {Promise<Object>}
   */
  static saveDeviceState(admin,data,deviceId) {
    return admin.database()
      .ref(`states/${deviceId}`)
      .set(data)
      .then(()=>data);
  }

  /**
   * pub/sub event handler for device state
   * @param {admin.app.App} admin  @see {@link https://firebase.google.com/docs/reference/admin/node/admin.app.App}
   * @param {IotCore} iotCore
   * @param {functions.pubsub.Message} data @see https://firebase.google.com/docs/reference/functions/functions.pubsub.Message
   * @param {EventContext} context @see https://firebase.google.com/docs/reference/functions/functions.EventContext
   * @returns {Promise<Object>}
   */
  static onDeviceState(admin,iotCore,data,context) {
    //const state = msg.json;
    if(!data.json || !data.attributes) {
      console.warn(`Invalid device state payload`);
      console.log(data);
      return Promise.resolve(`Invalid device state payload`)
    }
    //console.log(context);
    //console.log(data);
    const deviceId = data.attributes.deviceId;
    console.log(`device state for ${deviceId} ${JSON.stringify(data.json)}`);
    if(deviceId) {
      return this.saveDeviceState(admin,data.json,deviceId)
    } else {
      console.warn(`Invalid deviceId ${deviceId}`)
    }
    return Promise.resolve(false)
  }

  /**
   * pub/sub event handler for device logs
   * @param {admin.app.App} admin  @see {@link https://firebase.google.com/docs/reference/admin/node/admin.app.App}
   * @param {functions.pubsub.Message} data @see https://firebase.google.com/docs/reference/functions/functions.pubsub.Message
   * @param {EventContext} context @see https://firebase.google.com/docs/reference/functions/functions.EventContext
   * @returns {Promise<boolean>}
   */
  static onDeviceLogs(admin,data, context) {
    if(data && data.json && data.attributes) {
      const deviceId = data.attributes.deviceId;
      if(deviceId) {
        const logs = data.json.data;
        const tags = data.json.tags ? data.json.tags : [];
        tags.push({deviceId:deviceId});
        if(logs) {
          return this.writeLogToStackDriver(logs, tags)
            .then(resp => {
              console.log(`added ${logs.length} logs with tags ${JSON.stringify(tags)}`);
              return Promise.resolve(true);
            })
            .catch(error => {
              console.warn(error);
              console.log(data);
              console.log(context);
              return Promise.resolve(false);
            });
        }
      }
    }
    console.warn("Invalid data for device logs:");
    console.log(data);
    console.log(context);
    return Promise.resolve(false)
  }

  /**
   * Send batched entry logs to stackdriver
   * @param {Array.<String>}  batch  logs
   * @param {Array.<Object>} tags  additional information about the log
   * @returns {Promise<LogWriteResponse>}  returns Promise containing LogWriteResponse  @see {@link https://cloud.google.com/nodejs/docs/reference/logging/1.2.x/global#LogWriteResponse}
   */
  static writeLogToStackDriver(batch, tags) {
    const newTagsObj = Object.assign({}, ...tags);
    const metadata = {
      resource: {
        type: 'global'
      },
      labels: newTagsObj
    };
    const entries = batch.map(item => this.log.entry(metadata, item));
    return this.log.write(entries);
  }

}

DeviceManager.apiAccessTokens = [];
DeviceManager.apiAccessTokens.push(API_TOKEN);
DeviceManager.log = log;

if(typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceManager;
}
