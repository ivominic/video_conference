let AppProcess = (function () {
  let iceConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
    ],
  };

  let peersConnectionIds = [];
  let peersConnection = [];
  let remoteVideoStream = [];
  let remoteAudioStream = [];
  let localDiv;
  let serverProcess;
  let audio;
  let isAudioMute = true;
  let rtpAudioSenders = [];
  let rtpVideoSenders = [];
  let videoStates = {
    None: 0,
    Camera: 1,
    ScreenShare: 2,
  };
  let videoState = videoStates.None;
  let videoCamTrack;

  async function _init(sdpFunction, myConnId) {
    serverProcess = sdpFunction;
    myConnectionID = myConnId;
    eventProcess();
    localDiv = document.querySelector("#localVideoPlayer");
  }

  async function eventProcess() {
    $("#micMuteUnmute").on("click", async function () {
      if (audio) {
        await loadAudio();
      }
      if (!audio) {
        alert("Audio permission has not been granted.");
        return;
      }
      if (isAudioMute) {
        audio.enabled = true;
        $(this).html('<span class="material-icons">mic</span>');
        updateMediaSenders(audio, rtpAudioSenders);
      } else {
        audio.enabled = false;
        $(this).html('<span class="material-icons">mic_off</span>');
        removeMediaSenders(rtpAudioSenders);
      }
      isAudioMute = !isAudioMute;
    });

    $("#videoCamOnOff").on("click", async function () {
      if (videoState === videoStates.Camera) {
        await videoProcess(videoStates.None);
      } else {
        await videoProcess(videoStates.Camera);
      }
    });
    $("#screenShareOnOff").on("click", async function () {
      if (videoState === videoStates.ScreenShare) {
        await videoProcess(videoStates.None);
      } else {
        await videoProcess(videoStates.Camera);
      }
    });
  }

  async function videoProcess(newVideoState) {
    try {
      let vstream = null;
      if (newVideoState === videoStates.Camera) {
        vstream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      } else if (newVideoState === videoStates.ScreenShare) {
        vstream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      }

      if (vstream && vstream.getVideoTracks().length) {
        videoCamTrack = vstream.getVideoTracks()[0];
        if (videoCamTrack) {
          localDiv.srcObject = new MediaStream([videoCamTrack]);
          //alert("Video cam found");
          updateMediaSenders(videoCamTrack, rtpVideoSenders);
        }
      }
    } catch (e) {
      console.log(e);
      return;
    }
    videoState = newVideoState;
  }

  async function setNewConnection(connId) {
    let connection = new RTCPeerConnection(iceConfiguration);

    connection.onnegotiationneeded = async function (event) {
      await setOffer(connId);
    };

    connection.onicecandidate = function (event) {
      if (event.candidate) {
        serverProcess(JSON.stringify({ icecandidate: event.candidate }), connId);
      }
    };

    connection.ontrack = function (event) {
      if (!remoteVideoStream[connId]) {
        remoteVideoStream[connId] = new MediaStream();
      }
      if (!remoteAudioStream[connId]) {
        remoteAudioStream[connId] = new MediaStream();
      }

      if (event.track.kind === "video") {
        remoteVideoStream[connId].getVideoTracks().forEach((element) => {
          remoteVideoStream[connId].removeTrack(element);
        });
        remoteVideoStream[connId].addTrack(event.track);
        let remoteVideoPlayer = document.querySelector("#v_" + connId);
        remoteVideoPlayer.srcObject = null;
        remoteVideoPlayer.srcObject = remoteVideoStream[connId];
        remoteVideoPlayer.load();
      } else if (event.track.kind === "audio") {
        remoteAudioStream[connId].getAudioTracks().forEach((element) => {
          remoteAudioStream[connId].removeTrack(element);
        });
        remoteAudioStream[connId].addTrack(event.track);
        let remoteAudioPlayer = document.querySelector("#a_" + connId);
        remoteAudioPlayer.srcObject = null;
        remoteAudioPlayer.srcObject = remoteAudioStream[connId];
        remoteAudioPlayer.load();
      }
    };

    peersConnectionIds[connId] = connId;
    peersConnection[connId] = connection;

    //To show streaming from other users
    if (videoState === videoStates.Camera || videoState === videoStates.ScreenShare) {
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack, rtpVideoSenders);
      }
    }

    return connection;
  }

  async function setOffer(connId) {
    let connection = peersConnection[connId];
    let offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    serverProcess(JSON.stringify({ offer: connection.localDescription }), connId);
  }

  async function sdpProcess(message, fromConnId) {
    message = JSON.parse(message);
    if (message.answer) {
      await peersConnection[fromConnId].setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.offer) {
      if (!peersConnection[fromConnId]) {
        await setConnection(fromConnId);
      }

      await peersConnection[fromConnId].setRemoteDescription(new RTCSessionDescription(message.offer));

      let answer = await peersConnection[fromConnId].createAnswer();
      await peersConnection[fromConnId].setLocalDescription(answer);
      serverProcess(JSON.stringify({ answer: answer }), fromConnId);
    } else if (message.icecandidate) {
      if (peersConnection[fromConnId]) {
        await setNewConnection(fromConnId);
      }
      try {
        peersConnection[fromConnId].addIceCandidate(message.icecandidate);
      } catch (e) {
        console.log(e);
      }
    }
  }

  return {
    init: async function (sdpFunction, myConnId) {
      await _init(sdpFunction, myConnId);
    },
    setNewConnection: async function (connId) {
      await setNewConnection(connId);
    },
    processClientFunc: async function (data, fromConnId) {
      await sdpProcess(data, fromConnId);
    },
  };
})();

let MyApp = (function () {
  let socket = null;
  let userId = "";
  let meetingId = "";

  function init(uid, mid) {
    userId = uid;
    meetingId = mid;
    $("#meetingContainer").removeClass("d-none");
    $("#me h2").text(userId + " Me");
    document.title = userId;
    eventProcesForSignalingServer();
  }

  function eventProcesForSignalingServer() {
    socket = io.connect();

    let sdpFunction = function (data, toConnId) {
      socket.emit("SDPProcess", {
        message: data,
        toConnId: toConnId,
      });
    };

    socket.on("connect", () => {
      if (socket.connected) {
        AppProcess.init(sdpFunction, socket.id);
        if (userId && meetingId) {
          socket.emit("userconnect", {
            displayName: userId,
            meetingId: meetingId,
          });
        }
      }
    });

    socket.on("inform_others_about_me", (data) => {
      addUser(data.otherUserId, data.connId);
      AppProcess.setNewConnection(connId);
    });

    socket.on("inform_me_about_other_user", (otherUsers) => {
      if (otherUsers) {
        for (i = 0; i < otherUsers.length; i++) {
          addUser(otherUsers[i].userId, otherUsers[i].connectionId);
          AppProcess.setNewConnection(otherUsers[i].connectionId);
        }
      }
    });

    socket.on("SDPProcess", async function (data) {
      await AppProcess.processClientFunc(data.message, fromConnId);
    });
  }

  function addUser(otherUserId, connId) {
    let newDiv = $("#otherTemplate").clone();
    newDiv = newDiv.attr("id", connId).addClass("other");
    newDiv.find("h2").text(otherUserId);
    newDiv.find("video").attr("id", "v_" + connId);
    newDiv.find("audio").attr("id", "a_" + connId);
    newDiv.show();
    $("#divUsers").append(newDiv);
  }

  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
