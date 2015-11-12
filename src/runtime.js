import * as constants from './constant.js'

var Qajax = require('qajax');
var _ = require('underscore');
var Q = require('q');

String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { return typeof args[number] != 'undefined' ? args[number] : match; });
};


export var ws;
export var simID;
var idUpdate = false;
var entityID;
var httpURL;
var wsURL;

var appID;
var appSecret;



function craftRequest(r) {
  r = _.defaults(r || {}, {
    token: undefined,
    method: 'GET',
    path: '',
    query: {},
    headers: {},
    data: {}
  });

  var url = httpURL + r.path;
  if ((!_.isUndefined(appID)) && (!_.isUndefined(appSecret))) {
    r.headers['X-Craft-Ai-App-Id'] = appID;
    r.headers['X-Craft-Ai-App-Secret'] = appSecret;
  }
  r.headers['Content-Type'] = 'application/json; charset=utf-8';
  r.headers['accept'] = '';

  return Qajax({
    url: url,
    method: r.method,
    headers:r.headers,
    data:r.data,
    params: r.query
  })
  .then(Qajax.filterStatus(function (code) {
    return code == 200; /* only support 200 */
  }))
  .then(Qajax.toJSON,function (err) {
      console.log("xhr failure: ", err);
  });
}

export function createSimulation(user, project, version, id, secret ) {
  appID = id;
  appSecret = secret;
  httpURL = 'https://' + constants.RUNTIME_URL + '/v1/' + user + '/' + project + '/' + version;
  wsURL = 'wss://' + constants.RUNTIME_URL + '/v1/' + user + '/' + project + '/' + version;
  return craftRequest({
    method: 'PUT'
  })
  .then((resp)=>{
    simID = resp.instance.instance_id;
    //console.log('sim ID :'+simID);
    }
  );
}

export function destroySimulation() {
  return craftRequest({
    method: 'DELETE',
    path: '/'+simID
  }).then((resp) => {
    idUpdate = false;
    ws.close();
  });
}

export function destroySimulationSyncro(){
  var oReq = new XMLHttpRequest();
  oReq.open('DELETE', httpURL + '/' + simID, false);
  oReq.setRequestHeader('content-type', 'application/json; charset=utf-8');
  oReq.setRequestHeader('accept', '');
  oReq.setRequestHeader('X-Craft-Ai-App-Id', appID);
  oReq.setRequestHeader('X-Craft-Ai-App-Secret', appSecret);
  oReq.send();
  idUpdate = false;
  return oReq.status;
}

export function registerAction(jsonString) {
  return craftRequest({
    method: 'PUT',
    path: '/'+simID+'/actions',
    data: jsonString
  });
}

export function createEntity(behavior, knowledge) {
  var params = {};
  params.behavior = behavior;
  params.knowledge = knowledge;
  return craftRequest({
    method: 'PUT',
    path: '/'+simID+'/entities',
    data: JSON.stringify(params)
  });
}

export function getEntityKnowledge(entityID) {
  return craftRequest({
    method: 'GET',
    path: '/'+simID+'/entities/'+entityID+'/knowledge'
  });
}

export function updateEntityKnowledge(entityID, destination, value) {
  var j = {};
  j[destination] = value;
  return craftRequest({
    method: 'POST',
    path: '/'+simID+'/entities/'+entityID+'/knowledge',
    query: {method: 'merge'},
    data: JSON.stringify(j)
  });
}

export function update()
{
  return craftRequest({
    method: 'POST',
    path: '/'+simID+'/update',
    data: '{"time":0.5,"ts":' + new Date().getTime() + '}'
  });
}

export function sendSuccess(requestID, jsonString) {
  return craftRequest({
    method: 'POST',
    path: '/'+simID+'/actions/'+requestID+'/success',
    data: jsonString
  });
}

export function sendFailure(requestID, jsonString) {
  return craftRequest({
    method: 'POST',
    path: '/'+simID+'/actions/'+requestID+'/failure',
    data: jsonString
  });
}

export function sendCancel(requestID) {
  return craftRequest({
    method: 'POST',
    path: '/'+simID+'/actions/'+requestID+'/cancelation'
  });
}

function internalUpdate(){
  if( idUpdate == true ) {
    update()
    .then(()=>{
      setTimeout( internalUpdate, 0 );
    });
  }
}
export function doUpdate() {
  idUpdate = true;
  internalUpdate();
}

export function doWS() {
  var wsUrlRoute = wsURL + '/' + simID + '/websockets';
  console.log('WS Connexion on', wsUrlRoute + ':');
  if (wsUrlRoute) {
    console.log('requesting WS connexion...');
    ws = new WebSocket(wsUrlRoute);
    ws.onmessage = function(evt) {
      if (evt.data != 'ping') {
        var jsonEvt = JSON.parse(evt.data);
        //console.log('WS data:', evt.data);
        window[jsonEvt.call](jsonEvt.requestId , jsonEvt.agentId, jsonEvt.input);
      }
      else {
        //console.log('ping');
      }
      ws.send('Done');
    };
    ws.onopen = function() {
      ws.send('socket open');
      console.log('WS Connexion open', ws);
    };
    ws.onclose = function() {
      console.log('WS Connexion closed', ws);
      idUpdate = false;
    };
    ws.onerror = function() {
      console.log('WS Connexion error', ws);
      idUpdate = false;
    };
  }
}
