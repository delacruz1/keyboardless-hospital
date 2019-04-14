//Get a reference to the Alexa Skills Kit (ASK) and Amazon Web Services (AWS)
//We have these dependencies in our node_modules.
const Alexa = require('ask-sdk-core');
const awsSDK = require('aws-sdk');

//Get the database table name. This will change later depending on how we proceed.
const testFormTable = 'Redemption';

//Get a reference to DynamoDB and the DynamoDB DocumentClient. We only use the latter here.
const db = new awsSDK.DynamoDB();
const docClient =  new awsSDK.DynamoDB.DocumentClient(); //new AWS.DynamoDB.DocumentClient();

/**Important. This attributes object (objects in JS are like dictionaries in Python)
 * is to store the state of an survey (aka intent) so that we may reference it when
 * the user decides to fix a field. The key is the intent name (with 'temp_' prefixed
 * to it) and the value is the intent object, which represents the state of the intent.
 */
var attributes = {};

/** This function is to initialize the fields of a survey inside the database
 * (This will change later depending on how we proceed.) to "N/A" for any
 * survey that we start.
 */
function initializeDBField(){
  console.log("IN INITIALIZE FIELDS");
  let params = {
    TableName: testFormTable,
    Item: {
      userID: "1",
      participantName: "N/A",
      participantAge: "N/A",
      participantWeight: "N/A",
      participantReason: "N/A"
    },
    ReturnValues: 'ALL_OLD'
  };
  docClient.put(params).promise();
}

/**This function does not work yet. It will potentially take care of
 * updating all the fields in the database as the conversation flows.
 * The problem encountered is actually keeping track of which field has been
 * most recently updated in a clean manner so that this function may work
 * perfectly. Very simple fix, but I just wanted to find the most elegant
 * solution first.
 * This function takes in the field that is being updated (string) and the
 * field value (type depends).
 */
function updateFields(field, fieldValue){

  camelCaseField = field.charAt(0).toUpperCase() + field.slice(1);
  dynamicUpdateExpression = "set participant" + camelCaseField + " = :update" + camelCaseField;
  dynamicExpressionAttributeValue = ":update" + camelCaseField;

  let params = {
    TableName:testFormTable,
    Key:{
        "userID":"1"
    },
    UpdateExpression: dynamicUpdateExpression,
    ExpressionAttributeValues:{
        dynamicExpressionAttributeValue:fieldValue
    },
    ReturnValues:"UPDATED_NEW"
};
  docClient.update(params,(err, data) =>{
    if(err){
      console.log(err);
    }
    else{
      console.log(data);
    }
  }).promise();
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
  * For now, the only survey available is "Dr Brown Appointment Survey"
  */
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

/**This hander handles the TestSurvey Intent (AKA the Dr. Brown Appointment SUrvey). It 
 * essentially checks if this is the appropriate handler to handle the TestSurvey intent, 
 * then 
 * 1) initializes the database's fields upon starting the survey. (This will change later 
 *    depending on how we proceed.) 
 * 2) Then it checks if the dialog state is incomeplete, and if so, continue to delegate the 
 *    converation (and thus, elicitation of slots) to the Alexa. When this happens, the state
 *    of the survey is saved into the attributes object just in case the user decides to fix
 *    any field.
 * 3) If the dialog state is complete, then the state of the survey is deleted from the attributes
 *    object (not sure if it should be deleted?), and the Alexa will thank the user for their submission.
 *    Ideally, it should ask the user if they want to submit, but eh, we'll get to that soon.
 */
const BeginFormHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "TestSurvey"
  },
  handle(handlerInput) {
    console.log("IN SURVEY HANDLER, STATUS: " + handlerInput.requestEnvelope.request.dialogState);
    if(handlerInput.requestEnvelope.request.dialogState == "STARTED"){
      console.log("CALLED INITIALIZE FIELDS");
      initializeDBField();
    }
    if(handlerInput.requestEnvelope.request.dialogState !== "COMPLETED"){
      console.log("INCOMPLETE SURVEY");
        attributes["temp_" + handlerInput.requestEnvelope.request.intent.name] = handlerInput.requestEnvelope.request.intent;

        return handlerInput.responseBuilder
       .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
       .getResponse()
    }
    else {
      console.log("COMPLETE SURVEY");
        delete attributes['temp_' + handlerInput.requestEnvelope.request.intent.name];

        return handlerInput.responseBuilder
       .speak("Thank you for submitting your responses, Armando! This has been the Redemption Skill.")
       .getResponse()
    }
  }
}

/**This handler checks if the TestFixField intent has been activated by the user AND if
 * the fieldToBeFixed slot's value indeed has a value. (The value is provided when the
 * user says the utterance to activate this intent. Please see the developer console's build
 * page for a clearer idea.) The latter check is only for extra precaution, might be useful later
 * This handler will:
 * 1) Use the fieldToBeFixed slot's value to prompt the user of what they want the field to be.
 * 2) IMPORTANT!!!! (THIS IS WHERE THE SWITCHING BACK TO THE ORIGINAL INTENT AND CONTEXT HAPPENS)
 *    The handler will use the Elicit Slot Directive in order to take control back from the Alexa
 *    and manually handle the conversation for a very brief period of time. There are two arguments
 *    that .addElicitSlotDirective accepts, the former being mandatory. The arguments are:
 *      i) The name of the field that needs to be elicited (which is stored in fieldToBeFixed)
 *      ii) The intent OBJECT that you want to switch back to. This intent object is what was stored
 *          as a value in the attributes object. This will essentially confirm that the name of the
 *          field is indeed a slot in this intent, restore the original context of the survey, and finally
 *          switch back to that intent.
 */
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
    FixFieldHandler,
    HelpHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  //.addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();