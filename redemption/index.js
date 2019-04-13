const Alexa = require('ask-sdk-core');
var attributes = {};

/* INTENT HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    const speakOutput = "Hello, Armando. which survey do you want to fill out?";
    const repromptSpeech = "Sorry, which survey do you want to fill out?";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptSpeech)
      .getResponse();
  },
};

const BeginFormHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "TestSurvey"
  },
  handle(handlerInput) {
    if(handlerInput.requestEnvelope.dialogState !== "COMPLETED"){
        attributes["temp_" + handlerInput.requestEnvelope.request.intent.name] = handlerInput.requestEnvelope.request.intent;
    }
    else {
        delete attributes['temp_' + handlerInput.requestEnvelope.request.intent.name];
    }
    console.log("INTENT OBJECT (IN ORIGINAL INTENT): " + attributes["temp_" + handlerInput.requestEnvelope.request.intent.name]);

    return handlerInput.responseBuilder
       .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
       .getResponse()
  }
}

const FixFieldHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === "IntentRequest"
        && handlerInput.requestEnvelope.request.intent.name === "TestFixField"
        && handlerInput.requestEnvelope.request.intent.slots.fieldToBeFixed.value;
    },
    handle(handlerInput) {
        console.log("INTENT OBJECT (IN FIX INTENT): " + attributes[Object.keys(attributes)[0]]);
        const speakOutput = "What do you want the " + handlerInput.requestEnvelope.request.intent.slots.fieldToBeFixed.value + " to be?"
      return handlerInput.responseBuilder
         .speak(speakOutput)
         .reprompt("Sorry, " + speakOutput)
         /*IMPORTANT!!! If user gives an invalid field to be fixed, the Alexa will still accept it for some reason
         and place it in (I'm assuming) the first empty slot. I thought addElicitSlotDirective would handle this easily,
         but I guess it doesn't.
         */
        .addElicitSlotDirective(handlerInput.requestEnvelope.request.intent.slots.fieldToBeFixed.value, 
            attributes[Object.keys(attributes)[0]])
        .getResponse();
    }
  }

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  },
};

const RepeatHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent');
  },
  handle(handlerInput) {
    const requestAttributes = instructions;
    const speakOutput = "Bye!";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    console.log('Inside SessionEndedRequestHandler');
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/* LAMBDA SETUP */
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    BeginFormHandler,
    FixFieldHandler,
    HelpHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  //.addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();