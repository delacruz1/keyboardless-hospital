# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# [START gae_python37_render_template]
import datetime
from flask import Flask, render_template, request
from dynamodbOps import *


app = Flask(__name__)

@app.route('/')
def root():
    dummy_time = ["hater oclock"]
    doc = table_get_all("Responses")
    return render_template('index.html', times=dummy_time, doc=doc)

@app.route('/my_surveys.html')
def mySurveysPage():
    dr = "D2"
    my_dummy_surveys = [
    {
        "surveyName" : "Dr. Ziv Pre-Appointment Questionnaire",
        "surveyCo" : "UCI Dentist",
        "surveyIntro" : "You gotta floss, according to Ziv's Law."
    },
    {
        "surveyName" : "Dr. Peter Anteater Post Survey Request",
        "surveyCo" : "Supreme Leader of UCI",
        "surveyIntro" : "Fill this out NOW."
    }]
    #my_dummy_surveys = ["hello",]
    so = table_get_all("Surveys", key=lambda x: {"DoctorID":dr} in x["DoctorAccess"])
    survey_objs = []
    for s in so:
        url = s["SurveyName"].replace(" ", "%20")
        survey_objs.append((s,url))
    return render_template('my_surveys.html', mySurveys=survey_objs)

@app.route('/view_survey.html')
def viewSurveyPage():
    survey = request.args.get('survey')
    view = request.args.get('view') if request.args.get('view') else "questions"
    key    = survey.replace("%20", " ")
    survey_obj = table_query("Surveys", {"SurveyName":key})
    url = request.url[:request.url.find("&") if "&" in request.url else len(request.url)]
    responses = [
        {"Name":"Bob Smith","Date":"04/25/1995","Q1":"Male","Q2":"None"},
        {"Name":"Jen Jones","Date":"03/15/1952","Q1":"Female","Q2":"Father with heart disease"},
        {"Name":"Lucy Brown","Date":"08/14/2001","Q1":"Female","Q2":"None"},
        {"Name":"Carol Brown","Date":"05/03/1977","Q1":"Non-Binary","Q2":"Mat. grandmother and mather died of heart disease"},
        {"Name":"Dick Nixon","Date":"11/27/1984","Q1":"Male","Q2":"Had 5 previous heart attacks"}
        ]
    return render_template('view_survey.html', my_survey=survey_obj, view=view, this_url = url, responses=responses)

if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    # Flask's development server will automatically serve static files in
    # the "static" directory. See:
    # http://flask.pocoo.org/docs/1.0/quickstart/#static-files. Once deployed,
    # App Engine itself will serve those files as configured in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
# [START gae_python37_render_template]
