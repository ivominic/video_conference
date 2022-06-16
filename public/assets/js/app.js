var MyApp = (function () {
  function init(uid, mid) {
    eventProcesForSignalingServer();
  }

  let socket = null;
  function eventProcesForSignalingServer() {
    socket = io.connect();
    socket.on("connect", () => {
      alert("socket connected on client side.");
    });
  }

  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
