import '../static/circle.css';
import helmetImg from '../static/helmet_xs.png';
import React from 'react';
import _ from 'underscore';

var gradations = [
  'rotate(13deg)',
  'rotate(35deg)',
  'rotate(57deg)',
  'rotate(79deg)',
  'rotate(101deg)',
  'rotate(123deg)',
  'rotate(145deg)',
  'rotate(167deg)'
];

export default class Meter extends React.Component {
  onUpdate(th) {
    this.props.onThermostatChange(th);
  }
  render() {
    return (
      <div style={{textAlign:'center'}}>
        <div className="circle">
          <UpdateMeter disabled={this.props.disabled} temperature={this.props.temperature} setting={this.props.setting} onThermostatChange={(th)=>{this.onUpdate(th);}}/>
        </div>
      </div>
    );
  }
};

var UpdateMeter = React.createClass({
  updateMeter: function(event) {
    var val = this.props.setting;
    if (!_.isUndefined(event)) {
      val = parseInt(event.target.value);
    }
    this.props.onThermostatChange(val);
  },
  getInitialState: function() {
    return {setting: this.props.setting, actual: this.props.temperature};
  },
  componentDidMount: function() {
    this.updateMeter();
  },
  componentWillReceiveProps: function(nextProps) {
    var color = '#231F20';
    var value = nextProps.temperature;
    if (nextProps.setting != this.props.setting || nextProps.temperature !== this.props.temperature) {
      if (value === this.state.setting) {
        color = '#231F20';
      }
      else if (value < this.state.setting) {
        color = '#FF5000';
      }
      else {
        color = '#0050FF';
      }
      this.setState({color: {backgroundColor: color}});
    }
  },
  shouldComponentUpdate: function(nextProps) {
    return nextProps.temperature !== this.props.temperature || nextProps.setting !== this.props.setting || nextProps.disabled !== this.props.disabled;
  },
  render:function() {
    var color = '#231F20';
    var val = this.props.setting;
    if (val == this.props.temperature) {
      color = '#231F20';
    }
    else if (val > this.props.temperature) {
      color = '#FF5000';
    }
    else {
      color = '#0050FF';
    }
    var SYMBOL_POSITION = {
      transform: 'translate(34px, -130px)'
    };
    if (val > 9) {
      SYMBOL_POSITION = {
        transform: 'translate(48px, -117px)'
      };
    }
    var SETTING_ROTATION = {
      transform: 'rotate(' + (val-10)*9 + 'deg)'
    };
    return(
      <div className="circle-frame">
        <div className="title">craft ni</div>
        <div className="circle-fill" style={{backgroundColor: color}}>
          <Grad data={gradations}/>
          <div className="current" style={SETTING_ROTATION}></div>
          <Actual data={this.props.temperature} setting={this.props.setting} />
          <div className="degree">
            <Value setting={this.props.setting} /><div style={SYMBOL_POSITION} className="symbol">°</div>
          </div>
          <input className={this.props.disabled?'meter myDisable':'meter'} id="input"  type="range" value={this.props.setting} min="10" max="30" onChange={this.updateMeter}/>
          <div className="circle-mask"></div>
          <div className="lower-mask">
            <img src={ helmetImg } style={{marginTop:'60px'}}/>
          </div>
        </div>
      </div>
    );
  }
});

var Value = React.createClass({
  render:function() {
    var val = this.props.setting;
    return(
      <span className="value">
        {val}
      </span>
    )
  }
});

var Actual = React.createClass({
  render:function() {
    var val = this.props.data;
    val-=10;
    var rotation = 'rotate(' + val*9 + 'deg)';
    var divRotation = 'rotate(' + (val*9-8) + 'deg)';
    var txtRotation = 'rotate(' + (val*-9+8) + 'deg)';
    return(
      <div>
        <div className="actual-head" style={{transform: rotation}}>
          <div className="actual-display"></div>
        </div>
        <div className="actual-degree" style={{transform: divRotation}}>
          <div className="actual-value" style={{transform: txtRotation}}>
            {val+10}
          </div>
        </div>
      </div>
    )
  }
});

var Grad = React.createClass({
  render:function() {
    var gradation = this.props.data.map(function (grad) {
      var grad = grad;
      return (
        <div className="grad" style={{transform: grad}}></div>
      );
    });
    return(
      <div className="gradList">
        {gradation}
      </div>
    )
  }
});
