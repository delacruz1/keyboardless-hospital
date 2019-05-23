module.exports = class Survey {
    constructor(surveyName) {
        this.questions = this.loadModel(surveyName);
        this.tree = this.initializeTree();
        this.currentIndex = 0;
        this.currentSlot = this.questions[0];
        this.nextSlot = this.questions[1];
        this.previousSlot = null;
        this.previouslyElicitedSlot = {"field": null, "fieldValue": null};
        this.attributes = {};
        this.flowChanged = false;
        this.reviewSurvey = null;
        this.elaborations = {"history":"Glaucoma is a group of eye conditions that damage the optic nerve, the health of which is vital for good vision. This damage is often caused by an abnormally high pressure in your eye and is one of the leading causes of blindness. Do you have any knowledge of any family member in the past that has experienced glaucoma?",
                                "prior": "Have you had any surgical procedures or laser applied to improve any condition of your eyes?",
                                "pressure":"Eye pressure is measured in millimeters of mercury. Normal eye pressure ranges from 12 to 22 millimeters of mercury.",
                                "effects":"Common side effects experienced with carbonic anhydrase inhibitor eye drops include burning, a bitter taste, eyelid reactions and eye redness. Have you experienced any of this or something different?",
                                "failure":"Heart failure is the condition where your heart is not able to pump enough blood to meet the body's needs. Common symptoms of these are shortness of breath and major fatigue. Asthma is a condition in which your airways narrow and swell and produce extra mucus. This can make breathing difficult and trigger coughing, wheezing and shortness of breath.",
                                "typicalPressure":"Eye pressure is measured in millimeters of mercury. Normal eye pressure ranges from 12 to 22 millimeters of mercury.",
                                "spray":"Nasal spray is a medication that provides powerful nasal congestion relief.",
                                "trauma":"Do you recall any previous injury, trauma or detrimental condition to the eye or nearby regions?",
                                "thinner":"Blood thinners are medicines that prevent blood clots from forming. They also keep existing blood clots from getting larger. Are you on blood thinner?",
                                "diabetes":"Diabetes is a disease in which your blood glucose, or blood sugar, levels are too high. Some symptoms include increased thirst, extreme hunger, and unexplained weight loss. Do you have diabetes?"};

        this.slotDict = {"history":"Any family history of glaucoma?",
                        "prior": "Any prior eye surgery or laser?",
                        "pressure":"Do you know what your highest eye pressre ever was?",
                        "effects":"Do you have any adverse side effects to any glaucoma eyedrops before?",
                        "failure":"Do you have heart failure or asthma?",
                        "typicalPressure":"What’s your typical eye pressure when you were followed by your previous doctor?",
                        "spray":"Are you using any nasal spray, or systemic steroid medication?",
                        "trauma":"Any previous trauma to or near the eye since infancy?",
                        "thinner":"Are you on blood thinner?",
                        "diabetes":"Do you have diabetes?",
                        "name": "What is your name?",
                        "age": "What is your age?",
                        "weight": "What is your weight in pounds?",
                        "reason": "What is your reason for your visit with Dr. Browne?"
                    };
    }

    initializeTree(){
        let newTree = {};
        for(let i = 0 ; i < this.questions.length ; i++){
            newTree[this.questions[i]] = {
                "nextQuestions" : [],
                "previousQuestion": []
            };
        }
        return newTree;
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
        Object.keys(handlerInput.requestEnvelope.request.intent.slots).forEach(key => {
          if(handlerInput.requestEnvelope.request.intent.slots[key]["value"] != 
            this.attributes["temp_" + handlerInput.requestEnvelope.request.intent.name]["slots"][key]["value"]){
              this.previouslyElicitedSlot["field"] = key;
              this.previouslyElicitedSlot["fieldValue"] =  handlerInput.requestEnvelope.request.intent.slots[key]["value"]
            }
          
        });
    }

    saveSurveyState(handlerInput){
        return new Promise((resolve, reject) => {
            handlerInput.attributesManager.getPersistentAttributes()
            .then((saveState) => {
                saveState[handlerInput.requestEnvelope.request.intent.name] = handlerInput.requestEnvelope.request.intent;
                saveState[handlerInput.requestEnvelope.request.intent.name]["currentSlot"] = this.currentSlot;
                saveState[handlerInput.requestEnvelope.request.intent.name]["flow"] = this.flowChanged;
                handlerInput.attributesManager.setPersistentAttributes(saveState);
                handlerInput.attributesManager.savePersistentAttributes();
            })
            .catch((error) => {
                console.log(error);
                reject(error);
            });
        });
    }

    loadSurveyState(saveState, surveyName){
      this.questions = this.loadModel(surveyName);
      this.currentSlot = saveState[surveyName].currentSlot;
      this.currentIndex = this.questions.indexOf(this.currentSlot);
      if(this.nextSlotExists()){
        this.nextSlot = this.questions[this.currentIndex + 1];
      }
      if(this.previousSlotExists()){
        this.previousSlot = this.questions[this.currentIndex - 1];
      }
      this.attributes = saveState[surveyName];
      this.flowChanged = saveState[surveyName].flow;
    }

    saveAttributes(handlerInput){
        this.attributes["temp_" + handlerInput.requestEnvelope.request.intent.name] = handlerInput.requestEnvelope.request.intent;
    }

    advanceSlots(){
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
    }

    retractSlots(){
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
          this.previousSlot=  null;
        }
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
}