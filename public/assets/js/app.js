var MyApp = (function () {
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
    });
  }

  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
