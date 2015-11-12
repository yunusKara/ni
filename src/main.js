import React from 'react';
import App from './view/containers/app';
import {destroySimulation, destroySimulationSyncro} from './runtime';

React.render(
  <App />,
  document.getElementById('root')
);

window.onbeforeunload = function onBeforeUnload() {
	console.log("cleanup");
	destroySimulationSyncro();
	//return "Cleaning";
}