var Survey = require("./topological.js");
survey = new Survey("DemoSurvey");

Object.keys(survey.slotDict).forEach((item) => {
    console.log("SLOT: " + item)
    console.log(survey.slotDict[item][survey.slotDict[item].length - 1].value);
});