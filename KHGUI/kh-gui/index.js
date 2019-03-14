let Pusher = require('pusher');

var pusher = new Pusher({
    appId: 'APP_ID',
    key: 'APP_KEY',
    secret: 'APP_SECRET',
    cluster: 'APP_CLUSTER'
  });
  
let channel = pusher.subscribe('my-channel');


pusher.trigger('my-channel', 'my-event', {"message": "hello world"});
