var Pusher = require('pusher');

var pusher = new Pusher({
  appId: '730027',
  key: '0d9a535805e414a1933f',
  secret: '5d8978c00aaa349693ac',
  cluster: 'us3',
  encrypted: true
});

pusher.trigger('my-channel', 'my-event', {
    "message": "hello world"
  });