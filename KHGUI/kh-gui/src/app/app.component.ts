import { Component, OnInit, Input } from '@angular/core';
import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { Observable } from 'rxjs';
import { interval } from 'rxjs';
import { v4 as uuid } from 'uuid'; 
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {name as inputName} from '../../../../amazonAlexa/index.js';
import * as pusher from 'pusher-js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'kh-gui';
  asyncData: any = {} ;
  paramsData: any; 
  private dynamodb; 
  private docClient;
  @Input() user: Observable<any>;

  constructor() {
    // provide your access key and secret access key as obtained in the previous step
    AWS.config.credentials = new AWS.Credentials('AKIAIHKKJVVWYHR36RXQ', 'MrSLDXDufp3b658mLa3UmsSmPkg9dCkIc/wb7bzB', null);
    AWS.config.update({
    region: 'us-east-1'
    });
    this.dynamodb = new AWS.DynamoDB();
    this.docClient = new AWS.DynamoDB.DocumentClient();

  }
  
  ngOnInit(){
    setTimeout(function(){
     window.location.reload(true);
    }, 5000);
     this.getUser();
   }
   ​
  getUser(){
    let user = []; 
    let params = {
      TableName: 'Demo',
      Key: {
        /* 
          Approach moving forward: the name value in getUser should be the name of 
          the person being entered...
          
          To get this, could we access the name being inputted through the Alexa index.js? 
          Could we have some sort of exported variable to inserted as the value for the name value below? 

        */
          'SessionID': "123"
  // tslint:disable-next-line: max-line-length
      }
    }
    this.docClient.get(params, (err, data) => {
      this.asyncData = data.Item;
      this.paramsData = Object.keys(data.Item);
    });
  }

}

