/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `yarn install`
 * 3. Add your VERIFY_TOKEN and PAGE_ACCESS_TOKEN to your environment vars
 */

'use strict';

// Use dotenv to read .env vars into Node
require('dotenv').config();

// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  { urlencoded, json } = require('body-parser'),
  app = express();

const firebase = require("firebase/app")
require("firebase/firestore")

var firebaseConfig = {
  apiKey: "AIzaSyCpAxua59Wnmb3IOODt7kltAjj8kW0tqjE",
  authDomain: "i-order-test.firebaseapp.com",
  projectId: "i-order-test",
  storageBucket: "i-order-test.appspot.com",
  messagingSenderId: "942683266626",
  appId: "1:942683266626:web:26d3220a1eebd5fa3a97db",
  measurementId: "G-YMV4CGP7DR"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Parse application/x-www-form-urlencoded
app.use(urlencoded({ extended: true }));

// Parse application/json
app.use(json());

// Respond with 'Hello World' when a GET request is made to the homepage
app.get('/', function (_req, res) {
  console.log('get!');
  let firestore = firebase.firestore()
  firestore.collection("webhookEvent").where("senderId", "==", '3741760685883256')
    .get()
    .then((querySnapshot) => {
      var response = [];
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
        response.push(doc.data());
        console.log(response.length, " === ", querySnapshot.size);
        if (response.length === querySnapshot.size) {
          res.send(response);
        }
      });
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);
      res.send('Error getting documents');
    });

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
  console.log('get webhook!');

  // Your verify token. Should be a random string.
  // const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const VERIFY_TOKEN = "TokenOrderHub";

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Creates the endpoint for your webhook
app.post('/webhook', (req, res) => {
  console.log('post webhook!');
  let firestore = firebase.firestore()

  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === 'page') {
    console.log(body);
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {

      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      // console.log(entry);

      // Get the sender ID
      let senderId = webhookEvent.sender.id;
      console.log('Sender ID: ' + senderId);
      // Get the recipient ID
      let recipientId = webhookEvent.recipient.id;
      console.log('recipient ID: ' + recipientId);
      let ids = recipientId+"_"+senderId;
      if (webhookEvent.message) {
        let receivedMessage = webhookEvent.message;
        var text = "";
        var type = "";
        if (receivedMessage.text) {
          text = receivedMessage.text;
          type = "text";
        } else if (receivedMessage.attachments) {
          // console.log(">>>>>>>>>>>>>>>>>>>>>");
          // console.log(receivedMessage);
          // console.log(receivedMessage.attachments[0]);
          // console.log(">>>>>>>>>>>>>>>>>>>>>");
          text = receivedMessage.attachments[0].payload.url;
          type = receivedMessage.attachments[0].type;
          if(receivedMessage.attachments[0].payload.sticker_id){
            type = "sticker";
          }
        }
        let message = webhookEvent.message;
        var sfDocRef = firestore.collection("webhookEvent").doc(ids);

        firestore.runTransaction((transaction) => {
            return transaction.get(sfDocRef).then((sfDoc) => {
              const dateObject = new Date(webhookEvent.timestamp);
              var messageMap = { 
                timestamp: dateObject, 
                text: text, 
                type: type,
                messageId: message.mid, 
                epoch: webhookEvent.timestamp,
                owner: 'customer',
                isRead: 1
              };
                if (!sfDoc.exists) {
                  var messageList = [];
                  messageList.push(messageMap);

                  var data = {
                    messageId: message.mid,
                    message: text,
                    type: type,
                    senderId: senderId,
                    recipientId: recipientId,
                    epoch: webhookEvent.timestamp,
                    timestamp: dateObject,
                    messageList: messageList
                  }
                  console.log(data);
                  sfDocRef.set(data);
                  return "create success";
                }
                var messageList = sfDoc.data().messageList;
                messageList.push(messageMap);

                var data = {
                  messageId: message.mid,
                  message: text,
                  type: type,
                  senderId: senderId,
                  recipientId: recipientId,
                  epoch: webhookEvent.timestamp,
                  timestamp: dateObject,
                  messageList: messageList
                }
                console.log(data);
                transaction.update(sfDocRef, data);

                return "update success";
                // var newPopulation = sfDoc.data().population + 1;
                // if (newPopulation <= 1000000) {
                //     transaction.update(sfDocRef, data);
                //     return newPopulation;
                // } else {
                //     return Promise.reject("Sorry! Population is too big.");
                // }
            });
        }).then((state) => {
            console.log(state);
        }).catch((err) => {
            // This will be an "population is too big" error.
            console.error(err);
        });

        // firestore.collection("webhookEvent")
        //   .doc(ids)
        //   .set(data)
        //   // .add(data)
        //   .then(function (doc) {
        //     //  console.info(doc) 
        //   }).catch(function (error) {
        //     console.error(error)
        //   });


        // firestore.collection("webhookEvent")
        // .add(webhookEvent)
        // .then(function(doc){ 
        //   console.info(doc.id) 
        // }).catch(function(error){ 
        //     console.error(error) 
        // });

      }


      // callSendAPI(senderPsid, webhookEvent.message.text);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      // if (webhookEvent.message) {
      //   handleMessage(senderPsid, webhookEvent.message);
      // } else if (webhookEvent.postback) {
      //   handlePostback(senderPsid, webhookEvent.postback);
      // }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {

    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

function addValue(value, aMap) {
  aMap = aMap || [];
  aMap.push(value);
}

function addValueToKey(key, value, aMap) {
    aMap[key] = aMap[key] || [];
    aMap[key].push(value);
}

// Handles messages events
function handleMessage(senderPsid, receivedMessage) {
  let response;

  // Checks if the message contains text
  if (receivedMessage.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of your request to the Send API
    response = {
      'text': `You sent the message: '${receivedMessage.text}'. Now send me an attachment!`
    };
  } else if (receivedMessage.attachments) {

    // Get the URL of the message attachment
    let attachmentUrl = receivedMessage.attachments[0].payload.url;
    response = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [{
            'title': 'Is this the right picture?',
            'subtitle': 'Tap a button to answer.',
            'image_url': attachmentUrl,
            'buttons': [
              {
                'type': 'postback',
                'title': 'Yes!',
                'payload': 'yes',
              },
              {
                'type': 'postback',
                'title': 'No!',
                'payload': 'no',
              }
            ],
          }]
        }
      }
    };
  }

  // Send the response message
  callSendAPI(senderPsid, response);
}

// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
  let response;

  // Get the payload for the postback
  let payload = receivedPostback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { 'text': 'Thanks!' };
  } else if (payload === 'no') {
    response = { 'text': 'Oops, try sending another image.' };
  }
  // Send the message to acknowledge the postback
  callSendAPI(senderPsid, response);
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, text) {

  // The page access token we have generated in your app settings
  // const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const PAGE_ACCESS_TOKEN = "EAAQAU40wctABACRuCSlF8bZAgZC3Uk26Pjal5KIkx2zsbmgh0KLriV7tHTZBYr4WRNwgOjvdXmdM1OAHaSuqZAfOt5iDELrS8RJKpB0l3yw6VFzjAMvkywgayO81Lcbtz0Ds9P0KypluaCcYxRr0lBqZB4bDchza6ZCYW97Gndg25nWCZBaTZBtyT46FlxChp8pnSHl6KdTfFAZDZD";

  const PAGE_ACCESS_TOKEN_V1 = "EAAQAU40wctABADENayzB6RyE67VixNrrGhod6ZCUJcu6DWc62mRUvla8j8Mk8gTbIKGaZBfElf6HRciuk3X2wDcgPy3ZCLrZBlHqPOYQI8qvYeTdWq9Qa6NrUF30Oh21cqt8753KHkwoYqTYTzZBnuMMC2tHaFYJmomoOZC0biRmkuUCXucW0yChmscl55ALZAQ6ZBr9hwsZB6gZDZD";

  // Construct the message body
  let requestBody = {
    'recipient': {
      'id': senderPsid
    },
    'message': {
      'text': text
    }
  };

  // Send the HTTP request to the Messenger Platform
  request({
    'uri': 'https://graph.facebook.com/v10.0/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err) {
      console.log('Message sent!');
    } else {
      console.error('Unable to send message:' + err);
    }
  });

  request({
    'uri': 'https://graph.facebook.com/v10.0/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN_V1 },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err) {
      console.log('Message sent!');
    } else {
      console.error('Unable to send message:' + err);
    }
  });
}

// listen for requests :)
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
