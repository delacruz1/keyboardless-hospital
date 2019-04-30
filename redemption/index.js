//Get a reference to the Alexa Skills Kit (ASK) and Amazon Web Services (AWS)
//We have these dependencies in our node_modules.
const Alexa = require('ask-sdk-core');
const awsSDK = require('aws-sdk');

//Get the database table name. This will change later depending on how we proceed.
const testFormTable = 'Redemption';

//Get a reference to DynamoDB and the DynamoDB DocumentClient. We only use the latter here.
const db = new awsSDK.DynamoDB();
const docClient =  new awsSDK.DynamoDB.DocumentClient(); //new AWS.DynamoDB.DocumentClient();

// Object that contains the slots and utterances for the new questionaire
var slotDict;

/**Important. This attributes object (objects in JS are like dictionaries in Python)
 * is to store the state of an survey (aka intent) so that we may reference it when
 * the user decides to fix a field. The key is the intent name (with 'temp_' prefixed
 * to it) and the value is the intent object, which represents the state of the intent.
 */
var attributes;

// This keeps track of the previous slot that was just elicited.
// Do NOT call findPreviouslyElicitedSlot after the attributes value has been reset until the next
// time BeginFormHandler is called.
var previousElicitedSlot = {"field": null, "fieldValue": null}

/**These three fields keep track of the current, previous, and next slot being elicited. */
var currentSlot;
var previousSlot;
var nextSlot;

/**@Carlos, what is norm for? */
var norm;

/**flowChanged is a boolean that is false if the flow of the conversation is completely linear, and
 * false if we skip over a question (next).
 */
var flowChanged;

/**This variable is a list that contains the order of the slots. This is populated in the BeginFormHandler after
 * we load the interaction model into the code.
 */
var slotOrder;

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

/**This function loads the interaction model from model.json. It is used to populate slotOrder. */
function loadModel(){
  const fs = require('fs');
  const fileContents = fs.readFileSync('./model.json', 'utf8');

  try {
    const data = JSON.parse(fileContents)
    //Will need to make sure we select the current survey (intent) rather than saying [5]
    slots = data.interactionModel.languageModel.intents[10].slots
    slots.forEach((item) => {
      slotOrder.push(item.name);
    })
  } catch(err) {
    console.error(err);
  }
}

/**This function sets the global object previousElicitedSlot based on the slot that
 * that was just elicited.
 * Do NOT call findPreviouslyElicitedSlot after the attributes value has been reset until the next
 * time BeginFormHandler is called.
 */
function findPreviouslyElicitedSlot(handlerInput){
  Object.keys(handlerInput.requestEnvelope.request.intent.slots).forEach(key => {
    if(handlerInput.requestEnvelope.request.intent.slots[key]["value"] != 
      attributes["temp_" + handlerInput.requestEnvelope.request.intent.name]["slots"][key]["value"]){
        previousElicitedSlot["field"] = key;
        previousElicitedSlot["fieldValue"] =  handlerInput.requestEnvelope.request.intent.slots[key]["value"]
      }
    
  });
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
        [dynamicExpressionAttributeValue]:fieldValue
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
  * For now, the only survey available is "Dr Brown Appointment Survey".
  * This handler also resets all of the necessary global variables.
  */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    attributes = {};
    flowChanged = false;
    slotOrder = [];
    slotDict = {"history":"Any family history of glaucoma?",
                "prior": "Any prior eye surgery or laser?",
                "pressure":"Do you know what your highest eye pressre ever was?",
                "effects":"Do you have any adverse side effects to any glaucoma eyedrops before?",
                "faliure":"Do you have heart failure or asthma?",
                "typicalPressure":"What’s your typical eye pressure when you were followed by your previous doctor?",
                "spray":"Are you using any nasal spray, or systemic steroid medication?",
                "trauma":"Any previous trauma to or near the eye since infancy?",
                "thinner":"Are you on blood thinner?",
                "diabetes":"Do you have diabetes?"};
    //const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    //const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    //handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    const speakOutput = "Hello, User. which survey do you want to fill out?";
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
      || handlerInput.requestEnvelope.request.intent.name === "KenSurvey")
  },
  handle(handlerInput) {
    console.log("FLOW IN BEGIN: " + flowChanged);

    if(handlerInput.requestEnvelope.request.dialogState == "STARTED"){
      //Load interaction model from model.json. Approach can be changed later
      loadModel()
      //Initialize all necessary database fields
      initializeDBField();
      //Since the dialog is barely starting, we know what the current and next slots are.
      currentSlot = slotOrder[0];
      nextSlot = slotOrder[1];
      console.log("STARTED DIALOG, CURRENT SLOT: " + currentSlot);
      console.log("STARTED DIALOG, NEXT SLOT: " + nextSlot);
    }
    
    //Update the database if needed
    if(handlerInput.requestEnvelope.request.dialogState !== "COMPLETED"){
        if(attributes["temp_" + handlerInput.requestEnvelope.request.intent.name]){
          findPreviouslyElicitedSlot(handlerInput);
          if(previousElicitedSlot["field"]){
            updateFields(previousElicitedSlot["field"], previousElicitedSlot["fieldValue"])
          }
        }
        attributes["temp_" + handlerInput.requestEnvelope.request.intent.name] = handlerInput.requestEnvelope.request.intent;
    }
    // Should be prompted if the flow is changed

    //Update the slot variables
    if(handlerInput.requestEnvelope.request.dialogState == "IN_PROGRESS"){
      //Get the index of the current slot
      currentIndex = slotOrder.indexOf(currentSlot);
      //This is activated once one answer has been given. Get the 
      if(slotOrder[currentIndex + 1]){
        currentIndex += 1;
        currentSlot = slotOrder[currentIndex];
        if(slotOrder[currentIndex + 1]){
          nextSlot = slotOrder[currentIndex + 1];
        }
        else{
          nextSlot = null;
        }
        if(slotOrder[currentIndex - 1]){
          previousSlot = slotOrder[currentIndex - 1];
        }
        else{
          previousSlot=  null;
        }
      }
      else if(!slotOrder[currentIndex + 1] && flowChanged){
        return handlerInput.responseBuilder
        .speak("You've reached the end of the survey, but did not finish yet. Do you want to review it or come back to it later?")
        .reprompt("Hi User. You've reached the end of the survey, but did not finish yet. Do you want to review it or come back to it later?")
        .getResponse();
      }
      console.log("IN_PROGRESS DIALOG, PREVIOUS SLOT: " + previousSlot);
      console.log("IN_PROGRESS DIALOG, CURRENT SLOT: " + currentSlot);
      console.log("IN_PROGRESS DIALOG, NEXT SLOT: " + nextSlot);
    }  
    // set a boolean that checks that the normal flow is no longer being followed
      // 
      // if the original flow is not being followed (use the elicit slot directrive to prompt for the new (current) slots)
          // (i.e DO NOT RETURN TO THE ORIGINAL FLOW)

    //Check if the boolean mentioned above is false. That means we can continue with the normal flow
    console.log("FLOW: " + flowChanged);
    if(handlerInput.requestEnvelope.request.dialogState !== "COMPLETED" && flowChanged){
        return handlerInput.responseBuilder
        .speak(slotDict[currentSlot])       
       //.speak("What do you want the " + currentSlot + " to be?")
       //.reprompt("Sorry, what do you want the " + currentSlot + " to be?")
       .reprompt("Sorry I didn't get that, " + slotDict[currentSlot])
       .addElicitSlotDirective(currentSlot, handlerInput.requestEnvelope.request.intent)
       .getResponse()
    }
    else if(handlerInput.requestEnvelope.request.dialogState !== "COMPLETED" && !flowChanged){
        return handlerInput.responseBuilder
       .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
       .getResponse()
    }
    else {
        delete attributes['temp_' + handlerInput.requestEnvelope.request.intent.name];
        return handlerInput.responseBuilder
       .speak("Thank you for submitting your responses, User! Do you want to review your responses, submit, or come back later?")
       //Confirmations
       .getResponse()
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
    currentIndex = slotOrder.indexOf(currentSlot);
      //This is activated once one answer has been given. Get the 
      if(slotOrder[currentIndex - 1]){
        currentIndex -= 1;
        currentSlot = slotOrder[currentIndex];
        console.log(slotOrder);
        if(slotOrder[currentIndex + 1]){
          console.log(slotOrder[currentIndex + 1]);
          nextSlot = slotOrder[currentIndex + 1];
        }
        else{
          nextSlot = null;
        }
        if(slotOrder[currentIndex - 1]){
          previousSlot = slotOrder[currentIndex - 1];
        }
        else{
          previousSlot=  null;
        }
        console.log("NEXT INTENT, PREVIOUS SLOT: " + previousSlot);
        console.log("NEXT INTENT, CURRENT SLOT: " + currentSlot);
        console.log("NEXT INTENT, NEXT SLOT: " + nextSlot);

        return handlerInput.responseBuilder
      .speak(slotDict[currentSlot])
      .reprompt("Sorry I didn't get that, " + slotDict[currentSlot])
      //.speak("What do you want the " + currentSlot + " to be?")
      //.reprompt("Sorry, what do you want the " + currentSlot + " to be?")
      .addElicitSlotDirective(currentSlot,
            attributes[Object.keys(attributes)[0]])// at the moment we only have 1 attribute object 
      .getResponse();
      }
      else{
        return handlerInput.responseBuilder
        .speak("There are no previous questions. Do you want to continue?")
        .reprompt("Hi User. There are no previous questions. Do you want to continue?")
        .getResponse();
        //Finish Later
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
    flowChanged = true;
    currentIndex = slotOrder.indexOf(currentSlot);
      //This is activated once one answer has been given. Get the 
      if(slotOrder[currentIndex + 1]){
        currentIndex += 1;
        currentSlot = slotOrder[currentIndex];
        console.log(slotOrder);
        if(slotOrder[currentIndex + 1]){
          console.log(slotOrder[currentIndex + 1]);
          nextSlot = slotOrder[currentIndex + 1];
        }
        else{
          nextSlot = null;
        }
        if(slotOrder[currentIndex - 1]){
          previousSlot = slotOrder[currentIndex - 1];
        }
        else{
          previousSlot=  null;
        }
        console.log("NEXT INTENT, PREVIOUS SLOT: " + previousSlot);
        console.log("NEXT INTENT, CURRENT SLOT: " + currentSlot);
        console.log("NEXT INTENT, NEXT SLOT: " + nextSlot);

        return handlerInput.responseBuilder
      .speak(slotDict[currentSlot])
      .reprompt("Sorry I didn't get that, " + slotDict[currentSlot])
      //.speak("What do you want the " + currentSlot + " to be?")
      //.reprompt("Sorry, what do you want the " + currentSlot + " to be?")
      .addElicitSlotDirective(currentSlot,
            attributes[Object.keys(attributes)[0]])
      .getResponse();
      }
      else{
        return handlerInput.responseBuilder
        .speak("There are no more questions. You did not finish the survey yet. Do you want to review it or come back to it later?")
        .reprompt("Hi User. You've reached the end of the survey, but did not finish yet. Do you want to review it or come back to it later?")

        .getResponse();
        //Finish Later
      }
  }
};

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
        currentSlot = handlerInput.requestEnvelope.request.intent.slots.fieldToBeFixed.value;
        currentIndex = slotOrder.indexOf(currentSlot);
        if(slotOrder[currentIndex + 1]){
          nextSlot = slotOrder[currentIndex + 1];
        }
        else{
          nextSlot = null;
        }
        if(slotOrder[currentIndex - 1]){
          previousSlot = slotOrder[currentIndex - 1];
        }
        else{
          previousSlot=  null;
        }
        console.log("JUMP FIXING, PREVIOUS SLOT: " + previousSlot);
        console.log("JUMP FIXING, CURRENT SLOT: " + currentSlot);
        console.log("JUMP FIXING, NEXT SLOT: " + nextSlot);
        const speakOutput = "What do you want the " + handlerInput.requestEnvelope.request.intent.slots.fieldToBeFixed.value + " to be?"
      return handlerInput.responseBuilder
         .speak(speakOutput)
         .reprompt("Sorry, " + speakOutput)
         /*IMPORTANT!!! If user gives an invalid field to be fixed, the Alexa will still accept it for some reason
         and place it in (I'm assuming) the first empty slot. I thought addElicitSlotDirective would handle this easily,
         but I guess it doesn't.
         */
        // This is where the specific slot to be prompted is done.
        .addElicitSlotDirective(handlerInput.requestEnvelope.request.intent.slots.fieldToBeFixed.value, 
            attributes[Object.keys(attributes)[0]])
        .getResponse();
    }
  }
  
  // for next & previous handlers pass the next slot or previous slot variables tothe elicit slot directive
  // be sure to update the varibles as well, and set the flowChanged boolean to false 

 //Handles "I don't know responses. Bug where the last slot is not being asked. Will fix."***
  const IDKHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'IDKIntent';
    },
    handle(handlerInput) {
      // 2 options: Elaborate or skip question
      if (handlerInput.requestEnvelope.request.intent.slots.option.value === "skip"){
        flowChanged = true;
        //Get the index of the current slot
        currentIndex = slotOrder.indexOf(currentSlot);
        //This is activated once one answer has been given. Get the 
        if(slotOrder[currentIndex + 1]){
          currentIndex += 1;
          currentSlot = slotOrder[currentIndex];
        if(slotOrder[currentIndex + 1]){
          nextSlot = slotOrder[currentIndex + 1];
        }
        else{
          nextSlot = null;
        }
        if(slotOrder[currentIndex - 1]){
          previousSlot = slotOrder[currentIndex - 1];
        }
        else{
          previousSlot=  null;
        }
      }
        return handlerInput.responseBuilder
        .speak("Okay, I'll take you to the next question. "+slotDict[currentSlot])
        .addElicitSlotDirective(currentSlot, attributes[Object.keys(attributes)[0]])
        .getResponse();

      } 


      return handlerInput.responseBuilder
      .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
      .getResponse();

    }
  };


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
    IDKHandler,
    PreviousHandler,
    NextHandler,
    IDKHandler,
    HelpHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  //.addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();