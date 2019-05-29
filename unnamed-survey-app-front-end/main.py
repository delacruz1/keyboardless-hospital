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

AMAZON_ID_DICT = {"amzn1.ask.skill.18b02511-5201-494d-b655-fc3dace638cd":"Tim KH",   "amzn1.ask.account.AG2O6VNOKW2WUQMBE53CJ7VMXQVNMTI27X3N6SYK4MWTIRYFHEPFMRB52JUSTBZ6ETV6CZA5QJXJU6GZM3336J4L7LJUFLRPSKDGV4VKDYDIN6TG5UEY2YN54RFFWV7NJS7SHAQPKMZHFGOKAQKWDJXGW2LJTSQMVEZ42DKO7EGP3YUFBY7EYFP66AV33NWRU4SRG6SDUKDHQFY":"Armando KH",
                 "amzn1.ask.skill.86b80a1d-dc91-4984-ac5b-5c2761e8d894":"Jun KH",   "amzn1.ask.account.AGVPOHB6F3TJ2BCP3C3YDP2U6XJMZNRCJW6BMO4OCGPS4YXMENQTBE5AU5C7CYNY6SZBUACGQP3BYRM4BLYEUPPY354LYSO4F4UYMAHGXGV4DLYPYI6NLM6DI23FFIBEC2F2WPI6JF2JGBLINZXRHP33UZ6BKE7ILOND356KUFLXS75EDKZ5AEP4G3K2W72JCHEMB5VTT2GFMUI":"Micah KH",
                 "amzn1.ask.account.AG77H4GWXBQLGKIXFR7SVOOMPLRN3EOZDXXSPAFGKF67MID47ZEVBTDBZXDPG4AFQ6RBFU4JAARFKXMOOW5YY6F6MA6JLZNUTVDXYZUPIMIRKPLS6HEF2PEVWUROUCGQW36YQCNGXJIYPODKQK3QB3E2V3MFBEQBEUZIHDJDWCBCBMW3RZVVXSK6RSFA4W7PUBM4QZAIG5J3VPI":"Carlos KH","amzn1.ask.skill.138110ff-8dfb-44cb-a1fc-b7c092621a0d":"Josh KH"}

@app.route('/')
def root():
    dummy_time = ["hater oclock"]
    doc = table_get_all("Responses")
    return render_template('index.html', times=dummy_time, doc=doc)

@app.route('/my_surveys.html')
def mySurveysPage():
    dr = "D1"
    #my_dummy_surveys = ["hello",]
    print("#"*50)
    alexa_surveys = table_get_all("KHConversationStates")#, key=lambda x: {"DoctorID":dr} in x["DoctorAccess"]
    survey_structure = []
    survey_ids = []
    
    print("!"*50)
    for instance in alexa_surveys:
        print(instance)
        for k, v in instance['attributes'].items():
            survey_structure.append(v)
            survey_ids.append((instance['id'], k))
    survey_objs = [(survey_ids[i], survey_structure[i]) for i in range(len(survey_structure))]
                    
    print("&"*50)            
    print(survey_objs)
        #url = s["SurveyName"].replace(" ", "%20")
        #survey_objs.append((s,url))
    return render_template('my_surveys.html', mySurveys=survey_objs, ids=AMAZON_ID_DICT)

@app.route('/view_survey.html')
def viewSurveyPage():
    amazon_id, survey_key = eval(request.args.get('survey').replace("%20", " "))
    all_surveys = []
    instance = table_query("KHConversationStates", {'id':amazon_id})
    for k, v in instance['attributes'].items():
            all_surveys.append((k,v))
    my_survey = None
    for k,v in all_surveys:
        if k == survey_key:
            my_survey = v
            break
    return render_template('view_survey.html', my_survey=my_survey)

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
