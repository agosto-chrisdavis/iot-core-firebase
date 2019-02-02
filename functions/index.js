"use strict";

const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const serviceAccount = require("./service.json");
const IotCore = require('./iotcore');
const DeviceManager = require('./manager');

/*
// don't need admin unless we use the db
@type {admin.app.App}
const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
*/

const iotCore = new IotCore(serviceAccount);

function onCorsHttpsRequest(callback) {
  return functions.https.onRequest((request, response) => cors(request, response, () => callback(request,response)));
}

function onPubsubRequest(topic, callback) {
  return functions.pubsub.topic(topic).onPublish((data, context) => callback(data, context));
}

exports.fnVersion = onCorsHttpsRequest((request, response) => DeviceManager.fnVersion(response));

exports.registerIotDevice = onCorsHttpsRequest((request, response) => DeviceManager.registerIotDevice(iotCore,request,response));

exports.onDeviceState = onPubsubRequest(DeviceManager.DEVICE_STATE_TOPIC, (data, context) => DeviceManager.onDeviceState( iotCore, data, context));

exports.onDeviceLogs = onPubsubRequest(DeviceManager.DEVICE_LOGS_TOPIC, (data, context) => DeviceManager.onDeviceLogs( data, context));
