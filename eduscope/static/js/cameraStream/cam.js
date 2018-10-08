

function getopts(args, opts)
{
    var result = opts.default || {};
    args.replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function($0, $1, $2, $3) { result[$1] = $3; });

    return result;
};
var camVideo;
var url;
var args = getopts(location.search,
    {
        default:
            {
                ws_uri: 'ws://' + location.hostname + ':8888/kurento',
                ice_servers: undefined
            }
    });

if (args.ice_servers) {
    console.log("Use ICE servers: " + args.ice_servers);
    kurentoUtils.WebRtcPeer.prototype.server.iceServers = JSON.parse(args.ice_servers);
} else {
    console.log("Use freeice");
}

var pipeline;
var webCam;

function start() {
    showSpinner(camVideo);
    var options = {
        remoteVideo : camVideo
    };

    webCam = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        function(error){
            if(error){
                return console.error(error);
            }
            console.log("one");
            webCam.generateOffer(onOffer);
            console.log("two");
            webCam.peerConnection.addEventListener('iceconnectionstatechange', function(event){
                if(webCam && webCam.peerConnection){
                    console.log("oniceconnectionstatechange -> " + webCam.peerConnection.iceConnectionState);
                    console.log('icegatheringstate -> ' + webCam.peerConnection.iceGatheringState);
                }
            });
        });
}
function camLoad(data){

    var videoElement = document.createElement('video');
    videoElement.id = 'vid';
    videoElement.autoplay =true;
    videoElement.width='240px';
    videoElement.height='180px';
    videoElement.src="";



    var v = videoElement;
    var c = document.getElementById("myCanvas");
    var ctx = c.getContext("2d");
    var i;

    v.addEventListener("play", function() {i = window.setInterval(function() {
        ctx.drawImage(v,5,5,240,180)},20);
    }, false);
    v.addEventListener("pause", function() {window.clearInterval(i);}, false);
    v.addEventListener("ended", function() {clearInterval(i);}, false);

     camVideo = videoElement;
     url = data.url;
    start();
};

function onOffer(error, sdpOffer){

    if(error) return onError(error);

    kurentoClient(args.ws_uri, function(error, kurentoClient) {
        if(error) return onError(error);

        kurentoClient.create("MediaPipeline", function(error, p) {
            if(error) return onError(error);

            pipeline = p;

            pipeline.create("PlayerEndpoint", {uri: url}, function(error, player){
                if(error) return onError(error);

                pipeline.create("WebRtcEndpoint", function(error, webRtcEndpoint){
                    if(error) return onError(error);

                    setIceCandidateCallbacks(webRtcEndpoint, webCam, onError);

                    webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer){
                        if(error) return onError(error);

                        webRtcEndpoint.gatherCandidates(onError);

                        webCam.processAnswer(sdpAnswer);
                    });

                    player.connect(webRtcEndpoint, function(error){
                        if(error) return onError(error);

                        console.log("PlayerEndpoint-->WebRtcEndpoint connection established");

                        player.play(function(error){
                            if(error) return onError(error);

                            console.log("Player playing ...");
                        });
                    });
                });
            });
        });
    });
}

function stop() {
    // address.disabled = false;
    if (webCam) {
        webCam.dispose();
        webCam = null;
    }
    if(pipeline){
        pipeline.release();
        pipeline = null;
    }
    hideSpinner(camVideo);
}

function setIceCandidateCallbacks(webRtcEndpoint, webCam, onError){
    console.log("four");
    webCam.on('icecandidate', function(candidate){
        console.log("Local icecandidate " + JSON.stringify(candidate));

        candidate = kurentoClient.register.complexTypes.IceCandidate(candidate);

        webRtcEndpoint.addIceCandidate(candidate, onError);

    });
    webRtcEndpoint.on('OnIceCandidate', function(event){
        var candidate = event.candidate;

        console.log("Remote icecandidate " + JSON.stringify(candidate));

        webCam.addIceCandidate(candidate, onError);
    });
}

function onError(error) {
    if(error)
    {
        console.error(error);
        stop();
    }
}

function showSpinner() {
    // for (var i = 0; i < arguments.length; i++) {
    //     arguments[i].poster = 'img/transparent-1px.png';
    //     arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
    // }
}

function hideSpinner() {
    // for (var i = 0; i < arguments.length; i++) {
    //     arguments[i].src = '';
    //     arguments[i].poster = 'img/webrtc.png';
    //     arguments[i].style.background = '';
    // }
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
// $(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
//     console.log("five");
//     event.preventDefault();
//     $(this).ekkoLightbox();
// });