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

from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def root():
    dummy_time = ["hater oclock"]
    return render_template('index.html', times=dummy_time)

@app.route('/mySurveys.html')
def mySurveyPage():
    my_dummy_surveys = [
    {
        "surveyName" : "Dr. Ziv Pre-Appointment Questionnaire",
        "surveyCo" : "UCI Optometrist",
        "surveyIntro" : "This is a preliminary questionnaire that will give Dr. Ziv and co. an idea on the state of your current health. We will use this survey to evaluate any concerns and to limit your waiting time to best fit your experience at our office."
    },
    {
        "surveyName" : "Dr. Peter Anteater Post Survey Request",
        "surveyCo" : "Supreme Leader of UCI",
        "surveyIntro" : "Fill this out NOW."
    }]
    #my_dummy_surveys = ["hello",]
    return render_template('mySurveys.html', mySurveys=my_dummy_surveys)

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
