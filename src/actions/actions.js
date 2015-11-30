import chatHistoryStore from '../view/components/chatHistoryStore';
import { ActionsStore, devices } from './actionsStore';

var format = require('string-format');

var util = require('util');

var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday','Saturday']

export function MapOfTime(globalTime) {
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

export function registerActions(instance) {
  return instance.registerAction(
    'Log',
    (requestId, agentId, input, success, failure) => {
      chatHistoryStore.addCraftMessage( format( input.message, input ) );
      success();
    })
  .then(() => instance.registerAction(
    'Alert',
    (requestId, agentId, input, success, failure) => {
      chatHistoryStore.addAlertMessage( format( input.message, input ) );
      success();
    }))
  .then(() => instance.registerAction(
    'SetThermostatValue',
    (requestId, agentId, input, success, failure) => {
      devices.setThermostat(input.value);
      success();
    }))
  .then(() => instance.registerAction(
    'TimeChanged',
    (requestId, agentId, input, success, failure) => {
      let timeHasChanged = function(globalTime){
        success({
          time: MapOfTime(globalTime)
        })
        .then(()=>{
          devices.waitBT();
        })
      };
      let checkTime = function() {
        if( ActionsStore.getAutomaticTime() === false ) {
          setTimeout( function(){ checkTime() }, 0);
          return;
        }
        var globalTime = ActionsStore.getTime();
        if( input.time.hours != globalTime.getHours() )
          timeHasChanged( globalTime );
        else if( input.time.minutes != globalTime.getMinutes() )
          timeHasChanged( globalTime );
        else if( input.time.day != globalTime.getDate() )
          timeHasChanged( globalTime );
        else if( input.time.month != globalTime.getMonth() )
          timeHasChanged( globalTime );
        else if( input.time.year != globalTime.getFullYear() )
          timeHasChanged( );
        else
          setTimeout( function(){ checkTime() }, 0);
      }
      checkTime();
    }))
  .then(() => instance.registerAction(
    'GetNextPlannedEvent',
    (requestId, agentId, input, success, failure) => {
      var workDay = input.workday;
      var weekEnd = input.weekend;
      var now = new Date( input.time.fullTime); // back 20 min
      var tomorrow = new Date( now.getTime() + 24*60*60*1000 ); // add 1 day
      var IsNowWorkDay = input.time.isWorkDay;
      var tomorrowDay = tomorrow.getDay();
      var IstomorrowWorkDay = ( workDay == 0 || workDay == 6 );

      var planToday = IsNowWorkDay ? workDay : weekEnd;
      var planTomorrow = IstomorrowWorkDay ? workDay: weekEnd;
      // is there an event in the 'today' planning ?
      var next = -1;
      for( var idx  = 0; idx < planToday.length; ++idx )
      {
        if( planToday[idx].time >= (input.time.timeOfDay-20) )
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
        success({event:{time:timeEvent.getTime(), value:planTomorrow[0].value, hour:h, minute:m, text:text}});
      }
      else
      {
        var h = Math.floor(planToday[next].time/60);
        var m = Math.floor(planToday[next].time%60);
        var text = ('0' + (h)).slice(-2)+':'+('0' + (m)).slice(-2)
        var timeEvent = now;
        timeEvent.setHours(h);
        timeEvent.setMinutes(m);
        success({event:{time:timeEvent.getTime(), value:planToday[next].value, hour:h, minute:m, text:text}});
      }
    }))
  .then(() => instance.registerAction(
    'RetrieveThermostat',
    (requestId, agentId, input, success, failure) => {
      success({THERMOSTAT:ActionsStore.getThermostat()});
    }))
  .then(() => instance.registerAction(
    'RetrieveTemperature',
    (requestId, agentId, input, success, failure) => {
      success({temperature:ActionsStore.getTemperature()});
    }))
  .then(() => instance.registerAction(
    'RetrievePresence',
    (requestId, agentId, input, success, failure) => {
      success({presence:ActionsStore.getPresence()});
    }))
  .then(() => instance.registerAction(
    'Compute',
    (requestId, agentId, input, success, failure) => {
      var expr = format( input.expression, input );
      var res = eval(expr);
      success({result:res});
    }))
  .then(() => instance.registerAction(
    'LearnPlanning',
    (requestId, agentId, input, success, failure) => {
      var plan = input.planning;
      var selected = -1;
      // find if we are 30 min away from an entry
      for( var idx  = 0; idx < plan.length; ++idx )
      {
        if( Math.abs( plan[idx].time-input.time ) <= 30 )
        {
          selected = idx;
          break;
        }
      }
      // not closed to one, add it
      if( selected == -1 )
      {
        plan.push( {time:input.time,value:input.value} );
      }
      else
      {
        // change the planning
        plan[selected] = { time:input.time, value:input.value };
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

      success({planning: plan});
    }))
  .then(() => instance.registerAction(
    'DisableUI',
    (requestId, agentId, input, success, failure) => {
      devices.setDisableUI();
      success();
    }))
  .then(() => instance.registerAction(
    'EnableUI',
    (requestId, agentId, input, success, failure) => {
      devices.setEnableUI();
      success();
    }));
}
