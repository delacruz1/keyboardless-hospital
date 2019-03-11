import { Component, OnInit, Input} from '@angular/core';
import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { Observable } from 'rxjs';
import { interval } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'KHTest';
  asyncData: any = {};
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
//   setTimeout(function(){
//     window.location.reload(true);
//  }, 3000);
  this.getUser();
}

getUser(){
  let params = {
    TableName: 'Demo',
    Key: {
      'Name': 'John'
    }
  }

  this.docClient.get(params, (err, data) => {
    this.asyncData = data.Item;
    this.paramsData = Object.keys(data.Item);
  });
}

}
