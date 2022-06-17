let AppProcess = (function () {
  function setNewConnection(connId) {
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
    let connection = new RTCPeerConnection(iceConfiguration);
  }

  return {
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
    socket.on("connect", () => {
      if (socket.connected) {
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
