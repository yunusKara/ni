import '../static/circle.css';
import { ActionsStore, devices } from '../../actions/actionsStore';
import { ButtonGroup, Button, Modal, Input, Grid, Row, Col } from 'react-bootstrap';
import { registerActions, MapOfTime } from '../../actions/actions';
import { SH_USER, SH_PROJECT, SH_VERSION, SH_APP_ID, SH_APP_SECRET } from '../../constant';
import ChatHistory from '../components/chatHistory';
import Clock from '../components/clock';
import craftai from 'craft-ai-client-js';
import Meter from '../components/meter';
import Planning from '../components/planning';
import React from 'react';
import Reflux from 'reflux';

export default React.createClass({
  mixins: [Reflux.connect(ActionsStore, 'actionsStore')],
  getInitialState: function() {
    return {  simID:'', showModal:true, ready:false, appSecret:'', appID:'', ghUser:'', ghProject:'', ghBranch:'' }
  },
  handlePresence: function() {
    devices.setPresence( event.target.checked );
  },
  updateTemperature: function(event) {
    var val = parseInt(event.target.value);
    devices.setTemperature(val);
  },
  addTime: function( amount,check ) {

    if(check && !this.state.actionsStore.waitBT ) {
      devices.addTime(amount,check);
    }
    if( !check ) {
      devices.addTime(amount,check);
    }
  },
  setDateTime: function( datetime ) {
    devices.setDateTime(datetime);
  },
  setThermostat: function( th ){
    devices.setThermostat(th);
  },
  startTime: function() {
    devices.startTime();
    //this.handleTime();
  },
  stopTime: function() {
    devices.stopTime();
  },
  handleTime: function() {
    if( this.state.actionsStore.automaticTime === false )
      return;
    if( this.state.actionsStore.disabledUI === false )
    {
      this.addTime(5*60*1000, true);
    }
    //var t = setTimeout(()=>{this.handleTime()},1000);
  },
  handleTimeInit: function(amount) {
    if( amount > 0 ) {
      this.addTime(30*1000,false);
      setTimeout(()=>{this.handleTimeInit(amount-1)},500);
    }
  },
  getTime: function() {
    return this.state.actionsStore.time;
  },
  getPlanning: function() {
    return this.instance.getAgentKnowledge(0)
    .then(knowledge => {
      return knowledge.planning;
    })
    .catch(()=>{
      console.log('unable to retrieve planning');
    });
  },
  getWorkdays: function() {
    this.instance.getAgentKnowledge(0)
    .then(knowledge =>{
      return [1,2,4,5];
    });
  },
  isUIDisabled: function() {
    return this.state.actionsStore.automaticTime || this.state.actionsStore.disabledUI;
  },
  start:function() {

    this.setState({ showModal: false });

    var user = this.state.ghUser;
    var project = this.state.ghProject;
    var branch = this.state.ghBranch;
    var appID = this.state.appID;
    var appSecret = this.state.appSecret;
    if( this.state.ghUser === ''
      &&this.state.ghProject === ''
      &&this.state.ghBranch === ''
      &&this.state.appID === ''
      &&this.state.appSecret=== ''){
      user = SH_USER;
      project = SH_PROJECT;
      branch = SH_VERSION;
      appID = SH_APP_ID;
      appSecret = SH_APP_SECRET;
    }
    else {
      history.pushState(undefined, undefined, window.location.origin + window.location.pathname
      + '?owner=' + this.state.ghUser
      + '&project=' + this.state.ghProject
      + '&branch=' + this.state.ghBranch
      + '&appid=' + this.state.appID
      + '&appsecret=' + this.state.appSecret);
    }

    craftai({
      owner: user,
      name: project,
      version: branch,
      appId: appID,
      appSecret: appSecret
    })
    .then((instance) => {
      this.instance = instance;
      this.setState({
        simID: instance.id
      });

      return registerActions(instance);
    })
    .then(() => {
      var planWD = [{time:6*60,value:20},

                  ]
      var planWE = [{time:6*60,value:20},
                  {time:8*60,value:18},
                  {time:12*60,value:20},
                  {time:14*60,value:18},
                  {time:17*60,value:22},
                  {time:20*60,value:20},
                  {time:23*60,value:18}]
      return this.instance.createAgent( 'agent/Robot.bt', {
        time: MapOfTime(ActionsStore.getTime()),
        planning: {
          workday: planWD,
          weekend: planWE
        }
      });
    })
    .then(()=> {
      this.setState( {ready: true} );
      this.handleTimeInit(2);
      this.instance.update(0);
      console.log(this.instance.id);

    })
    .catch((err)=>{
      console.log(err);
      this.setState({ showModal: true });
    });
  },

  render: function() {
    if( this.state.actionsStore.automaticTime )
      this.handleTime();
    if( this.state.showModal )
      return (
          <Grid>
            <Row>
              <h2><img src="./favicons/craft-ai.gif"/> CRAFT NI Simulator</h2>
            </Row>
            <center><p className="small">If you want to use the default BTs, just leave all fields blank</p></center>
            <center><Button bsStyle="info" bsSize="large" onClick={this.start}>Start simulation</Button></center>
            <br/>
            <Row>

            <Col xs={12} style={{backgroundColor:'#F0F8FF'}} >
            <br/>
            <p>In order to run this demo with your own BTs, you need to fork <a href='https://github.com/craft-ai/demo.SmartHome' target='_blank'>this</a> repository with your GitHub account</p>
            <p>If you do not have a GitHub account, sign up for one <a href='https://github.com'  target='_blank'>here</a></p>
            <p>Then using <a href='https://workbench.craft.ai' target='_blank'>craft ai workbench</a>, you need to retrieve your appID/appSecret for this fork by editing the craft_project.json</p>
            <center><img src='./workbench.png' width='600px'/></center>
            <br/>
            </Col>
            </Row>
            <Row>
            <br/>
            <br/>
            <br/>
              <Input ref="inputUser" type='text' label='GitHub user' onChange={()=>{this.setState({ghUser:this.refs.inputUser.getValue()})}} value={this.state.ghUser} placeholder="Github user account that have forked the repository"/>
              <Input ref="inputRepo" type='text' label='GitHub repository' onChange={()=>{this.setState({ghProject:this.refs.inputRepo.getValue()})}} value={this.state.ghProject} placeholder="Name of the github fork repository"/>
              <Input ref="inputBranch" type='text' label='GitHub branch' onChange={()=>{this.setState({ghBranch:this.refs.inputBranch.getValue()})}} value={this.state.ghBranch} placeholder="Which branch (master)"/>
              <Input ref='inputID' type='text' label='craft ai AppID' onChange={()=>{this.setState({appID:this.refs.inputID.getValue()})}} value={this.state.appID} placeholder="Your craft ai app ID, can be found in craft_project.json from workbench.craft.ai"/>
              <Input ref='inputSecret' type='text' label='craft ai AppSecret' onChange={()=>{this.setState({appSecret:this.refs.inputSecret.getValue()})}} value={this.state.appSecret} placeholder="Your craft ai app Secret, can be found in craft_project.json from workbench.craft.ai"/>
              <center><Button bsStyle="info" onClick={this.start}>Start simulation</Button></center>
            </Row>
          </Grid>
        );
    else if( this.state.ready == false )
      return (
        <Grid>
          <Row>
            <h2><img src="./favicons/craft-ai.gif"/> CRAFT NI Simulator</h2>
          </Row>
          <Row>
            <h2><span className="glyphicon glyphicon-arrow-right" aria-hidden="true"></span> Starting runtime</h2>
          </Row>
          <Row>
            <h3><img src="./favicons/load.gif"/>     Please wait....</h3>
          </Row>
          <Row>
          {this.state.simID === '' ?
          void 0:
          <h3>           {this.state.simID} created</h3>
          }
          </Row>

        </Grid>
      );
    else

    return (
      <Grid>
        <Row>
          <h2><img src="./favicons/favicon-32x32.png"/> CRAFT NI Simulator</h2>
        </Row>
        <Row>
          <Col xs={6} style={{ height: 350, width: 310 }}>
            <Meter disabled={this.isUIDisabled()} temperature={this.state.actionsStore.temperature} setting={this.state.actionsStore.thermostat} onThermostatChange={(th)=>{this.setThermostat(th);}}/>
          </Col>
          <Col xs={6}>
            <form>
              <ButtonGroup style={{ marginBottom: 10 }}>
                <Button disabled={this.isUIDisabled()||this.state.actionsStore.heater} onClick={()=> devices.setHeater( true )}>Enable heater</Button>
                <Button disabled={this.isUIDisabled()||!this.state.actionsStore.heater} onClick={()=> devices.setHeater( false )}>Disable heater</Button>
              </ButtonGroup>
              <div style={{ width: 180, marginBottom: 10 }}>
                <Input disabled={this.isUIDisabled()} type='number' addonAfter="° (room temp.)" min={10} max={30} value={this.state.actionsStore.temperature} onChange={(evt) => this.updateTemperature(evt)}/>
              </div>
              <ButtonGroup>
                <Button disabled={this.state.actionsStore.automaticTime} onClick={()=>this.startTime()} bsStyle="success">Start time</Button>
                <Button disabled={!this.state.actionsStore.automaticTime} onClick={()=>this.stopTime()} bsStyle="danger">Stop time</Button>
              </ButtonGroup>
              <p><small>You will not be able to change any value while the time is running</small></p>
            </form>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Clock disabled={this.isUIDisabled()} time={this.state.actionsStore.time} onTimeChange={(time) =>{this.setDateTime(time);}} />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <ChatHistory id="hist" placeholder='No message...'/>
          </Col>
        </Row>

        <Planning  onAddTime={(amount)=>this.state.actionsStore.automaticTime?null:this.addTime(amount*60*1000,false)} onGetTime={() => this.getTime()} day={this.state.actionsStore.time.getDay()} temperature={this.state.actionsStore.temperature} onGetPlanning={() => this.getPlanning()} />
      </Grid>
    );
  },
  componentWillMount: function() {
    console.log("mount");

    var url = window.location.search.substring(1);
    if (url.substr(-1) === '/') {
      url = url.substr(0, url.length - 1);
    }
    var vars = url.split('&');
    //console.log(vars)
    var owner='';
    var repo='';
    var branch='';
    var id='';
    var secret=''
    for( var i = 0; i < vars.length; ++i ){
      var pair = vars[i].split('=');
      if (pair[0] === 'owner' )
        owner=pair[1];
      if (pair[0] === 'project' )
        repo=pair[1];
      if (pair[0] === 'branch' )
        branch=pair[1];
      if (pair[0] === 'appid' )
        id=pair[1];
      if (pair[0] === 'appsecret' )
        secret=pair[1];
    }
    this.setState({ ready: false, ghUser:owner, ghProject:repo, ghBranch:branch, appSecret:secret, appID:id });

  },
  componentWillUnmount: function() {
    console.log("unmount");
    this.instance.destroy();
    this.instance = undefined;
  }
});
