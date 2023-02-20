import { MachineConfig, send, Action, assign } from "xstate";

function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}

interface Grammar {
  [index: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}

const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json());

const grammar: Grammar = {
  lecture: {
    intent: "None",
    entities: { title: "Dialogue systems lecture" },
  },
  lunch: {
    intent: "None",
    entities: { title: "Lunch at the canteen" },
  },
  breakfast: {
    intent: "None",
    entities: { title: "Breakfast at the cafeteria" },
  },
  dinner: {
    intent: "None",
    entities: { title: "Dinner at home" },
  },
  "movie night": {
    intent: "None",
    entities: { title: "Movie night at home" },
  },
   monday: {
    intent: "None",
    entities: { day: "Monday" },
  },
  tuesday: {
    intent: "None",
    entities: { day: "Tuesday" },
  },
  wednesday: {
    intent: "None",
    entities: { day: "Wednesday" },
  },
  thursday: {
    intent: "None",
    entities: { day: "Thursday" },
  },
  friday: {
    intent: "None",
    entities: { day: "Friday" },
  },
  saturday: {
    intent: "None",
    entities: { day: "Saturday" },
  },
  sunday: {
    intent: "None",
    entities: { day: "Sunday" },
  },
  "at 10": {
    intent: "None",
    entities: { time: "10:00" },
  },
  "at 7": {
    intent: "None",
    entities: { time: "7:00" },
  },
  "at 9": {
    intent: "None",
    entities: { time: "9:00" },
  },
  "at 11": {
    intent: "None",
    entities: { time: "11:00" },
  },
  "at 12": {
    intent: "None",
    entities: { time: "12:00" },
  },
  "at 2": {
    intent: "None",
    entities: { time: "14:00" },
  },
  "at 1": {
    intent: "None",
    entities: { time: "13:00" },
  },
  "at 3": {
    intent: "None",
    entities: { time: "15:00" },
  },
  "at 4": {
    intent: "None",
    entities: { time: "16:00" },
  },
  "at 5": {
    intent: "None",
    entities: { time: "17:00" },
  },
  "at 6": {
    intent: "None",
    entities: { time: "18:00" },
  },
  yes: {
	intent: "affirm",
	entities: {},
  },
  no: {
    intent: "reject",
	entities: {},
  },
  sure: {
	intent: "affirm",
	entities: {},
  },
  "of course": {
	intent: "affirm",
	entities: {},
  },
  "no way": {
    intent: "reject",
	entities: {},
  },
  "create a meeting": {
    intent: "create_meeting",
	entities: {},
  },
};

const getEntity = (context: SDSContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  //let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "").replace("on ", "");
  let u = context.nluResult.prediction.entities
  if (u.length != 0) {
	for (ent_num in u){
		if (u[ent_num]["category"] == entity) {
			return u[ent_num]["text"]};
	};
	};
  return false;
};

const parseName = (context: SDSContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.replace(/\.$/g, "");
  let match = u.match(/[A-Z][a-z]*/g).slice(1);
  return match.join(" ")
  //if (u.startsWith("who is")) {
  //  return u.replace("who is ", "").replace("?", "")
  //}
};

const getIntent = (context: SDSContext) => {
  // lowercase the utterance and remove tailing "."
  //let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  let u = context.nluResult.prediction.topIntent
  //if (u in grammar) {
  //  return grammar[u].intent;
  //}
  return u;
};


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = {
  initial: "idle",
  states: {
    idle: {
      on: {
        CLICK: "init",
      },
    },
    init: {
      on: {
        TTS_READY: "welcome",
        CLICK: "welcome",
      },
    },
    welcome: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "greeting",
			cond: (context) => !!getEntity(context, "name"),
            actions: assign({
              username: (context) => getEntity(context, "name"),
            }),
          },
		  {
			target: "greeting",
			actions: assign({
              username: (context) => "user",
            })
		  },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Hello! What is your name?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        },
      },
	greeting: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "meeting_init",
            cond: (context) => getIntent(context) === "create_meeting",},
			//cond: (context) => context.nluResult.prediction.topIntent === "create_meeting",},
		  {
            target: "access_kd",
            //cond: (context) => !!parseName(context),
			cond: (context) => getIntent(context) === "access_kd",
			actions: assign({
              name: (context) => parseName(context),
            })
			},
			{
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
		prompt: {entry: send((context) => ({
			type: "SPEAK",
			value: `OK, ${context.username}. How can I help?`,})),
          on: { ENDSPEECH: "ask" },},
		ask: {
          entry: send("LISTEN"),
			},
		nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
	  },
	  },
	access_kd: {
		initial: "request",
		on: {
        RECOGNISED: [
          {
            target: "info",
            cond: (context) => getIntent(context) === "affirm",
			actions: assign({
              title: (context) => `meeting with ${context.name}`,
            }),
			},
		  {
            target: ".done",
            cond: (context) => getIntent(context) === "reject",},
			{
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".ask_action",
      },
		states: {
			request: {
			invoke: {
				src: (context, event) => kbRequest(context.name),
				onDone: {
				  target: 'success',
				  actions: assign({ data: (context, event) => event.data })
				},
				onError: {
				  target: 'failure',
				  actions: assign({ error: (context, event) => event.data })
				}
			  },},
			success: {entry: send((context) => ({
				type: "SPEAK",
				value: `${context.data.Abstract.split(".")[0]}`,})),
				on: {ENDSPEECH: 'ask_action'},
				},
			failure: {entry: send((context) => ({
				type: "SPEAK",
				value: `I don't know who ${context.name} is. I am sorry.`,})),
				on: {ENDSPEECH: 'ask'},
				},
			ask: {
				entry: send("LISTEN"),
			},
			ask_action:
				{entry: send((context) => ({
				type: "SPEAK",
				value: `Do you want to meet with ${context.name}?`,})),
				on: {ENDSPEECH: 'ask'},
				},
			nomatch: {
			  entry: say(
				"Sorry, I don't know what it is. Tell me something I know."
			  ),
			  on: { ENDSPEECH: "ask" },
			},
			done: {entry: send((context) => ({
				type: "SPEAK",
				value: `Okay.`,})),
				}, 
			
			},},
	meeting_init: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info",
            cond: (context) => !!getEntity(context, "title"),
            actions: assign({
              title: (context) => getEntity(context, "title"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Let's create a meeting. What is it about?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    }, 
    info: {
	  initial: "confirm",
	  on: {
        RECOGNISED: [
          {
            target: "time",
            cond: (context) => !!getEntity(context, "day"),
            actions: assign({
              day: (context) => getEntity(context, "day"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".confirm",
	  },
	  states: {
        confirm: {
          entry: send((context) => ({
			type: "SPEAK",
			value: `OK, ${context.title}. On which day is it?`,})),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
	  },
	  },
	time:	{
		initial: "question",
		on: {
		RECOGNISED: [{
			target: "create_meeting_whole",
			cond: (context) => getIntent(context) === "affirm",
		},
		{
			target: "ask_time",
			cond: (context) => getIntent(context) === "reject",
		},
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".question",
	  },
	    states: {
			question: {
			entry: send((context) => ({
				type: "SPEAK",
				value: `OK, will it take the whole day?`,
			  })),
			  on: { ENDSPEECH: "ask" },
			},
			ask: {
			  entry: send("LISTEN"),
			},
			nomatch: {
			  entry: say(
				"Sorry, I don't know what it is. Tell me something I know."
			  ),
			  on: { ENDSPEECH: "ask" },
			},
},},
	create_meeting_whole: {
		initial: "question",
		on: {
		RECOGNISED: [{
			target: "confirmation",
			cond: (context) => getIntent(context) === "affirm",
		},
		{
			target: "welcome",
			cond: (context) => getIntent(context) === "reject",
		},
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".question",
	  },
		states: {
			question: {
			entry: send((context) => ({
				type: "SPEAK",
				value: `Do you want me to create a meeting titled ${context.title} on ${context.day} for the whole day?`,
			  })),
			  on: {ENDSPEECH: "ask"}},
			ask: {
			  entry: send("LISTEN"),
			},
			nomatch: {
			  entry: say(
				"Sorry, I don't know what it is. Tell me something I know."
			  ),
			  on: { ENDSPEECH: "ask" },
			},
		},
	},
	ask_time: { 
		initial: "question",
		on: {
		RECOGNISED: [{
			target: "create_meeting",
			cond: (context) => !!getEntity(context, "time"),
			actions: assign({
              time: (context) => getEntity(context, "time"),
            }),
		},
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".question",
	  },
		states: {
			question: {entry: send((context) => ({
				type: "SPEAK",
				value: `What time is your meeting?`,
			  })),
			  on: { ENDSPEECH: "ask" },},
			  ask: {
			  entry: send("LISTEN"),
			},
			nomatch: {
			  entry: say(
				"Sorry, I don't know what it is. Tell me something I know."
			  ),
			  on: { ENDSPEECH: "ask" },
			},
	},
	},
	create_meeting: {
		initial: "question",
		on: {
		RECOGNISED: [{
			target: "confirmation",
			cond: (context) => getIntent(context) === "affirm",
		},
		{
			target: "welcome",
			cond: (context) => getIntent(context) === "reject",
		},
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".question",
	  },
		states: {question: {
			entry: send((context) => ({
				type: "SPEAK",
				value: `Do you want me to create a meeting titled ${context.title} on ${context.day} at ${context.time}?`,
			  })),
			  on: { ENDSPEECH: "ask" },
			  },
			ask: {
			  entry: send("LISTEN"),
			},
			nomatch: {
			  entry: say(
				"Sorry, I don't know what it is. Tell me something I know."
			  ),
			  on: { ENDSPEECH: "ask" },
			},
	},
}, 
	confirmation: {
		entry: send({
			type: "SPEAK",
			value: `Your meeting has been created`,}),
			},
},
};
