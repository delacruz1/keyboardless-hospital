const instructions = "Hello, Dr. Ziv.";

const Alexa = require('ask-sdk-core');
const awsSDK = require('aws-sdk');
const testFormTable = 'Demo';
const db = new awsSDK.DynamoDB();
const docClient =  new awsSDK.DynamoDB.DocumentClient(); //new AWS.DynamoDB.DocumentClient();
var confirmationCheck;
var fix;
const testSession = "123";
var beginName = "N/A";
var beginDOB = "N/A";
var beginAge = "N/A";

/* INTENT HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    const speakOutput = "Hello, Dr. Ziv";
    const repromptSpeech = "hello, Dr. Ziv";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptSpeech)
      .getResponse();
  },
};

const BeginFormHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
      && !handlerInput.requestEnvelope.request.intent.slots.name.value;
  },
  handle(handlerInput) {
    confirmationCheck = false;
    fix = false;
    let params = {
      TableName: testFormTable,
      Item: {
        SessionID: testSession,
        PatientName: beginName,
        PatientDOB: beginDOB,
        PatientAge: beginAge
      },
      ReturnValues: 'ALL_OLD'
    };
    docClient.put(params).promise();
    return handlerInput.responseBuilder
      .speak("What is the Name?")
      .reprompt("Sorry, what is the Name?")
      .addElicitSlotDirective("name")
      .getResponse();
  }
}

const DOBHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
      && handlerInput.requestEnvelope.request.intent.slots.name.value
      && !handlerInput.requestEnvelope.request.intent.slots.dob.value
  },
  handle(handlerInput) {
    name = handlerInput.requestEnvelope.request.intent.slots.name.value;
    let params = {
      TableName:testFormTable,
      Key:{
          "SessionID":testSession
      },
      UpdateExpression: "set PatientName = :updateName",
      ExpressionAttributeValues:{
          ":updateName":name
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
    return handlerInput.responseBuilder
      .speak('What is the Date of Birth?')
      .reprompt('Sorry, what is the Date of Birth?')
      .addElicitSlotDirective('dob')
      .getResponse();
  }
}

const AgeHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
      && handlerInput.requestEnvelope.request.intent.slots.name.value
      && !handlerInput.requestEnvelope.request.intent.slots.age.value
  },
  handle(handlerInput) {
      dob = handlerInput.requestEnvelope.request.intent.slots.dob.value;
      let params = {
        TableName:testFormTable,
        Key:{
            "SessionID": testSession
        },
        UpdateExpression: "set PatientDOB = :updateDOB",
        ExpressionAttributeValues:{
            ":updateDOB":dob
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
    return handlerInput.responseBuilder
      .speak('What is the Age?')
      .reprompt('Sorry, what is the Age?')
      .addElicitSlotDirective('age')
      .getResponse();
  }
}

const ConfirmationHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
        && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
        && handlerInput.requestEnvelope.request.dialogState === "IN_PROGRESS"
        && handlerInput.requestEnvelope.request.intent.slots.name.value
        && handlerInput.requestEnvelope.request.intent.slots.dob.value
        && handlerInput.requestEnvelope.request.intent.slots.age.value
        && !confirmationCheck
        && !fix;
  },
  handle(handlerInput) {
    confirmationCheck = true;
    age = handlerInput.requestEnvelope.request.intent.slots.age.value;
    dob = handlerInput.requestEnvelope.request.intent.slots.dob.value;
    name = handlerInput.requestEnvelope.request.intent.slots.name.value;
    let params = {
      TableName:testFormTable,
      Key:{
          "SessionID": testSession
      },
      UpdateExpression: "set PatientAge = :updateAge, PatientName = :updateName, PatientDOB = :updateDOB",
      ExpressionAttributeValues:{
          ":updateAge":age,
          ":updateName":name,
          ":updateDOB":dob
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
    CONFIRM_MESSAGE = "Just to confirm your responses, the name is " + name + ", the Date of Birth is " + dob + ", and the Age is "
    + age + ". Is this correct?";
    console.log("USER CONFIRM CONFIRMATION: " + confirmationCheck);
    console.log("USER CONFIRM FIX: " + fix);
    return handlerInput.responseBuilder
      .speak(CONFIRM_MESSAGE)
      .reprompt(CONFIRM_MESSAGE)
      .addElicitSlotDirective('confirmation')
      .getResponse();
  }
}

const FixSlotHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
        && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
        && handlerInput.requestEnvelope.request.dialogState === "IN_PROGRESS"
        && handlerInput.requestEnvelope.request.intent.slots.name.value
        && handlerInput.requestEnvelope.request.intent.slots.dob.value
        && handlerInput.requestEnvelope.request.intent.slots.age.value
        && (handlerInput.requestEnvelope.request.intent.slots.confirmation.value == "no"
        || handlerInput.requestEnvelope.request.intent.slots.confirmation.value == "incorrect")
        && !fix;
  },
  handle(handlerInput) {
    fix = true;
    FIX_MESSAGE = "Which field is incorrect?";
    console.log("FIX CONFIRMATION: " + confirmationCheck);
    console.log("FIX FIX: " + fix);
    return handlerInput.responseBuilder
      .speak(FIX_MESSAGE)
      .reprompt(FIX_MESSAGE)
      .addElicitSlotDirective('slotFix')
      .getResponse();
  }
}

const FixDOBHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
      && (handlerInput.requestEnvelope.request.intent.slots.slotFix.value == "date of birth"
      || handlerInput.requestEnvelope.request.intent.slots.slotFix.value == "the date of birth")
      && fix
  },
  handle(handlerInput) {
    confirmationCheck = false;
    fix = false;
    console.log("DOBFIX CONFIRMATION: " + confirmationCheck);
    console.log("DOBFIX FIX: " + fix);
    return handlerInput.responseBuilder
      .speak('What is the Date of Birth?')
      .reprompt('Sorry, what is the Date of Birth?')
      .addElicitSlotDirective('dob')
      .getResponse();
  }
}

const FixAgeHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
      && (handlerInput.requestEnvelope.request.intent.slots.slotFix.value == "age"
      || handlerInput.requestEnvelope.request.intent.slots.slotFix.value == "the age")
      && fix
  },
  handle(handlerInput) {
    confirmationCheck = false;
    fix = false;
    console.log("AGEFIX CONFIRMATION: " + confirmationCheck);
    console.log("AGEFIX FIX: " + fix);
    return handlerInput.responseBuilder
      .speak('What is the Age?')
      .reprompt('Sorry, what is the Age?')
      .addElicitSlotDirective('age')
      .getResponse();
  }
}

const FixNameHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
      && (handlerInput.requestEnvelope.request.intent.slots.slotFix.value == "name"
      || handlerInput.requestEnvelope.request.intent.slots.slotFix.value == "the name")
      && fix
  },
  handle(handlerInput) {
    confirmationCheck = false;
    fix = false;
    return handlerInput.responseBuilder
      .speak('What is the Name?')
      .reprompt('Sorry, what is the Name?')
      .addElicitSlotDirective('name')
      .getResponse();
  }
}


const CompleteHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
        && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
        && handlerInput.requestEnvelope.request.dialogState === "IN_PROGRESS"
        && handlerInput.requestEnvelope.request.intent.slots.name.value
        && handlerInput.requestEnvelope.request.intent.slots.dob.value
        && handlerInput.requestEnvelope.request.intent.slots.age.value
        && (handlerInput.requestEnvelope.request.intent.slots.confirmation.value == "yes"
        || handlerInput.requestEnvelope.request.intent.slots.confirmation.value == "correct")
        && !fix;
  },
  handle(handlerInput) {
    confirmationCheck = false;
    fix = false;
    console.log("COMPLETE CONFIRMATION: " + confirmationCheck);
    console.log("COMPLETE FIX: " + fix);
    return handlerInput.responseBuilder
      .speak("Form completed!")
      .withShouldEndSession(false)
      .getResponse();
  }
}

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {

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

// const LocalizationInterceptor = {
//   process(handlerInput) {
//     const localizationClient = i18n.use(sprintf).init({
//       lng: handlerInput.requestEnvelope.request.locale,
//       overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
//       resources: languageStrings,
//       returnObjects: true,
//     });

//     const attributes = handlerInput.attributesManager.getRequestAttributes();
//     attributes.t = function (...args) {
//       return localizationClient.t(...args);
//     };
//   },
// };

/* LAMBDA SETUP */
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    BeginFormHandler,
    ConfirmationHandler,
    CompleteHandler,
    FixSlotHandler,
    DOBHandler,
    AgeHandler,
    FixDOBHandler,
    FixAgeHandler,
    FixNameHandler,
    HelpHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  //.addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();