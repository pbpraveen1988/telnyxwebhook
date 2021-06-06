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
  if (req && req.body && req.body.data.event_type) {
    var l_hook_event_type = req.body.data.event_type;
    var l_call_control_id = req.body.data.payload.call_control_id;
    var l_client_state_64 = req.body.data.payload.client_state;
  } else {
    console.log(`[%s] LOG - Invalid Webhook received! ${get_timestamp()}`);
    res.end("0");
  }
  // Log the Full Webhook from Telnyx - You cann comment out in a production enviornment
  console.log(req.body.data);

  // If client_state exists decode from base64
  if (l_client_state_64 != null || "")
    var l_client_state_o = JSON.parse(
      Buffer.from(l_client_state_64, "base64").toString("ascii")
    );
  // Call Initiated >> Command Dial
  if (l_hook_event_type == "call.initiated") {
    // Inbound Call
    if (req.body.data.payload.direction == "incoming") {
      // Format the update to client-state so we can execute call flow and the call control id of the call we may eventually bridge follows in client_state
      let l_client_state = {
        clientState: "stage-bridge",
        bridgeId: l_call_control_id,
      };
      // Dial to our FindMe/FollowMe Destination, forwarding the original CallerID so we can better determine disposition of choice
      const { data: call } = await telnyx.calls.create({
        connection_id: g_connection_id,
        to: g_forwarding_did,
        from: req.body.data.payload.from,
        client_state: Buffer.from(
          JSON.stringify(l_client_state)
        ).toString("base64"),
        timeout_secs: "30",
      });
      console.log(
        `[%s] LOG - EXEC DIAL -  [%s] ${get_timestamp()} | ${req.body.data.payload.result
        }`
      );
      res.end();
    } else if (req.body.data.payload.direction == "outgoing") {
      res.end();
    }

    // Webhook Dial answered by User - Command Gather Using Speak
  } else if (l_hook_event_type == "call.answered") {
    if (l_client_state_o.clientState == "stage-bridge") {
      let l_client_state = {
        clientState: "stage-dial",
        bridgeId: l_client_state_o.bridgeId,
      };
      // Gather Using Speak - Present Menu to Forwading destination, 1 to Accept and Bride Call, 2 to Reject and Send to System Voicemail
      const gather = new telnyx.Call({
        call_control_id: l_call_control_id,
      });
      gather.gather_using_speak({
        payload: "Call Forwarded press 1 to accept or 2 to reject",
        voice: g_ivr_voice,
        language: g_ivr_language,
        valid_digits: "123",
        client_state: Buffer.from(
          JSON.stringify(l_client_state)
        ).toString("base64"),
      });
      console.log(`[%s] LOG - EXEC GATHER -  [%s] ${get_timestamp()}`);
      res.end();
      // Webhook client_state set to stage-voicemail-greeting, we are able to execute SPEAK which is acting as our Voicemail Greeting
    } else if (l_client_state_o.clientState == "stage-voicemail-greeting") {
      // Supply new client_state to trigger the next function in the flow which is to play beep and record the caller's message
      let l_client_state = {
        clientState: "stage-voicemail",
        bridgeId: null,
      };
      const speak = new telnyx.Call({
        call_control_id: l_call_control_id,
      });
      // Speak our voicemail greeting, you could alternatively record a custom greeting and issue play audio command
      speak.speak({
        payload: "Please Leave a Message After the Tone",
        voice: g_ivr_voice,
        language: g_ivr_language,
        client_state: Buffer.from(
          JSON.stringify(l_client_state)
        ).toString("base64"),
      });
      console.log(
        `[%s] LOG - EXEC SPEAK VM GREETING -  [%s] ${get_timestamp()}`
      );
    } else {
      res.end();
    }
    res.end();

    // Webhook Call Bridged or Speak Started >> Do Nothing
  } else if (
    l_hook_event_type == "call.bridged" ||
    l_hook_event_type == "call.speak.started"
  ) {
    res.end();
    // Webhook Call Hungup Started >> Do Nothing
  } else if (l_hook_event_type == "call.hangup") {
    res.end();
    // Find Me / Follow me - handle DTMF to Bridge or Send to Voicemail
  } else if (l_hook_event_type == "call.gather.ended") {
    // Receive DTMF Number
    const l_dtmf_number = req.body.data.payload.digits;

    console.log(
      `[%s] DEBUG - RECEIVED DTMF [%s]${get_timestamp()} | ${l_dtmf_number}`
    );
    res.end();

    // Check Users Selection for forwarded call
    if (!l_client_state_64) {
      res.end();
      // Do nothing... will have state
    } else {
      // Selected Answer Call >> Bridge Calls
      if (l_client_state_o.clientState == "stage-dial" && l_dtmf_number) {
        // Bridge Call
        if (l_dtmf_number == "1") {
          const bridge_call = new telnyx.Call({
            call_control_id: l_call_control_id,
          });
          // Bridge this call to the initial call control id which triggered our call flow which we stored in client state on the initial Dial
          bridge_call.bridge({
            call_control_id: l_client_state_o.bridgeId,
          });
          res.end();
          console.log(
            `[%s] LOG - EXEC BRIDGE CALLS -  [%s] ${get_timestamp()}`
          );
          // Call rejected >> Answer Bridge Call, You must answer the parked call before you can issue speak or play audio
        } else if (l_dtmf_number == "2") {
          // Set Call State so we can initiate the voicemail call flow
          let l_client_state = {
            clientState: "stage-voicemail-greeting",
            bridgeId: null,
          };
          const answer_bridge_call = new telnyx.Call({
            call_control_id: l_client_state_o.bridgeId,
          });

          answer_bridge_call.answer({
            client_state: Buffer.from(
              JSON.stringify(l_client_state)
            ).toString("base64"),
          });

          // Hangup This call now that user has responded to reject
          const hangup_call = new telnyx.Call({
            call_control_id: l_call_control_id,
          });
          hangup_call.hangup();
          console.log(
            `[%s] LOG - EXEC HANGUP FINDME AND SEND TO VM -  [%s] ${get_timestamp()}`
          );
        }
        res.end();
      }
    }

    res.end();
    // Webhook Speak Ended or * received >> Record VoiceMail / Call
  } else if (
    req.body.data.payload.digit === "*" ||
    l_hook_event_type == "call.speak.ended"
  ) {
    let l_client_state = {
      clientState: "stage-voicemail-greeting",
      bridgeId: null,
    };
    const record_call = new telnyx.Call({
      call_control_id: l_call_control_id,
    });
    record_call.record_start({
      format: "mp3",
      channels: "single",
      play_beep: true,
      client_state: Buffer.from(JSON.stringify(l_client_state)).toString(
        "base64"
      ),
    });
    console.log(
      `[%s] LOG - EXEC RECORD INITIATE -  [%s] ${get_timestamp()}`
    );
    res.end();
    // Webhook Call Recording Saved >> Send Text Message of recording
  } else if (l_hook_event_type == "call.recording.saved") {
    //Send Text Message Alert for call recording - Ber sure to enable Link shortener in Telnyx Messaging Profile

    telnyx.messages
      .create({
        from: g_call_control_did, // Your Telnyx number
        to: g_forwarding_did,
        text: `You have a new Voicemail${req.body.data.payload.recording_urls.mp3}`,
      })
      .then(function (response) {
        const message = response.data; // asynchronously handled
      });
    console.log(`[%s] LOG - EXEC SEND SMS -  [%s] ${get_timestamp()}`);

    res.end();
  }
  res.end();
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



