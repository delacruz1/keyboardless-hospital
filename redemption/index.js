//Get a reference to the Alexa Skills Kit (ASK) and Amazon Web Services (AWS)
//We have these dependencies in our node_modules.
const Alexa = require('ask-sdk-core');
const awsSDK = require('aws-sdk');
// Reference to the DynamoDB Persistence Adapter, which we need for the save session feature
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');

//Creates an instance of a Persistence Adapter
const persistenceAdapter = new DynamoDbPersistenceAdapter({
    //Specifies table name in DB
    tableName: 'KHConversationStates',
    createTable: true //creates table above if it does not exist in the database
    // still not sure if the two lines above this comment are the right approach to things
});

var Survey = require("./topological.js");
var survey;

//intent names mapped to survey names
var surveyNames = {
  "TestSurvey": "Dr. Brown Appointment Survey",
  "KenSurvey": "Dr. Ken Survey",
  "DemoSurvey": "Dr. Navarro Survey"
}

function getSynonyms(valueName) {
  const fs = require('fs');
  const fileContents = fs.readFileSync('./model.json', 'utf8');
  const data = JSON.parse(fileContents)
  for(var i = 0 ; i < data.interactionModel.languageModel.types.length ; i++){
    var item = data.interactionModel.languageModel.types[i];
    if(item.name == "SurveyNameType"){
      for(var j = 0 ; j < item.values.length ; j++){
        typeValue = item.values[j];
        if(typeValue.name.value == valueName){
          return typeValue.name.synonyms[0];
        }
      }
    }
  }
  return "error";
}

/* INTENT HANDLERS */

/**Handlers are data structures (tbh idk what data structure they are) that the Alexa uses 
 * in order to handle each request from the user. Handlers should be added to the Skill Builder 
 * at the bottom of this code.
 * There are two components to a handler:
 * 1) A handler can check conditions to see whether or not it can handle the user's
 *    request. For example. we can check if the user's request was a launch request,
 *    intent request, check the specific type of intent request, etc. 
 * 2) If the above conditions are met, this handler will "handle" the user's request,
 *    output some speech, then ask for the user's request again. This is typically where
 *    most of the magic happends.
 */

 /** This Launch handler simply speaks to the user upon invocation (invocation means
  * activating the skill, (AKA when they say "Open Katara"). It will then prompt the
  * user to announce which survey they want to fill out.
  * For now, the only survey available is "Dr Brown Appointment Survey".
  * This handler also resets all of the necessary global variables.
  */


// TODO: When skill is launched again, we should tell user where they left off
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = "Hello, user. You may say the name of a survey you would like to begin, or say continue to pick up where you left off on a survey.";
    const repromptSpeech = "Sorry, I didn't quite get that. Would you like to begin a new form or continue on an old survey?";
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptSpeech)
      .getResponse();
  },
};

/**This hander handles the TestSurvey Intent (AKA the Dr. Brown Appointment SUrvey). It 
 * essentially checks if this is the appropriate handler to handle the TestSurvey intent, 
 * then
 * 1) It checks to see if the dialogState has started (Meaning it checks if no questions have been answered yet.)
 *    a) It calls loadModel() to populate slotOrder
 *    b) initializes the database's fields upon starting the survey. (This will change later 
 *    depending on how we proceed.)
 *    c) Set the current and next slot variables as the first and second field, respectively.
 * 2) If the survey is not complete yet, then we find the slot that was just elicited (if there is one)
 *    and update the database accordingly. We also update the attributes object. Should probably move this
 *    to the next conditional as it shouldn't make a difference.
 * 3) If the survey is in progress, meaning at least one question has been answered, then
 *    a) Check if there is in fact a next slot in the slotOrder. If so, set this as the new currentSlot
 *    b) If there is a next slot after our new current slot, then set that as the next slot, otherwise set
 *       it to null
 *    c) If there is a previous slot before our new current slot, then set that as the previous slot,
 *       otherwise set it to null.
 *    d) If we have reached the end of the survey (we answered the last question), then check here if the
 *       flow has changed. If so, return a response that lets the user know that they have reached the
 *       end of the survey but have not answered all of the questions. It prompts them if they wish to
 *       review it or go back to it later. This will change depending on design decision. This part has not
 *       been built yet.
 * 4) If the survey is incomplete AND the flow has changed (next has been called and original flow
 *    has not been restored), then manually elicit the current slot. This differs with delegating the 
 *    conversation to Alexa since the Alexa will find the first unfilled slot by default and prompt the
 *    user with that. We do not want that; we want the conversation to proceed, thereby making this
 *    conditional necessary.
 * 5) If the survey is incomplete and the the flow has NOT been changed, we continue to delegate the 
 *    converation (and thus, elicitation of slots) to the Alexa.
 * 3) If the dialog state is complete, then the state of the survey is deleted from the attributes
 *    object (not sure if it should be deleted?), and the Alexa will thank the user for their submission
 *    and ask if they want to review their answers, submit, or come back later. This part has not been built yet.
 */
const BeginFormHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && (handlerInput.requestEnvelope.request.intent.name === "TestSurvey"
      || handlerInput.requestEnvelope.request.intent.name === "KenSurvey"
      || handlerInput.requestEnvelope.request.intent.name === "DemoSurvey")
  },
  handle(handlerInput) {
    if(handlerInput.requestEnvelope.request.dialogState == "STARTED"){
      survey = new Survey(handlerInput.requestEnvelope.request.intent.name);
      survey.saveSurveyState(handlerInput);
      console.log("STARTED DIALOG, CURRENT SLOT: " + survey.currentSlot);
      console.log("STARTED DIALOG, NEXT SLOT: " + survey.nextSlot);
      return handlerInput.responseBuilder
      .speak(survey.introductions[handlerInput.requestEnvelope.request.intent.name])
      .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
      .getResponse();
    }
    
    if(handlerInput.requestEnvelope.request.dialogState !== "COMPLETED"){
        if(survey.attributes["temp_" + handlerInput.requestEnvelope.request.intent.name]){
          survey.findPreviouslyElicitedSlot(handlerInput);
        }
        //Error handling and validations go here
        if(survey.validate(handlerInput)){
          survey.saveSurveyState(handlerInput);
          survey.saveAttributes(handlerInput);
        }
        else{
          return handlerInput.responseBuilder
          //.speak(survey.validationMessages[survey.previouslyElicitedSlot])
          .speak("Reprompting: " + survey.slotDict[survey.currentSlot])
          .addElicitSlotDirective(survey.currentSlot)
          .getResponse();
        }
    }

    //Update the slot variables
    if(handlerInput.requestEnvelope.request.dialogState == "IN_PROGRESS"){
      if(survey.nextSlotExists()){
        survey.advanceSlots();
      }
      else if(!survey.nextSlotExists() && survey.flowChanged && !survey.isComplete(handlerInput)){
        return handlerInput.responseBuilder
        .speak("You've reached the end of the survey, but did not finish yet. Do you want to review it or come back to it later?")
        .reprompt("Hi User. You've reached the end of the survey, but did not finish yet. Do you want to review it or come back to it later?")
        .getResponse();
      }
      console.log("IN_PROGRESS DIALOG, PREVIOUS SLOT: " + survey.previousSlot);
      console.log("IN_PROGRESS DIALOG, CURRENT SLOT: " + survey.currentSlot);
      console.log("IN_PROGRESS DIALOG, NEXT SLOT: " + survey.nextSlot);
    }  
    // added this, should give the introduction if the survey Was JUST STARTED
    /*if(handlerInput.requestEnvelope.request.dialogState == "STARTED"){
      return handlerInput.responseBuilder
      .speak(survey.instructions[handlerInput.requestEnvelope.request.intent.name])
      .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
      .getResponse();
    }*/

    if(handlerInput.requestEnvelope.request.dialogState === "COMPLETED" || survey.isComplete(handlerInput)){
      survey.reviewSurvey = handlerInput.requestEnvelope.request.intent.name;
      survey.attributes["temp_" + survey.reviewSurvey] = handlerInput.requestEnvelope.request.intent;
      survey.saveSurveyState(handlerInput);
      return handlerInput.responseBuilder
     .speak("Thank you for submitting your responses, User! Do you want to review your responses, submit, or come back later?")
     .getResponse()
  }

    if(handlerInput.requestEnvelope.request.dialogState !== "COMPLETED" && survey.flowChanged){
        return handlerInput.responseBuilder
        .speak(survey.slotDict[survey.currentSlot])       
       .reprompt("Sorry I didn't get that, " + survey.slotDict[survey.currentSlot])
       .addElicitSlotDirective(survey.currentSlot, handlerInput.requestEnvelope.request.intent)
       .getResponse()
    }
    else if(handlerInput.requestEnvelope.request.dialogState !== "COMPLETED" && !survey.flowChanged){
      return handlerInput.responseBuilder
      .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
      .getResponse();
    }
  }
};


/**The Previous Handler will first check if the user's request is an intent request, and if that intent request
 * corresponds to the PreviousSlot Intent. If it does:
 * 1) It changes the slots accordingly, where the previous slot (if it exists) becomes the new current slot.
 *    The next and previous slots are also set as needed.
 * 2) If a previous slot exists, we manually prompt them. If not, then we mention that there are no previous questions,
 *    and ask the user if they want to continue. This part has not been built yet.
 */
const PreviousHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'PreviousSlot';
  },
  handle(handlerInput) {
    if(survey.previousSlotExists()){
      survey.retractSlots();
      survey.saveSurveyState(handlerInput);
      console.log("PREV INTENT, PREVIOUS SLOT: " + survey.previousSlot);
      console.log("PREV INTENT, CURRENT SLOT: " + survey.currentSlot);
      console.log("PREV INTENT, NEXT SLOT: " + survey.nextSlot);

      return handlerInput.responseBuilder
      .speak(survey.slotDict[survey.currentSlot])
      .reprompt("Sorry I didn't get that, " + survey.slotDict[survey.currentSlot])
      .addElicitSlotDirective(survey.currentSlot,
            survey.attributes["temp_" + survey.surveyName])
      .getResponse();
    }
    else{
      return handlerInput.responseBuilder
      .speak("There are no previous questions. Do you want to continue?")
      .reprompt("Hi user. There are no previous questions. Do you want to continue?")
      .getResponse();
    }
  }
};

/**The Next Handler will first check if the user's request is an intent request, and if that intent request
 * corresponds to the NextSlot Intent. If it does:
 * 1) It changes the slots accordingly, where the next slot (if it exists) becomes the new current slot.
 *    The next and previous slots are also set as needed.
 * 2) If a next slot exists, we manually prompt them. If not, then we mention that they have reached the end of
 *    the survey and have not finished. We ask them if they want to review it or come back to it later.
 *    This part has not been built yet.
 */
const NextHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'NextSlot';
  },
  handle(handlerInput) {
    survey.flowChanged = true;
    //This is activated once one answer has been given. Get the 
    if(survey.nextSlotExists()){
      survey.advanceSlots();
      survey.saveSurveyState(handlerInput);
      console.log("NEXT INTENT, PREVIOUS SLOT: " + survey.previousSlot);
      console.log("NEXT INTENT, CURRENT SLOT: " + survey.currentSlot);
      console.log("NEXT INTENT, NEXT SLOT: " + survey.nextSlot);

      return handlerInput.responseBuilder
      .speak(survey.slotDict[survey.currentSlot])       
      .reprompt("Sorry I didn't get that, " + survey.slotDict[survey.currentSlot])
      .addElicitSlotDirective(survey.currentSlot,
          survey.attributes["temp_" + survey.surveyName])
      .getResponse();
    }
    else{
      return handlerInput.responseBuilder
      .speak("There are no more questions. You did not finish the survey yet. Do you want to review it or come back to it later?")
      .reprompt("Hi user. You've reached the end of the survey, but did not finish yet. Do you want to review it or come back to it later?")
      .getResponse();
    }
}
};

const IDKHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'IDKIntent';
    },
    handle(handlerInput) {
      // 2 options: Elaborate or skip question
      if (handlerInput.requestEnvelope.request.intent.slots.option.value === "skip"){
        survey.flowChanged = true;
        //This is activated once one answer has been given. Get the 
        if(survey.nextSlotExists()){
          survey.advanceSlots();
          return handlerInput.responseBuilder
          .speak("Okay, I'll take you to the next question. " + survey.slotDict[survey.currentSlot])
          .addElicitSlotDirective(survey.currentSlot, survey.attributes["temp_" + survey.surveyName])
          .getResponse();
        }
        // Elaborate
        if (handlerInput.requestEnvelope.request.intent.slots.option.value === "elaborate"){
          return handlerInput.responseBuilder
          .speak(survey.elaborations[survey.currentSlot])
          .addElicitSlotDirective(survey.currentSlot, survey.attributes["temp_" + survey.surveyName])
          .getResponse();
        }
        //  * 1st phase design:  store locally with new objects
        //  * 2nd phase design:  grab from database eventually
      return handlerInput.responseBuilder
      .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
      .getResponse();
      }
    }
  };

// To do: Create/continue working on continue handler  
const ContinueHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ContinueIntent';

  },
  async handle(handlerInput) {
    //return new Promise()
    const saveState = await handlerInput.attributesManager.getPersistentAttributes();
    
    if(!handlerInput.requestEnvelope.request.intent.slots.surveyName.value){
      availableSurveys = [];
      Object.keys(surveyNames).forEach((s) => {
        if(Object.keys(saveState).includes(s)){
          availableSurveys.push(surveyNames[s]);
        }
      });
      const speakOutput = "What survey would you like to continue? You can say something like: " + availableSurveys.join(", ");
      return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt("Sorry, " + speakOutput)
      .addElicitSlotDirective("surveyName")
      .getResponse();
    }
    else{
      console.log("IN SURVEY HANDLE FUNCTION ELSE STATEMENT");
      console.log(saveState);
      synonym = getSynonyms(handlerInput.requestEnvelope.request.intent.slots.surveyName.resolutions.resolutionsPerAuthority[0].values[0].value.name);
      console.log(synonym);
      survey = new Survey(synonym);
      survey.loadSurveyState(saveState, synonym);
      if(survey.flowChanged){
        return handlerInput.responseBuilder
        .speak(survey.slotDict[survey.currentSlot])
        .reprompt("Sorry, " + survey.slotDict[survey.currentSlot])
        .addElicitSlotDirective(survey.currentSlot, saveState[synonym])
        .getResponse();
      }
      return handlerInput.responseBuilder
      .addDelegateDirective(saveState[synonym])
      .getResponse();
    }
  }
}

const NewSurveyHandler = { 
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'NewSurveyIntent';

    },

  handle(handlerInput){
    const speakOutput = "What survey would you like to begin?";

  }


}

  // const ReviewHandler = {
  //   canHandle(handlerInput) {
  //     return handlerInput.requestEnvelope.request.type === 'IntentRequest'
  //       && handlerInput.requestEnvelope.request.intent.name === 'ReviewIntent';
  //   },
  //   handle(handlerInput) {
  //     if(survey.reviewSurvey || handlerInput.requestEnvelope.request.intent.slots.survey.value){
  //       return handlerInput.responseBuilder
  //       .speak("Okay, you can review your survey results if you have the Alexa app or Alexa smart device.")
  //       .withStandardCard(cardTitle, content)
  //       .getResponse();
  //     }
  //     else{
  //       return handlerInput.responseBuilder
  //       .speak("Which survey do you want to review?")
  //       .addElicitSlotDirective("survey")
  //       .getResponse();
  //     }
  //   }
  // };


//Default Handlers, need to explore and utilize more!
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

/**
 * This is where everything comes together for the Alexa to understand our code.
 * Smart not to mess with anything except for adding handlers to the list below
 * when needed.
 */
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    BeginFormHandler,
    PreviousHandler,
    NextHandler,
    IDKHandler,
    HelpHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler,
    ContinueHandler,
    NewSurveyHandler 
  )
  //.addRequestInterceptors(LocalizationInterceptor)
  .withPersistenceAdapter(persistenceAdapter) // tells Skill Builder to use persistence adapter
  .addErrorHandlers(ErrorHandler)
  .lambda();
