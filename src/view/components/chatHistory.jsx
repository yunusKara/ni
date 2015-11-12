import React from 'react';
import _ from 'underscore';
var Reflux = require('reflux');
import chatHistoryStore from './chatHistoryStore.js';
import * as Runtime from '../../runtime.js';

var ChatMessage = React.createClass({
  render: function() {
    return (
      <div className={this.props.messageColor}>
        <small className="left clearfix">
          <span>{this.props.messageTimestamp}&nbsp;|
          &nbsp;{this.props.messageContent}</span>
        </small>
      </div>
    );
  }
});

exports = module.exports = React.createClass({
  mixins: [Reflux.connect(chatHistoryStore, 'messages')],
  render: function() {
    return (
      <div className="panel panel-primary" style={{height: '50px', overflowY: 'auto', overflowX: 'hidden'}}>
        <span class="chat">
          {
            this.state.messages.length == 0 ? (
              <h3><em>{this.props.placeholder}</em></h3>
            ) : _.map(this.state.messages, msg => (
              <ChatMessage
                messageContent={msg.messageContent}
                messageTimestamp={msg.messageTimestamp}
                messageColor={msg.messageColor}/>
              )
            )
          }
        </span>
      </div>
    );
  }
});
