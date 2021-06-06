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

  /**
   * Messaging:
   */
  if (event.data.event_type === 'message.finalized') {
    console.log('Message Finalized.Status: ' + event.data.payload.call_control_id);
  }

  /**
   * Inbound Call Control:
   * first we listen for an initiation event and then answer the call
   * INCOMING CALL
   */
  if (event.data.event_type === 'call.initiated') {
    try {
      __logger.info('====================================================================');
      __logger.info('CALL INITIATED', typeof (event.data) == 'object' ? JSON.stringify(event.data) : event.data);
    } catch (ex) {

    }

    try {
      __logger.info('Call Initiated. Answering call with call control id: ', event.data.payload.call_control_id);
    } catch (ex) {

    }

    if (event.data.payload.direction == "incoming") {
      console.log('incoming call direction');
    }


    const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });
    call.answer();
  }
  if (event.data.event_type === 'call.answered') {
    // WILL EXECUTE THE CODE AFTER CALL GET ANSWERED
    try {
      __logger.info('Call Answered. Gather audio with the call control id: ', event.data.payload.call_control_id);
    } catch (ex) {

    }
    const gather = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });
    let _fromNumber = event.data.payload.from;
    console.log(_fromNumber);
    _fromNumber = _fromNumber.substr(_fromNumber.length - 10);
    // let l_client_state = {
    //   clientState: "stage-dial",
    //   bridgeId: l_client_state_o.bridgeId,
    // // };
    // client_state: Buffer.from(
    //   JSON.stringify(l_client_state)
    // ).toString("base64"),
    gather.gather_using_speak({
      payload: "Call Forwarded press 1 to accept or 2 to reject",
      voice: g_ivr_voice,
      language: g_ivr_language,
      valid_digits: "123",

    });
    try {
      __logger.info('AFTER SPLICE', _fromNumber);
    } catch (ex) {

    }
  }

  if (event.data.event_type === 'call.transferred') {
    console.log('CALL TRANSFERRED');
    try {
      __logger.info('CALL TRANSFERRED');
    } catch (ex) {

    }
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

    const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });
    call.answer();
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



