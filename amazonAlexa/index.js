const instructions = "Hello, Dr. Ziv.";

const Alexa = require('ask-sdk-core');
const awsSDK = require('aws-sdk');
const testFormTable = 'Demo';
const db = new awsSDK.DynamoDB();
const docClient =  new awsSDK.DynamoDB.DocumentClient(); //new AWS.DynamoDB.DocumentClient();

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
      && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addDelegateDirective()
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
    const params = {
      TableName: testFormTable,
      Item: {
        Name: name
      },
      ReturnValues: 'ALL_OLD'
    };

    docClient.put(params).promise();
    return handlerInput.responseBuilder
      .speak('Date of Birth?')
      .reprompt('What is the Date of Birth?')
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
            "Name":name
        },
        UpdateExpression: "set DOB = :updateDOB",
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
      .speak('Age?')
      .reprompt('What is the Age?')
      .addElicitSlotDirective('age')
      .getResponse();
  }
}

const CompleteHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
        && handlerInput.requestEnvelope.request.intent.name === "BeginFormIntent"
        && handlerInput.requestEnvelope.request.dialogState === "COMPLETED"
        && handlerInput.requestEnvelope.request.intent.slots.name.value
        && handlerInput.requestEnvelope.request.intent.slots.dob.value
        && handlerInput.requestEnvelope.request.intent.slots.age.value
  },
  handle(handlerInput) {
    age = handlerInput.requestEnvelope.request.intent.slots.age.value;
    let params = {
      TableName:testFormTable,
      Key:{
          "Name":name
      },
      UpdateExpression: "set Age = :updateAge",
      ExpressionAttributeValues:{
          ":updateAge":age
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
      .speak('Form Completed!')
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
    CompleteHandler,
    DOBHandler,
    AgeHandler,
    HelpHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  //.addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();