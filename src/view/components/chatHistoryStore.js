var _ = require('underscore');
var Reflux = require('reflux');
import Moment from 'moment';
import { ActionsStore } from '../../actions/actionsStore'

var colors = ["chatOdd", "chatEven", "chatAlert"];

exports = module.exports = Reflux.createStore({
  addMessage: function(messageSender, messageContent) {
    var time = Moment(ActionsStore.getTime()).format('YYYY-MM-DD HH:mm:ss');
    this.messages.splice(0, 0, {
       messageContent: messageContent,
       messageTimestamp: time,
       messageColor:colors[messageSender==='ALERT'?2:(this.messages.length%2)]
     });
    this.trigger(this.messages);
  },
  addCraftMessage: function(craftMessage) {
    this.addMessage('CRAFT', craftMessage);
  },
  addAlertMessage: function(craftMessage) {
    this.addMessage('ALERT', craftMessage);
  },
  getMessages: function() {
    return this.messages;
  },
  getInitialState: function() {
    this.messages = [];
    this.lastUserMessage = '';
    return this.messages;
  }
});
