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
  let serverProcess;

  function _init(sdpFunction, myConnId) {
    serverProcess = sdpFunction;
    myConnectionID = myConnId;
  }

  function setNewConnection(connId) {
    let connection = new RTCPeerConnection(iceConfiguration);

    connection.onnegotiationneeded = async function (event) {
      await setOffer(connId);
    };

    connection.onicecandidate = function (event) {
      if (event.candidate) {
        serverProcess(JSON.stringify({ icecandidate: event.candidate }), connId);
      }
    };

    connection.ontrack = function (event) {};

    peersConnectionIds[connId] = connId;
    peersConnection[connId] = connection;
  }

  function setOffer(connId) {
    let connection = peersConnection[connId];
    let offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    serverProcess(JSON.stringify({offer: connection.localDescription}), connId);
  }

  return {
    init: async function (sdpFunction, myConnId) {
      await _init(sdpFunction, myConnId);
    },
    setNewConnection: async function (connId) {
      await setNewConnection(connId);
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
