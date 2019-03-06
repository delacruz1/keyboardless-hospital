const alexaSDK = require('alexa-sdk');
const awsSDK = require('aws-sdk');
const promisify = require('es6-promisify');

const appId = 'amzn1.ask.skill.9c63352f-f135-4ebb-90a9-993c304c72ae';
const testFormTable = 'TestForm';
const docClient =  new awsSDK.DynamoDB.DocumentClient(); //new AWS.DynamoDB.DocumentClient();

// convert callback style functions to promises
// const dbScan =  promisify(docClient.scan, docClient);
// const dbGet = promisify(docClient.get, docClient);
// const dbPut = promisify(docClient.put, docClient);
// const dbDelete = promisify(docClient.delete, docClient);

const instructions = "Hello, Dr. Ziv.";

const handlers = {

  /**
   * Triggered when the user says "Alexa, open Keyboardless Hospital.
   */
  'LaunchRequest'() {
    this.emit(':ask', instructions);
  },

  
  'BeginTestFormIntent'() {
    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;

    console.log("BEGINNING INTENT");

    // Name
    if (!slots.Name.value) {
      const slotToElicit = 'Name';
      const speechOutput = 'Patient Name?';
      const repromptSpeech = 'Patient Name?';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    

    // Date of Birth
    if (!slots.DateofBirth.value) {
      const slotToElicit = 'DateofBirth';
      const speechOutput = 'Date of Birth?';
      const repromptSpeech = 'Date of Birth?';
      const aleeexa = this;

      const name = slots.Name.value;
      const nameParams = {
        TableName: testFormTable,
        Item: {
          Name: name,
          UserId: userId
        },
        ReturnValues: 'ALL_OLD'
      };

      setInterval(function(){
        docClient.put(nameParams).promise();
      }, 0);
      return aleeexa.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    // Age
    if (!slots.Age.value) {
      const slotToElicit = 'Age';
      const speechOutput = 'Age?';
      const repromptSpeech = 'Age?';
      const aleeexa = this;

      const name = slots.Name.value;
      const dob = slots.DateofBirth.value;
      const newParams = {
        TableName: testFormTable,
        Item: {
          Name: name,
          UserId: userId,
          DateofBirth: dob
        },
        ReturnValues: 'ALL_OLD'
      };

      setInterval(function(){
        docClient.update(newParams).promise();
      }, 0);
      return aleeexa.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    // Phone Number
    if (!slots.PhoneNumber.value) {
      const slotToElicit = 'PhoneNumber';
      const speechOutput = 'Phone Number?';
      const repromptSpeech = 'Phone Number?';
      const aleeexa = this;

      const name = slots.Name.value;
      const dob = slots.DateofBirth.value;
      const age = slots.Age.value;
      const newParams = {
        TableName: testFormTable,
        Item: {
          Name: name,
          UserId: userId,
          DateofBirth: dob,
          Age: age
        },
        ReturnValues: 'ALL_OLD'
      };

      setInterval(function(){
        docClient.update(newParams).promise();
      }, 0);
      return aleeexa.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    // all slot values received and confirmed, now add the record to DynamoDB

    //const name = slots.Name.value;
    const name = slots.Name.value;
    const dob = slots.DateofBirth.value;
    const age = slots.Age.value;
    const phone = slots.PhoneNumber.value;
    const newParams = {
      TableName: testFormTable,
      Item: {
        Name: name,
        UserId: userId,
        DateofBirth: dob,
        Age: age,
        PhoneNumber: phone
      },
      ReturnValues: 'ALL_OLD'
    };
    setInterval(function(){
      docClient.update(newParams).promise();
    }, 0);

    // const checkIfPatientDocExistsParams = {
    //   TableName: testFormTable,
    //   Key: {
    //     Name: name,
    //     UserId: userId
    //   },
    //   ReturnValues: 'ALL_OLD'
    // };

    // console.log('Attempting to add patient test form', dynamoParams);

    // // query DynamoDB to see if the item exists first
    // docClient.get(checkIfPatientDocExistsParams).promise()
    //   .then(data => {
    //     console.log('Get item succeeded', data);

    //     const entry = data.Item;

    //     if (entry) {
    //       const errorMsg = `Test Form for ${name} already exists!`;
    //       this.emit(':tell', errorMsg);
    //       throw new Error(errorMsg);
    //     }
    //     else {
    //       // no match, add the test form for the patient
    //       return docClient.put(dynamoParams).promise();
    //     }
    //   })
    //   .then(data => {
    //     console.log('Add item succeeded', data);

    //     this.emit(':tell', `Test Form for ${name} added!`);
    //   })
    //   .catch(err => {
    //     console.error(err);
    //   });
  },

  'Unhandled'() {
    console.error('problem', this.event);
    this.emit(':ask', 'An unhandled problem occurred!');
  },

  'AMAZON.HelpIntent'() {
    const speechOutput = instructions;
    const reprompt = instructions;
    this.emit(':ask', speechOutput, reprompt);
  },

  'AMAZON.CancelIntent'() {
    this.emit(':tell', 'Goodbye!');
  },

  'AMAZON.StopIntent'() {
    this.emit(':tell', 'Goodbye!');
  }
};

exports.handler = function handler(event, context) {
  const alexa = alexaSDK.handler(event, context);
  alexa.appId = appId;
  alexa.registerHandlers(handlers);
  alexa.execute();
};