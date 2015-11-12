var Reflux = require('reflux');

export const devices = {
  addTime: Reflux.createAction(),
  setDateTime: Reflux.createAction(),
  setTemperature: Reflux.createAction(),
  setThermostat: Reflux.createAction(),
  setPresence: Reflux.createAction(),
  setHeater: Reflux.createAction(),
  setDisableUI : Reflux.createAction(),
  setEnableUI : Reflux.createAction(),
  stopTime : Reflux.createAction(),
  startTime : Reflux.createAction(),
  waitBT : Reflux.createAction(),
}

function initialTime() {
  var t = new Date();
  t.setDate( 2 );
  t.setMonth( 10 );
  t.setHours( 6 );
  t.setMinutes( 0 );
  t.setSeconds(0);
  return t;

}

export var ActionsStore = Reflux.createStore({
  listenables: devices,
  settings: {
    waitBT : false,
    automaticTime : false,
    time: initialTime(),
    temperature: 20,
    thermostat: 20,
    presence: false,
    degreePerMilli : 0,
    realTemp : 20.0,
    heater : true,
    disabledUI : true,
  },
  onWaitBT : function() {
    this.settings.waitBT = false;
    this.trigger(this.settings);  
  },
  onStopTime : function() {
    this.settings.automaticTime = false;
    this.trigger(this.settings);    
  },
  onStartTime : function() {
    this.settings.automaticTime = true;
    this.trigger(this.settings);    
  },
  onSetDisableUI : function() {
    this.settings.disabledUI = true;
    this.trigger(this.settings);    
  },
  onSetEnableUI : function() {
    this.settings.disabledUI = false;
    this.trigger(this.settings);    
  },
  localAddTime: function( amount ) {
    var today= this.settings.time;
    today.setTime( today.getTime()+amount );
    this.settings.time = today;
    if( this.settings.heater == false )
    {
      this.settings.degreePerMilli = -1.0/(10.0*60.0*1000.0); // 1 degree for 10 minutes
    }
    this.settings.realTemp += this.settings.degreePerMilli*amount;

    if( this.settings.heater == true )
    {
      if( this.settings.degreePerMilli === 0 )
      {
        if( this.settings.temperature < this.settings.thermostat )
          this.settings.degreePerMilli = 1.0/(20.0*60.0*1000.0); // 1 degree for 20 minutes;
        if( this.settings.temperature > this.settings.thermostat )
          this.settings.degreePerMilli = -1.0/(15.0*60.0*1000.0); // 1 degree for 15 minutes;;
      }
      if( this.settings.realTemp > this.settings.thermostat && this.settings.degreePerMilli > 0)
      {
        this.settings.degreePerMilli = 0;
      }
      if( this.settings.realTemp < this.settings.thermostat && this.settings.degreePerMilli < 0 )
      {

        this.settings.degreePerMilli = 0;
      }
    }
    else {
      if( this.settings.realTemp < 0  )
        this.settings.realTemp =  0;
      if( this.settings.realTemp > 30 )
        this.settings.realTemp =  30;
    }
    this.settings.temperature = Math.floor( this.settings.realTemp + 0.5);
  },

  onAddTime: function( amount, check ) {
    let count = Math.floor( amount/500 );
    for( var i = 0; i< count; ++i )
      this.localAddTime(500);
    let mod = amount%500;
    this.localAddTime(mod);
    this.settings.waitBT = check;
    this.trigger(this.settings);

  },
  onSetDateTime: function( datetime ) {
    var delta = datetime-this.settings.time;
    if( delta > 0 )
      this.onAddTime(delta);
    //this.settings.time = datetime;
    //this.trigger(this.settings);
  },
  getAutomaticTime : function() {
    return this.settings.automaticTime;
  },
  getTime: function() {
    return this.settings.time;
  },
  getTemperature: function() {
    return this.settings.temperature;
  },
  onSetTemperature: function(t) {
    if( t < 10 )
      t = 10;
    if( t > 30 )
      t = 30;
    this.settings.temperature = t;
    this.settings.realTemp = t;
    this.trigger(this.settings);
  },
  getThermostat: function() {
    return this.settings.thermostat;
  },
  onSetThermostat: function(t) {
    this.settings.thermostat = t;
    if( this.settings.heater == true )
    {
      this.settings.degreePerMilli = 0;
      if( this.settings.temperature < this.settings.thermostat )
        this.settings.degreePerMilli = 1.0/(20.0*60.0*1000.0); // 1 degree for 20 minutes;
      if( this.settings.temperature > this.settings.thermostat )
        this.settings.degreePerMilli = -1.0/(15.0*60.0*1000.0); // 1 degree for 15 minutes;;
    }
    this.trigger(this.settings);
  },
  getPresence: function() {
    return this.settings.presence;
  },
  onSetPresence: function(p) {
    this.settings.presence = p;
    this.trigger(this.settings);
  },
  getHeater: function() {
    return this.settings.heater;
  },
  onSetHeater : function(onOff) {
    this.settings.heater = onOff;
    if( onOff == true )
    {
      this.settings.degreePerMilli = 0;
      if( this.settings.temperature < this.settings.thermostat )
        this.settings.degreePerMilli = 1.0/(20.0*60.0*1000.0); // 1 degree for 20 minutes;
      if( this.settings.temperature > this.settings.thermostat )
        this.settings.degreePerMilli = -1.0/(15.0*60.0*1000.0); // 1 degree for 15 minutes;;
    }

    this.trigger(this.settings);
  },

  getInitialState: function() {
    return this.settings;
  }

});
