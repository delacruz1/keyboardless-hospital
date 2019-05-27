const reservedUtterances = ["continue", "can i review my answers", "review", "skip", "next", "previous"];

module.exports = class Survey {
    constructor(surveyName) {
        this.questions = this.loadModel(surveyName);
        this.tree = {
          "prior": {
            "dependency": {
              "parent": "history",
              "requiredValue": "yes"
            },
            "forwardSlot": "pressure",
            "backSlot": "history"
          },
          "otherDemographic": {
            "dependency": {
              "parent": "demographic",
              "requiredValue": "none of the above"
            },
            "forwardSlot": "medication",
            "backSlot": "demographic"
          },
          "prescriptions": {
            "dependency": {
              "parent": "medication",
              "requiredValue": "yes"
            },
            "forwardSlot": "history",
            "backSlot": "medication"
          }
        }
        this.currentIndex = 0;
        this.currentSlot = this.questions[0];
        this.nextSlot = this.questions[1];
        this.previousSlot = null;
        this.previouslyElicitedSlot = {"field": null, "fieldValue": null};
        this.attributes = {};
        this.flowChanged = false;
        this.reviewSurvey = null;
        this.surveyName = surveyName;
        this.elaborations = {"history":"Glaucoma is a group of eye conditions that damage the optic nerve, the health of which is vital for good vision. This damage is often caused by an abnormally high pressure in your eye and is one of the leading causes of blindness. Do you have any knowledge of any family member in the past that has experienced glaucoma?",
                                "prior": "Have you had any surgecil procedures or laser applied to improve any condition of your eyes?",
                                "pressure":"Eye pressure is measured in millimeters of mercury. Normal eye pressure ranges from 12 to 22 millimeters of mercury.",
                                "effects":"Common side effects experienced with carbonic anhydrase inhibitor eye drops include burning, a bitter taste, eyelid reactions and eye redness. Have you experienced any of this or something different?",
                                "failure":"Heart failure is the condition where your heart is not able to pump enough blood to meet the body's needs. Common symptoms of these are shortness of breath and major fatigue. Asthma is a condition in which your airways narrow and swell and produce extra mucus. This can make breathing difficult and trigger coughing, wheezing and shortness of breath.",
                                "typicalPressure":"Eye pressure is measured in millimeters of mercury. Normal eye pressure ranges from 12 to 22 millimeters of mercury.",
                                "spray":"Nasal spray is a medication that provides powerful nasal congestion relief.",
                                "trauma":"Do you recall any previous injury, trauma or detrimental condition to the eye or nearby regions?",
                                "thinner":"Blood thinners are medicines that prevent blood clots from forming. They also keep existing blood clots from getting larger. Are you on blood thinner?",
                                "diabetes":"Diabetes is a disease in which your blood glucose, or blood sugar, levels are too high. Some symptoms include increased thirst, extreme hunger, and unexplained weight loss. Do you have diabetes?"};
        this.introductions = {
                              "TestSurvey":"4",
                              "KenSurvey":"This survey collects information regarding any optical damage or pre-conditions which could lead to glaucoma. The survey is 10 questions long.",
                              "DemoSurvey":"13",
                             }
        this.slotDict = this.loadSlotDict();
        this.validationMessages = this.loadValidationMessages();
        this.slotTypes = this.loadSlotTypes();
        this.optionalQuestions = ["dob"];
    }

    loadModel(surveyName){
        var order = [];
        const fs = require('fs');
        const fileContents = fs.readFileSync('./model.json', 'utf8');
      
        try {
          const data = JSON.parse(fileContents)
          data.interactionModel.languageModel.intents.forEach((item) => {
            if(item.name == surveyName){
              item.slots.forEach((slot) => {
                order.push(slot.name);
              });
            }
          });
          return order;
        } catch(err) {
          console.error(err);
        }
      }

    findPreviouslyElicitedSlot(handlerInput){
      for(var i = 0 ; i < Object.keys(handlerInput.requestEnvelope.request.intent.slots).length ; i++){
        var slotName = Object.keys(handlerInput.requestEnvelope.request.intent.slots)[i];
        if(handlerInput.requestEnvelope.request.intent.slots[slotName].value != 
          this.attributes["temp_" + this.surveyName].slots[slotName].value){
              this.previouslyElicitedSlot["field"] = slotName;
              this.previouslyElicitedSlot["fieldValue"] =  handlerInput.requestEnvelope.request.intent.slots[slotName].value;
              break;
            }
        else{
          this.previouslyElicitedSlot = {"field": null, "fieldValue": null};
        }
      }
    }

    saveSurveyState(handlerInput){
        return new Promise((resolve, reject) => {
            handlerInput.attributesManager.getPersistentAttributes()
            .then((saveState) => { // pick up here, you did need to check that dictionary
                if(this.surveyName == handlerInput.requestEnvelope.request.intent.name){
                  console.log("SURVEY NAME SAVED: " + this.surveyName);
                    saveState[this.surveyName] = handlerInput.requestEnvelope.request.intent;
                    Object.keys(saveState[this.surveyName].slots).forEach((slot) => {
                      saveState[this.surveyName].slots[slot]["questionText"] = this.slotDict[slot];
                    });
                }
                saveState[this.surveyName]["surveyIntroduction"] = this.introductions[this.surveyName];
                saveState[this.surveyName]["questionOrder"] = this.questions;
                saveState[this.surveyName]["currentSlot"] = this.currentSlot;
                saveState[this.surveyName]["flow"] = this.flowChanged;
                handlerInput.attributesManager.setPersistentAttributes(saveState);
                handlerInput.attributesManager.savePersistentAttributes();
            })
            .catch((error) => {
                console.log(error);
                reject(error);
            });
        });
    } // try to split the function so that you can call the secondary function only at next & prev...

    loadSurveyState(saveState, surveyName){
      this.questions = this.loadModel(surveyName);
      this.slotDict = this.loadSlotDict();
      this.currentSlot = saveState[surveyName].currentSlot;
      this.currentIndex = this.questions.indexOf(this.currentSlot);
      if(this.nextSlotExists()){
        this.nextSlot = this.questions[this.currentIndex + 1];
      }
      if(this.previousSlotExists()){
        this.previousSlot = this.questions[this.currentIndex - 1];
      }
      this.attributes["temp_" + surveyName] = saveState[surveyName];
      this.flowChanged = saveState[surveyName].flow;
    }

    saveAttributes(handlerInput){
        this.attributes["temp_" + handlerInput.requestEnvelope.request.intent.name] = handlerInput.requestEnvelope.request.intent;
    }

    advanceSlots(){
      var dependencyCheck = this.checkDependency();
      if(dependencyCheck){
        this.currentIndex += 1;
        this.currentSlot = this.questions[this.currentIndex];
        if(this.nextSlotExists()){
          this.nextSlot = this.questions[this.currentIndex + 1];
        }
        else{
          this.nextSlot = null;
        }
        if(this.previousSlotExists()){
          this.previousSlot = this.questions[this.currentIndex - 1];
        }
        else{
          this.previousSlot=  null;
        }
        console.log("NEW CURRENT SLOT IS: " + this.currentSlot + "AT INDEX: "+ this.currentIndex);
        console.log("NEW NEXT SLOT IS: " + this.nextSlot);
      }
      //Messy, should be in an else statement. Will fix later
      this.goToCorrectSlot("forwardSlot");
    }

    retractSlots(){
      var dependencyCheck = this.checkDependency();
      if(dependencyCheck){
        this.currentIndex -= 1;
        this.currentSlot = this.questions[this.currentIndex];
        if(this.nextSlotExists()){
          this.nextSlot = this.questions[this.currentIndex + 1];
        }
        else{
          this.nextSlot = null;
        }
        if(this.previousSlotExists()){
          this.previousSlot = this.questions[this.currentIndex - 1];
        }
        else{
          this.previousSlot = null;
        }
      }
      //Messy, should be in an else statement. Will fix later
      this.goToCorrectSlot("backSlot");
    }

    setFlow(flow){
        this.flowChanged = flow;
    }

    nextSlotExists(){
        if(this.questions[this.currentIndex + 1]){
            return true;
        }
        return false;
    }

    previousSlotExists(){
        if(this.questions[this.currentIndex - 1]){
            return true;
        }
        return false;
    }

    checkDependency(){
      var dependencyCheck = true;
      if(Object.keys(this.tree).includes(this.currentSlot)){
        dependencyCheck = this.tree[this.currentSlot].dependency.requiredValue == 
                        this.attributes["temp_" + this.surveyName].slots[this.tree[this.currentSlot].dependency.parent].value;
      }
      return dependencyCheck;
    }

    goToCorrectSlot(slot){
      //Messy, shouldn't have to check condition again. Will fix later
      var dependencyCheck = this.checkDependency();
      if(!dependencyCheck){
        this.emptySlotValue();
        this.flowChanged = true;
        this.currentSlot = this.tree[this.currentSlot][slot];
        this.currentIndex = this.questions.indexOf(this.currentSlot);
        if(this.nextSlotExists()){
          this.nextSlot = this.questions[this.currentIndex + 1];
        }
        else{
          this.nextSlot = null;
        }
        if(this.previousSlotExists()){
          this.previousSlot = this.questions[this.currentIndex - 1];
        }
        else{
          this.previousSlot=  null;
        }
        console.log("(DEPENDENCY FAILED) NEW CURRENT SLOT IS: " + this.currentSlot + "AT INDEX: "+ this.currentIndex);
        console.log("NEW NEXT SLOT IS: " + this.nextSlot);
      }
    }

    emptySlotValue(){
      this.attributes["temp_" + this.surveyName].slots[this.currentSlot] = 
      {
        "name": this.currentSlot,
        "confirmationStatus": "NONE"
      }
    }

    loadSlotDict(){
      var prompts = {};
      var slotDict = {}
      const fs = require('fs');
      const fileContents = fs.readFileSync('./model.json', 'utf8');
      try {
        const data = JSON.parse(fileContents);
        data.interactionModel.dialog.intents.forEach((item) => {
          if(item.name == this.surveyName){
            item.slots.forEach((slot) => {
              prompts[slot.prompts.elicitation] = slot.name;
            });
          }
        });
        data.interactionModel.prompts.forEach((item) => {
          if(Object.keys(prompts).includes(item.id)){
            slotDict[prompts[item.id]] = item.variations[0].value;
          }
        });
        return slotDict;
      } catch(err) {
        console.error(err);
      }
    }

    loadSlotTypes(){
      var types = {};
      const fs = require('fs');
      const fileContents = fs.readFileSync('./model.json', 'utf8');
      try {
        const data = JSON.parse(fileContents);
        data.interactionModel.languageModel.intents.forEach((intent) => {
          if(intent.name == this.surveyName){
            intent.slots.forEach((slot) => {
              console.log(slot);
              types[slot.name] = slot.type;
            })
          }
        })
      } catch(err) {
        console.error(err);
      }
      return types;
    }

    loadValidationMessages(){

    }

    validate(handlerInput){
      //This method will return a boolean based on if the validation passes
      //Make sure to specify: .field or .fieldValue

      //The skill broke because it couldn't accept a DATE value. My way of handling it.
      //Also, I think currentSlot and previouslyElicitedSlot.field are the same under the != COMPLETED condition.
      //Therefore Might trash the previouslyElicitedSlot
      console.log("VALIDATE FIELD" + this.currentSlot);
      console.log(this.slotTypes[this.currentSlot]);
	  var slotValue = handlerInput.requestEnvelope.request.intent.slots[this.currentSlot].value;
      switch(this.slotTypes[this.currentSlot]) {
        case "AMAZON.SearchQuery":
		return true;
          break;
        case "AMAZON.DATE":
          return validateDate(slotValue);
          break;
        case "AMAZON.NUMBER":
		  return validateNumber(slotValue);
          break;
        case "AMAZON.PhoneNumber":
		  return validatePhone(slotValue);
          break;
        case "YesNoType":
			return true;
          break;
        default:
          return true;
      }
    }

    isOptional(slot){
      return this.optionalQuestions.includes(slot);
    }

    isComplete(handlerInput){
      for(let key of Object.keys(handlerInput.requestEnvelope.request.intent.slots)){
        console.log("CHECKING IF " + key + "HAS A VALUE");
        if(!handlerInput.requestEnvelope.request.intent.slots[key].value){
          if(this.isOptional(key)){
            console.log(key + " DOES NOT HAVE A VALUE, BUT IS OPTIONAL");
            continue;
          }
          else if(Object.keys(this.tree).includes(key)){
            if(handlerInput.requestEnvelope.request.intent.slots[this.tree[key].dependency.parent].value != this.tree[key].dependency.requiredValue){
              console.log(key + " DOES NOT HAVE A VALUE, BUT REQUIREMENT WAS NOT SATISFIED");
              continue;
            }
            else{
              console.log(key + " DOES NOT HAVE A VALUE AND ITS CONDITION WAS SATISFIED");
              return false;
            }
          }
          else{
            console.log(key + " DOES NOT HAVE A VALUE AND IS REQUIRED");
            return false;
          }
        }
      }
      return true;
    }
}

//Date
function validateDate(input)
{
	console.log("VALIDATE DATE: " + input);
	if (!input) return false;
	var date_re = /^\d{3}[\d,X](-((WI|SP|SU|FA)|(\d{2})(-(\d{2}))?|W(\d{2})(-WE)?))?$/;
	var match = input.match(date_re);
	if (!match) return false;

	var month = match[4];
	var day = match[6];
	var week = match[7];

	if (month)
	{
		month = parseInt(month);
		if (month < 1) return false;
		if (month > 12) return false;
	}
	if (day)
	{
		day = parseInt(day);
		if (day < 1) return false;
		if (day > 31) return false;
	}
	console.log(week);
	if (week)
	{
		week = parseInt(week);
		if (week < 1) return false;
		if (week > 52) return false;
	}
	return true;
}

//Phone
function validatePhone(input)
{
	console.log("VALIDATE PHONE: " + input);
	if (!input) return false;
	var phone_re = /^(\+?\d{11}|\d{10}|\d{7})$/;
	var match = input.match(phone_re);
	if (match)
	{
		return true;
	}
	else
	{
		return false;
	}
}

//Number
function validateNumber(input)
{
	console.log("VALIDATE NUMBER: " + input);
	if (!input) return false;
	var num_re = /^\d+$/;
	var match = input.match(num_re);
	if (match)
	{
		return true;
	}
	else
	{
		return false;
	}
}