'use strict';

const Telnyx = require('telnyx');
const Express = require('express');
const bodyParser = require('body-parser');
const app = Express();
const { RinglessDB } = require('./global/constants');
const db_connect = require("./tools/db-connect");
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

app.post('/receiveincoming', bodyParser.json(), async function (req, res) {
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
    console.log(event.data);
    console.log('Call Initiated. Answering call with call control id: ' + event.data.payload.call_control_id);

    const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });

    // const { data: call1 } = await telnyx.calls.create({
    //   connection_id: 'uuid',
    //   to: '+18327141518',
    //   from: event.data.payload.from
    // });
    // call1.bridge({ call_control_id: event.data.payload.call_control_id });
    // call.transfer({ to: '+18327141518' });

    call.answer();
  }
  if (event.data.event_type === 'call.answered') {
    console.log('Call Answered. Gather audio with the call control id: ' + event.data.payload.call_control_id);

    const call = new telnyx.Call({ call_control_id: event.data.payload.call_control_id });

    console.log('TRANSFERRING THE CALL');


    const _dbCon = RinglessDB();
    let _fromNumber = event.data.payload.from;
    console.log(_fromNumber);
    _fromNumber = _fromNumber.substr(_fromNumber.length - 10);
    console.log('AFTER SPLICE', _fromNumber);
    const _phoneValues = await _dbCon.collection('outbound_history').find({ PhoneTo: _fromNumber.toString() }).toArray();
    console.log('COLLECTION VALUE => ', _phoneValues);
    const _phoneValue = _phoneValues[_phoneValues.length - 1];
    console.log('Single VALUE => ', _phoneValue);

    call.transfer({
      to: `+1${_phoneValue}`,
      from: event.data.payload.from,
      webhook_url: 'http://206.81.2.172:5000/incoming3'
    });

    // const { data: call1 } = await telnyx.calls.create({
    //   connection_id:'uuid',
    //   to: '+18327141518',
    //   from: event.data.payload.from,
    //   webhook_url: 'http://206.81.2.172:5000/incoming3'
    // });
    console.log('EVENT CALL1');
    //call1.bridge({ call_control_id: event.data.payload.call_control_id });
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


app.post('/incoming3', bodyParser.json(), async function (req, res) {
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

db_connect
  .DBConnectMongoose()
  .then((dbInfo) => {
    app.listen(5000, function () {
      console.log('Example app listening on port 5000!');
    });

  });

