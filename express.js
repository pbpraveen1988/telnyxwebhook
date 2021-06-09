'use strict';

const Telnyx = require('telnyx');
const Express = require('express');
const logger = require("morgan");
const bodyParser = require('body-parser');
const app = Express();
const fs = require('fs');
const log4js = require('log4js');
const path = require('path');


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

const telnyx = Telnyx(apiKey);
const __logger = log4js.getLogger('IVR');
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
    let l_client_state = {
      clientState: "stage-bridge",
      bridgeId: event.data.payload.call_control_id,
    };

    // Gather Using Speak - Present Menu to Forwading destination, 1 to Accept and Bride Call, 2 to Reject and Send to System Voicemail
    const gather = new telnyx.Call({
      call_control_id: event.data.payload.call_control_id,
    });
    console.time('beforeAudio');
    // await gather.gather_using_audio({ audio_url: 'https://audiocdn.123rf.com/preview/nouveaubaroque/nouveaubaroque2007/nouveaubaroque200700031_preview.mp3' }).then(res => {
    try {
      console.log('before speak');
      gather.gather_using_speak({
        payload: "Welcome to Quote On home, to continue press 1, press 2 to reject",
        voice: g_ivr_voice,
        language: g_ivr_language,
        valid_digits: "123",
        client_state: Buffer.from(
          JSON.stringify(l_client_state)
        ).toString("base64"),
        timeout_secs: "30"
      });
      console.log('after  speak');
    } catch (ex) {
      console.error(ex);
    }
    //   })
    console.timeEnd('beforeAudio');




    // gather.hangup();
    // Webhook client_state set to stage-voicemail-greeting, we are able to execute SPEAK which is acting as our Voicemail Greeting
  } else if (event.data.event_type === "call.gather.ended" || event.data.event_type === 'call.dtmf.received') {
    console.log('call.gather.ended', event.data.event_type);
    console.log(event, event.payload);
    var l_ivr_option = event.data.payload.digits;

    console.log('l_ivr_option', l_ivr_option);
    if (l_ivr_option == '1') {
      telnyx.messages
        .create({
          from: event.data.payload.to, // Your Telnyx number
          to: event.data.payload.from,
          text: `Please click the link below to fill the form http://3.142.237.36`,
        })
        .then(function (response) {
          console.log('response message success', response);
          const message = response.data; // asynchronously handled
        });
    } else {
      res.end();
    }
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
    console.log('Call Gathered with Audio. Hanging up call control id: ' + event.data.payload.call_control_id);

    const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });

    call.hangup();
  }
  if (event.data.event_type === 'call.hangup') {
    console.log('Call Hangup. call control id: ' + event.data.payload.call_control_id);
  }
  // Event was 'constructed', so we can respond with a 200 OK
  res.status(200).send(`Signed Webhook Received: ${event.data.event_type}, ${event.data.id}`);
});


var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })


logger.token('req-headers', function (req, res) {
  return req.body ? JSON.stringify(req.body) : req.body;
})

app.use(logger(':method :url :status :req-headers', { stream: accessLogStream }))


app.listen(5000, function () {
  console.log('Example app listening on port 5000!');
});



