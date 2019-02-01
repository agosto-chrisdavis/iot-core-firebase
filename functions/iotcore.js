"use strict";

const {google} = require('googleapis');
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';

class IotCore {

  /**
   * @param {object} serviceAccount
   * @param {string} serviceAccount.project_id
   * @return {IotCore}
   */
  constructor(serviceAccount) {
    this.client = null;
    this.serviceAccount = serviceAccount
  }

  /**
   * Creates a new iot core client from the googleapis module
   * @returns {Promise<IotCore>}
   */
  initializeClient /* istanbul ignore next */ () {
    if(this.client) {
      return Promise.resolve(this)
    }
    return IotCore.getIotClient(this.serviceAccount).then(client=>{
      this.client = client;
      return this
    })
  }

  /**
   * gets a device from iot core for deviceId in registryId
   * @param {string }deviceId
   * @param {string} registryId
   * @returns {Promise<any>}
   */
  getDevice(deviceId,registryId) {
    const devicePath = `projects/${this.projectdId()}/locations/us-central1/registries/${registryId}/devices/${deviceId}`;
    return new Promise((resolve, reject) => {
      this.client.projects.locations.registries.devices.get({name: devicePath},
        (err, res) => {
          if (err) {
            console.warn('Could not find device');
            //console.log(err);
            reject(err)
          } else {
            console.log(`Device ${deviceId} found in ${registryId}`);
            resolve(res.data)
          }
        });
    });
  }

  /**
   * creates new device using an rsa cert in the default registry
   * @param deviceId
   * @param registryId
   * @param rsaCertificate
   * @return {Promise<any>}
   */
  createRsaDevice (deviceId, registryId, rsaCertificate) {
    const registryPath = `projects/${this.projectdId()}/locations/us-central1/registries/${registryId}`;
    return new Promise((resolve, reject) => {
      const params = {
        parent: registryPath,
        resource: {
          id: deviceId,
          credentials: [
            {
              publicKey: {
                format: 'RSA_X509_PEM',
                key: rsaCertificate
              }
            }
          ]
        }
      };
      console.log(JSON.stringify(params));
      this.client.projects.locations.registries.devices.create(params, (err, res) => {
        if (err) {
          console.log('Could not create device');
          //console.log(err);
          reject(err)
        } else {
          console.log('Created device');
          resolve(res.data)
        }
      });
    });
  }

  /**
   * sends config via iot core for deviceId in registryId
   * @param {string} deviceId
   * @param {string} registryId
   * @param {object} data
   * @returns {Promise<any>}
   */
  sendDeviceConfig(deviceId, registryId, data) {
    return new Promise((resolve, reject) => {
      const devicePath = `projects/${this.projectdId()}/locations/us-central1/registries/${registryId}/devices/${deviceId}`;
      const binaryData = Buffer.from(JSON.stringify(data)).toString('base64');
      const request = {
        name: devicePath,
        binaryData: binaryData
      };
      this.client.projects.locations.registries.devices.modifyCloudToDeviceConfig(request,
        (err, data) => {
          if (err) {
            console.log('Could not update config:', deviceId);
            console.log('Message: ', err);
            reject(err)
          } else {
            console.log('Config Success :', data);
            resolve(data);
          }
        });
    })
  }

  /**
   * sends command via iot core for deviceId in registryId
   * @param {string} deviceId
   * @param {string} registryId
   * @param {object} data
   * @returns {Promise<any>}
   */
  sendDeviceCommand(deviceId, registryId, data) {
    return new Promise((resolve, reject) => {
      const devicePath = `projects/${this.projectdId()}/locations/us-central1/registries/${registryId}/devices/${deviceId}`;
      const binaryData = Buffer.from(JSON.stringify(data)).toString('base64');
      const request = {
        name: devicePath,
        binaryData: binaryData
      };
      this.client.projects.locations.registries.devices.sendCommandToDevice(request,
        (err, data) => {
          if (err) {
            console.log('Could not send command:', deviceId);
            console.log('Message: ', err);
            reject(err)
          } else {
            console.log('Command Success :', data);
            resolve(data);
          }
        });
    })
  }

  /**
   * * deletes device in iot core for deviceId in registryId
   * @param {string} deviceId
   * @param {string} registryId
   * @returns {Promise<Object>}
   */
  deleteDevice(deviceId, registryId) {
    return new Promise((resolve, reject) => {
      const devicePath = `projects/${this.projectdId()}/locations/us-central1/registries/${registryId}/devices/${deviceId}`;
      const request = {
        name: devicePath,
      };
      this.client.projects.locations.registries.devices.delete(request,
        (err, data) => {
          if (err) {
            console.log('Could not delete:', deviceId);
            console.log('Message: ', err);
            reject(err)
          } else {
            console.log('Delete Success :', data);
            resolve(data);
          }
        });
    })
  }

  /**
   * gets current project id for service account used buy this instance
   * @returns {string}
   */
  projectdId() {
    return this.serviceAccount.project_id;
  }

  /**
   * creates a new instance of google iot core api client
   * @param serviceAccount
   * @returns {Promise<Readonly<Endpoint>>}
   */
  static getIotClient /* istanbul ignore next */ (serviceAccount) {
    const jwtAccess = new google.auth.JWT();
    jwtAccess.fromJSON(serviceAccount);
    // Note that if you require additional scopes, they should be specified as a
    // string, separated by spaces.
    jwtAccess.scopes = 'https://www.googleapis.com/auth/cloud-platform';
    // Set the default authentication to the above JWT access.
    google.options({ auth: jwtAccess });

    const discoveryUrl = `${DISCOVERY_API}?version=${API_VERSION}`;

    return google.discoverAPI(discoveryUrl);
  }

}

if(typeof module !== 'undefined' && module.exports) {
  module.exports = IotCore;
}
