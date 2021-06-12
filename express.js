'use strict';

const Telnyx = require('telnyx');
const Express = require('express');
const logger = require("morgan");
const bodyParser = require('body-parser');
const app = Express();
const fs = require('fs');
const log4js = require('log4js');
const path = require('path');
const axios = require('axios');

const IVRRECEIVEURL3 = 'http://3.142.237.36:5000';
// TTS Options
const g_ivr_voice = "female";
const g_ivr_language = "en-GB";

log4js.configure({
  appenders: {
    everything: { type: 'dateFile', base: 'logs/', filename: 'all-the-logs.log' }
  },
  categories: {
    default: { appenders: ['everything'], level: 'debug' }
  }
});
/**
 * You'll need to make sure this is externally accessible. ngrok (https://ngrok.com/)
 * makes this really easy.
 *
 * To run this file, just provide your Secret API Key and Webhook Secret, like so:
 * TELNYX_API_KEY=KEYXXX TELNYX_PUBLIC_KEY=ZZZXXX node express.js
 */

const apiKey = process.env.TELNYX_API_KEY;
const publicKey = process.env.TELNYX_PUBLIC_KEY;

const g_connection_id = '1110011011';
let hangup = false;

const telnyx = Telnyx(apiKey);
const __logger = log4js.getLogger('IVR');
let userdata = {}
app.post('/incomingcall', bodyParser.json(), async function (req, res) {
  var event;
  try {
    event = telnyx.webhooks.constructEvent(
      // webhook data needs to be passed raw for verification
      JSON.stringify(req.body, null, 2),
      req.header('telnyx-signature-ed25519'),
      req.header('telnyx-timestamp'),
      publicKey
    );
  } catch (e) {
    // If `constructEvent` throws an error, respond with the message and return.
    console.log('Error', e.message);
    return res.status(400).send('Webhook Error:' + e.message);
  }

  console.log("EVENT TYPE =>", event.data.event_type);

  // Call Initiated >> Command Dial
  if (event.data.event_type === 'call.initiated') {
    // Inbound Call
    console.log("===========================");
    console.log('INCOMING CALL INITIATED');
    if (event.data.payload.direction == "incoming") {
      const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });
      call.answer();
    } else if (event.data.payload.direction == "outgoing") {
      res.end();
    }

    // Webhook Dial answered by User - Command Gather Using Speak
  } else if (event.data.event_type == "call.answered") {
    console.log("===========================");
    console.log('INCOMING CALL ANSWERED');
    userdata = {
      from: event.data.payload.from,
      to: event.data.payload.to
    }
    // Gather Using Speak - Present Menu to Forwading destination, 1 to Accept and Bride Call, 2 to Reject and Send to System Voicemail
    const gather = new telnyx.Call({
      call_control_id: event.data.payload.call_control_id,
    });
    gather.gather_using_audio({
      audio_url: 'http://3.142.237.36/assets/dist/file/author.mp3',
      valid_digits: "12",
      invalid_audio_url: "http://3.142.237.36/assets/dist/file/author.mp3",
      timeout_secs: "30"
    })

  } else if (event.data.event_type === 'call.playback.ended') {
    console.log('playback ended', event);

    telnyx.messages
      .create({
        from: userdata.to, // Your Telnyx number
        to: userdata.from,
        text: `Please fill out the form by clicking the link, and one of our acquisition specialists will contact you shortly. http://3.142.237.36`,
      })
      .then(function (response) {
        console.log('response message success', response);
        const message = response.data; // asynchronously handled
        const gather = new telnyx.Call({
          call_control_id: event.data.payload.call_control_id,
        });
        gather.gather_using_audio({
          audio_url: 'http://3.142.237.36/assets/dist/file/thanks.mp3',
          timeout_secs: "30"
        })
        gather.hangup();
      }).catch(err => {
        console.error(err);
      })


    // try {
    //   console.log("after audio before speak");
    //   let l_client_state = {
    //     clientState: "stage-bridge",
    //     bridgeId: event.data.payload.call_control_id,
    //   };

    //   const gather = new telnyx.Call({
    //     call_control_id: event.data.payload.call_control_id,
    //   });

    //   gather.gather_using_speak({
    //     payload: "Hello,  Welcome to Quote On home, to continue press 1, press 2 to reject",
    //     voice: g_ivr_voice,
    //     language: g_ivr_language,
    //     valid_digits: "12",
    //     invalid_payload: "Please, enter the valid input",

    //     // timeout_secs: "30"
    //   });
    // } catch (ex) {
    //   console.error('ERROR ON CALL PLAYBACK ENDED')
    //   console.error(ex);
    // }
    // gather.hangup();
    // Webhook client_state set to stage-voicemail-greeting, we are able to execute SPEAK which is acting as our Voicemail Greeting
  } else if (event.data.event_type === 'call.dtmf.received') {
    
  }

});


app.post('/incomingcall2', bodyParser.json(), async function (req, res) {
  console.log('receive incoming 3');
  var event;
  try {
    event = telnyx.webhooks.constructEvent(
      // webhook data needs to be passed raw for verification
      JSON.stringify(req.body, null, 2),
      req.header('telnyx-signature-ed25519'),
      req.header('telnyx-timestamp'),
      publicKey
    );
  } catch (e) {
    // If `constructEvent` throws an error, respond with the message and return.
    console.log('Error', e.message);

    return res.status(400).send('Webhook Error:' + e.message);
  }

  /**
   * Messaging:
   */
  if (event.data.event_type === 'message.finalized') {
    console.log('Message Finalized.Status: ' + event.data.payload.call_control_id);
  }

  /**
   * Inbound Call Control:
   * first we listen for an initiation event and then answer the call
   */
  if (event.data.event_type === 'call.initiated') {
    //console.log(event.data);
    console.log('Call Initiated. Answering call with call control id: ' + event.data.payload.call_control_id);


  }
  if (event.data.event_type === 'call.answered') {
    console.log('Call Answered. Gather audio with the call control id: ' + event.data.payload.call_control_id);

    // const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });

    console.log('CALL ANSWERED');

    // const { data: call1 } = await telnyx.calls.create({
    //   connection_id: 'uuid',
    //   to: '+18327141518',
    //   from: event.data.payload.from,
    //   webhook_url: 'http://206.81.2.172:5000/incoming3'
    // });
    // console.log('EVENT CALL1', call1);
    // call1.bridge({ call_control_id: event.data.payload.call_control_id });
    // call.transfer({ to: '+18327141518' });

    // call.transfer({ to: '+18327141518' });
    //  call.gather_using_audio({audio_url: 'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3'});
  }

  if (event.data.event_type === 'call.transferred') {
    console.log('CALL TRANSFERRED');
  }

  if (event.data.event_type === 'call.gather.ended') {
    // console.log('Call Gathered with Audio. Hanging up call control id: ' + event.data.payload.call_control_id);

    // //const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });
    // let l_client_state = {
    //   clientState: "stage-bridge",
    //   bridgeId: event.data.payload.call_control_id,
    // };

    // const gather = new telnyx.Call({
    //   call_control_id: event.data.payload.call_control_id,
    // });

    // gather.gather_using_speak({
    //   payload: "Hello,  Welcome to Quote On home, to continue press 1, press 2 to reject",
    //   voice: g_ivr_voice,
    //   language: g_ivr_language,
    //   valid_digits: "12",
    //   invalid_payload: "Please, enter the valid input",
    //   timeout_secs: "30"
    // });

  }
  if (event.data.event_type === 'call.hangup') {
    console.log('Call Hangup. call control id: ' + event.data.payload.call_control_id);
  }

 
});


app.post('/getmessages', bodyParser.json(), async (req, res) => {
  console.log(req.body);
  if (req.body.data.event_type === 'message.received') {
    const _body = req.body.data.payload.text;
    if (_body) {
      console.log(_Body);
      axios({
        method: 'post',
        url: 'http://3.142.237.36/api/users/',
        data: { sms: _body }
      }).then(response => {
        console.log(response.data);
      }).catch(ex => {
        console.error('error', ex);
      })
    }
  }

});

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })


logger.token('req-headers', function (req, res) {
  return req.body ? JSON.stringify(req.body) : req.body;
})

app.use(logger(':method :url :status :req-headers', { stream: accessLogStream }))


app.listen(5000, function () {
  console.log('Example app listening on port 5000!');
});



