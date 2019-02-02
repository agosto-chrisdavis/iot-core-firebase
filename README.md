# Iot Core Firebase example

Companion code for the **IoT Core for Android Developers** example app found at  
https://github.com/agosto-chrisdavis/iot-core-android

A collection of cloud functions to assist with device registration and management with in Iot Core.  
https://cloud.google.com/iot-core/


## Setup

### Create firebase project* 

https://console.firebase.google.com/

Then add a `.firebaserc` file to the main directory of this project.  Should look like this but with your project id.

```json
{
  "projects": {
    "default": "agosto-iot-core-demo"
  }
}
```

*You *might* need to enable billing to deploy and run this project.

###  Setup IoT Core

Enable Iot Core in GCP console:

https://console.cloud.google.com/iot/registries?project=agosto-iot-demo&folder&organizationId=297169914265

Create Device Registry 

- Name it `android`
- Use `us-central1` region
- Create a state pub/sub topic named `android-state` for the device state topic
- Create a pub/sub topic named `android-logs` for the default telemetry topic

###  Create and download a service account.

https://firebase.google.com/docs/admin/setup

File should look something like this:

```JSON
{
  "type": "service_account",
  "project_id": "agosto-iot-core-demo",
  "private_key_id": "",
  "private_key": "",
  "client_email": "",
  "client_id": "",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-lce9n%40agosto-iot-core-demo.iam.gserviceaccount.com"
}

```

###  Deploy Cloud functions

Installed the CLI tools:

```$ npm install -g firebase-tools```

Deploy functions:

```$ firebase deploy --only functions```

https://firebase.google.com/docs/functions/get-started#deploy-and-execute-addmessage
