var MyApp = (function () {
  function init(uid, mid) {
    alert("TEST");
  }

  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
