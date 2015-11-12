import {sendSuccess, sendFailure, sendCancel} from '../runtime.js';
import {registerAction} from '../runtime.js';
import chatHistoryStore from '../view/components/chatHistoryStore';
import { ActionsStore, devices } from './actionsStore';

var format = require('string-format');

var util = require('util');
var actionTable = [
  {'name':'Log','start':Log},
  {'name':'Alert','start':Alert},
  {'name':'SetThermostatValue','start':SetThermostatValue},
  {'name':'TimeChanged','start':TimeChanged},
  {'name':'GetNextPlannedEvent','start':GetNextPlannedEvent},
  {'name':'RetrieveThermostat','start':retrieveThermostat},
  {'name':'RetrieveTemperature','start':retrieveTemperature},
  {'name':'RetrievePresence','start':retrievePresence},
  {'name':'Compute','start':Compute},
  {'name':'LearnPlanning','start':LearnPlanning},
  {'name':'DisableUI','start':DisableUI},
  {'name':'EnableUI','start':EnableUI}
];

function cancel(requestID, entityID, params) {
  sendCancel(requestID);
}

export function registerActions() {
  var actionCopyTable = actionTable.slice(0);
  function recursiveReg() {
    var actionName = actionCopyTable.shift();
    window[actionName.name]=actionName.start;
    var actionObject = {"name":actionName.name, "start":actionName.name, "cancel":"cancel"};
    return registerAction(JSON.stringify(actionObject))
    .then(()=>{
      if( actionCopyTable.length === 0 )
        return;
      return recursiveReg();
    });
  }
  console.log( "registering actions" );
  return recursiveReg();
}

function DisableUI(requestID, entityID, params ) {
  devices.setDisableUI();
  sendSuccess(requestID);
}

function EnableUI(requestID, entityID, params ) {
  devices.setEnableUI();
  sendSuccess(requestID);
}

function Compute(requestID, entityID, params ) {
  var expr = format( params.expression, params );
  //console.log("Compute : "+expr);
  var res = eval(expr);
  sendSuccess(requestID, JSON.stringify({result:res}));
}

function Log(requestID, entityID, params) {
  chatHistoryStore.addCraftMessage( format( params.message, params ) );
  sendSuccess(requestID);
}
function Alert(requestID, entityID, params) {
  chatHistoryStore.addAlertMessage( format( params.message, params ) );
  sendSuccess(requestID);
}

var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday','Saturday']

export function MapOfTime( globalTime) {
  
  var workDay = globalTime.getDay();
  var hours = globalTime.getHours();
  var minutes = globalTime.getMinutes();
  if( workDay == 0 || workDay == 6 )
    workDay = false;
  else
    workDay = true;

  var res = { weekDay : days[globalTime.getDay()],
    isWorkDay : workDay,
    timeOfDay : hours * 60 + minutes,
    hours : hours,
    minutes : minutes,
    day : globalTime.getDate(),
    month : globalTime.getMonth(),
    year : globalTime.getFullYear(),
    text : ('0' + (hours)).slice(-2)+':'+('0' + (minutes)).slice(-2),
    fullTime : globalTime.getTime(),
   }
  return res;  
}

function timeHasChanged(requestID, globalTime ){
  var res = { time : MapOfTime(globalTime) };

  sendSuccess(requestID, JSON.stringify(res))
  .then(()=>{
    devices.waitBT();
  })
}

function checkTime(requestID, entityID, params ) {
  if( ActionsStore.getAutomaticTime() === false ) {
    setTimeout( function(){ checkTime(requestID,entityID,params) }, 0);
    return;
  }
  var globalTime = ActionsStore.getTime();
  if( params.time.hours != globalTime.getHours() )
    timeHasChanged( requestID, globalTime );
  else if( params.time.minutes != globalTime.getMinutes() )
    timeHasChanged( requestID, globalTime );
  else if( params.time.day != globalTime.getDate() )
    timeHasChanged( requestID, globalTime );
  else if( params.time.month != globalTime.getMonth() )
    timeHasChanged( requestID, globalTime );
  else if( params.time.year != globalTime.getFullYear() )
    timeHasChanged( requestID);
  else 
    setTimeout( function(){ checkTime(requestID,entityID,params) }, 0);
}

function TimeChanged(requestID, entityID, params ) {
  checkTime (requestID, entityID, params );
}


function GetNextPlannedEvent(requestID, entityID, params){
  var workDay = params.workday;
  var weekEnd = params.weekend;
  var now = new Date( params.time.fullTime); // back 20 min
  var tomorrow = new Date( now.getTime() + 24*60*60*1000 ); // add 1 day
  var IsNowWorkDay = params.time.isWorkDay;
  var tomorrowDay = tomorrow.getDay();
  var IstomorrowWorkDay = ( workDay == 0 || workDay == 6 );

  var planToday = IsNowWorkDay ? workDay : weekEnd;
  var planTomorrow = IstomorrowWorkDay ? workDay: weekEnd;
  // is there an event in the 'today' planning ?
  var next = -1;
  for( var idx  = 0; idx < planToday.length; ++idx )
  {
    if( planToday[idx].time >= (params.time.timeOfDay-20) )
    {
      next = idx;
      break;
    }
  }
  // not in today planning
  if( next == -1 )
  {
    // so it is the first event of tomorrow
    var h = Math.floor(planTomorrow[0].time/60);
    var m = Math.floor(planTomorrow[0].time%60);
    var text = ('0' + (h)).slice(-2)+':'+('0' + (m)).slice(-2);
    var timeEvent = tomorrow;
    timeEvent.setHours(h);
    timeEvent.setMinutes(m);
    sendSuccess(requestID, JSON.stringify({event:{time:timeEvent.getTime(), value:planTomorrow[0].value, hour:h, minute:m, text:text}}));  
    //sendSuccess(requestID, JSON.stringify({event:{time:24*60+1,value:100, hour:24, minute:1, text:'24:01'}}));  
  }
  else
  {
    var h = Math.floor(planToday[next].time/60);
    var m = Math.floor(planToday[next].time%60);
    var text = ('0' + (h)).slice(-2)+':'+('0' + (m)).slice(-2)
    var timeEvent = now;
    timeEvent.setHours(h);
    timeEvent.setMinutes(m);
    sendSuccess(requestID, JSON.stringify({event:{time:timeEvent.getTime(), value:planToday[next].value, hour:h, minute:m, text:text}}));  
  }
}

function LearnPlanning(requestID, entityID, params){
  var plan = params.planning;
  var selected = -1;
  // find if we are 30 min away from an entry
  for( var idx  = 0; idx < plan.length; ++idx )
  {
    if( Math.abs( plan[idx].time-params.time ) <= 30 )
    {
      selected = idx;
      break;
    }
  }
  // not closed to one, add it
  if( selected == -1 )
  {
    plan.push( {time:params.time,value:params.value} );
  }
  else
  {
    // change the planning
    plan[selected] = { time:params.time, value:params.value };
  }

  plan.sort( function(a,b) { return a.time - b.time; } );
  // cleanup planning (remove the last of 2 consecutings same values )
  for( var idx  = 1; idx < plan.length; ++idx )
  {
    if( plan[idx].value ==  plan[idx-1].value )
    {
      plan.splice( idx, 1 );
      break;
    }

  }

  sendSuccess(requestID, JSON.stringify({planning:plan}));
}

function SetThermostatValue(requestID, entityID, params ) {
  // do something with params.value
  devices.setThermostat(params.value);
  sendSuccess(requestID); 
}

function retrieveThermostat(requestID, entityID, params){
  //console.log( "*************** " + ActionsStore.getThermostat() )
  sendSuccess( requestID, JSON.stringify({THERMOSTAT:ActionsStore.getThermostat()}))
}

function retrieveTemperature(requestID, entityID, params){

  sendSuccess( requestID, JSON.stringify({temperature:ActionsStore.getTemperature()}))
}

function retrievePresence(requestID, entityID, params){
  sendSuccess( requestID, JSON.stringify({presence:ActionsStore.getPresence()}))
}