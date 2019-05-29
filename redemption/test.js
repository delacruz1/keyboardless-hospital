var Survey = require("./topological.js");
survey = new Survey("DemoSurvey");

Object.keys(survey.slotDict).forEach((item) => {
    console.log("SLOT: " + item)
    console.log(survey.slotDict[item][Math.floor(Math.random() * survey.slotDict[item].length)].value);
});