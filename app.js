/* eslint-disable consistent-return */
/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var express = require("express"), // app server
  bodyParser = require("body-parser"); // parser for post requests
  var hbs = require("hbs");
  //AssistantV1 = require("watson-developer-cloud/assistant/v1"), // watson sdk
  var AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
  var IamAuthenticator = require('ibm-watson/auth').IamAuthenticator;

  var Actions = require('./functions/actions');
var actions = new Actions();

var SearchDocs = require('./functions/searchDocs');
var searchDocs = new SearchDocs();

  

  //var XMLHttpRequest = require("xhr2");

var app = express();

// Bootstrap application settings
app.use(express.static("./public")); // load UI from public folder
app.use(bodyParser.json());

// expres hbs engine
hbs.registerPartials(__dirname + "/views/parciales");
app.set("view engine", "hbs");

app.get("/", function(req, res) {
  res.render("home");
});

// Create the service wrapper
var assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({
    apikey: '4byaLv2phwxodwnkpXfJGS35Xjzf06Xojef-4UtPhizt'
  }),
  url: 'https://api.us-south.assistant.watson.cloud.ibm.com/instances/a81cf0f8-48d2-403b-b687-e77bebe102a6',
});

var date = new Date();
date.setMonth(date.getMonth() + 1);
var initContext = {
  skills: {
    'main skill': {
      user_defined: {
        acc_minamt: 50,
        acc_currbal: 430,
        acc_paydue: date.getFullYear() + '-' + (date.getMonth() + 1) + '-26 12:00:00',
        accnames: [
          5624,
          5893,
          9225,
        ]
      }
    }
  }
};


app.post('/api/message', function (req, res) {
  var assistantId = '0f7d916a-2dae-42e9-be72-440eb5aec7600' || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-intermediate">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-intermediate/blob/master/training/banking_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  var textIn = '';

  if(req.body.input) {
    textIn = req.body.input.text;
  }

  var payload = {
    assistantId: assistantId,
    sessionId: req.body.session_id,
    input: {
      message_type : 'text',
      text : textIn,
    }
  };

  if (req.body.firstCall || req.body.context) {
    payload.context =  req.body.context || initContext;
  }
  // Send the input to the assistant service
  assistant.message(payload, function (err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }

    searchDocs.addDocs(data.result, function () {
      actions.testForAction(data.result, req.body.session_id).then(function (d) {
        return res.json(d);
      }).catch(function (error) {
        return res.json(error);
      });
    });
  });
});

/*//backup v1
var assistant = new AssistantV1({
  // If unspecified here, the ASSISTANT_USERNAME and ASSISTANT_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  username: "apikey",
  password: "4byaLv2phwxodwnkpXfJGS35Xjzf06Xojef-4UtPhizt",
  url: "https://api.us-south.assistant.watson.cloud.ibm.com/instances/a81cf0f8-48d2-403b-b687-e77bebe102a6",
  version: "2018-07-10"
});
// Endpoint to be call from the client side
app.post("/api/message", function(req, res) {
  var workspace = "0f7d916a-2dae-42e9-be72-440eb5aec760";
  if (!workspace) {
    return res.json({
      output: {
        text:
          'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the <a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br> Once a workspace has been defined the intents may be imported from <a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  // Send the input to the assistant service
  assistant.message(payload, function(err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    return res.json(updateMessage(payload, data));
  });
});
*/

app.get('/api/session', function (req, res) {
  assistant.createSession({
    assistantId: '0f7d916a-2dae-42e9-be72-440eb5aec760' || '{assistant_id}',
  }, function (error, response) {
    if (error) {      
      return res.send(error);
    } else {      
      return res.send(response);
    }
  });
});
module.exports = app;
