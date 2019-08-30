import { fabric } from 'fabric';
import Peer from 'peerjs';
import FabricSync from '../../src/index';

const canvas1 = new fabric.Canvas('fabric-1');
const canvas2 = new fabric.Canvas('fabric-2');

/**
 * Connection has been established
 */

function connected() {
	const sync1 = new FabricSync(canvas1, channel1, true);
	const sync2 = new FabricSync(canvas2, channel2);

	const rect = new fabric.Rect({
		left: 100,
		top: 100,
		fill: 'red',
		width: 20,
		height: 20
	});

	// "add" rectangle onto canvas
	canvas1.add(rect);
}

/**
 * Creating connection
 * 
 */

let conn1: RTCPeerConnection;
let conn2: RTCPeerConnection;
let channel1: RTCDataChannel;
let channel2: RTCDataChannel;

createConnection();

function createConnection() {
	const servers: RTCConfiguration = {};
	conn1 = new RTCPeerConnection(servers);
	console.log('Created local peer connection object conn1');

	channel1 = conn1.createDataChannel('sendDataChannel');
	console.log('Created send data channel');

	conn1.onicecandidate = (e) => {
		onIceCandidate(conn1, e);
	};
	channel1.onopen = onchannel1StateChange;
	channel1.onclose = onchannel1StateChange;
	channel1.onmessage = onchannel1ReceiveMessageCallback;

	conn2 = new RTCPeerConnection(servers);
	console.log('Created remote peer connection object conn2');

	conn2.onicecandidate = (e) => {
		onIceCandidate(conn2, e);
	};
	conn2.ondatachannel = channel2Callback;

	conn1.createOffer().then(gotDescription1, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error: object) {
	console.log('Failed to create session description: ' + error.toString());
}

function gotDescription1(desc: RTCSessionDescriptionInit) {
	conn1.setLocalDescription(desc);
	console.log(`Offer from conn1\n${desc.sdp}`);
	conn2.setRemoteDescription(desc);
	conn2.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(desc: RTCSessionDescriptionInit) {
	conn2.setLocalDescription(desc);
	console.log(`Answer from conn2\n${desc.sdp}`);
	conn1.setRemoteDescription(desc);
}

function getOtherPc(pc: RTCPeerConnection) {
	return pc === conn1 ? conn2 : conn1;
}

function getName(pc: RTCPeerConnection) {
	return pc === conn1 ? 'localPeerConnection' : 'remotePeerConnection';
}

function onIceCandidate(pc: RTCPeerConnection, event: any) {
	getOtherPc(pc)
		.addIceCandidate(event.candidate)
		.then(() => onAddIceCandidateSuccess(), (err) => onAddIceCandidateError(err));
	console.log(`${getName(pc)} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
	console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error: object) {
	console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

function channel2Callback(event: any) {
	console.log('Receive Channel Callback');
	channel2 = event.channel;
	channel2.onmessage = onReceiveMessageCallback;
	channel2.onopen = onchannel2StateChange;
	channel2.onclose = onchannel2StateChange;
}
function onchannel1ReceiveMessageCallback(event: any) {
	console.log('Receive Channel Callback');
	channel2 = event.channel;
	channel2.onmessage = onReceiveMessageCallback;
	channel2.onopen = onchannel2StateChange;
	channel2.onclose = onchannel2StateChange;
}

function onReceiveMessageCallback(event: object) {
	console.log('Received Message', event);
}

function onchannel1StateChange() {
	const readyState = channel1.readyState;
	console.log('Send channel state is: ' + readyState);
}

function onchannel2StateChange() {
	const readyState = channel2.readyState;
	console.log(`Receive channel state is: ${readyState}`);
	if (readyState === 'open') {
		connected();
	}
}
