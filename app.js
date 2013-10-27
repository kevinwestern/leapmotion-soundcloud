var tunes = angular.module('tunes', ['ngRoute']);

tunes.filter('ellipses', function() {
  return function(str, length) {
    // plus 3 for the ellipses
    if (str.length <= length + 3) {
      return str;
    }
    return str.substring(0, length) + '...';
  };
});

tunes.directive('track', function() {
  return {
    scope: {
      'track': '='
    },
    template: "<div class='track'>" +
      "<h3 class='title'>{{track.title | ellipses:25}}</h3>" +
      "<img ng-src='{{track.artwork_url}}''>"
  };
});

tunes.factory('scloud', ['$q', function($q) {
  var deferred = $q.defer();

  SC.initialize({
    client_id: "03df9f6042735bc274cc6c6b27aaf6f7",
    redirect_uri: "http://localhost:8000/callback.html",
  });
  SC.connect(function() {
    SC.get('/me', function(me) {
      deferred.resolve(me);
    });
  });

  return deferred.promise;
}]);

tunes.controller('HomeCtrl', ['$scope', 'scloud', function($scope, scloud) {
  $scope.name = 'world';
  $scope.user = {};
  $scope.selectedSong = null;

  var currentSound = null;
  var selectedSongIndex = 0;
  var totalSongCount = 0;

  scloud.then(function(me) {
    $scope.user.username = me.username;
    $scope.user.avatarUrl = me.avatar_url;
    SC.get('/playlists', {user_id: me.id}, function(playlists) {
      $scope.$apply(function() {
        var songs = [];
        var songCount = 0;
        var buffer = [];
        totalSongCount = 0;
        playlists.forEach(function(playlist) {
          playlist.tracks.forEach(function(track) {
            buffer.push(track);
            songCount++;
            totalSongCount++;
            if (songCount == 4) {
              songs.push(buffer.slice(0));
              songCount = 0;
              buffer = [];
            }
          });
        });
        songs.push(buffer.slice(0));
        $scope.user.songs = songs;
        $scope.selectedSong = songs[0][0];
        selectedSongIndex = 0;
      });
    });
  });
  var play = function(track) {
    SC.stream("/tracks/" + track.id, function(sound) {
      console.log(sound);
      if (currentSound) {
        currentSound.stop();
      }
      currentSound = sound;
      currentSound.play();
    });
  };

  var ctrl = new Leap.Controller({enableGestures: true});
  var turns = 0;
  var volume = 50;
  var onCircle = function(gesture) {
    if (gesture.normal[2] <= 0 && volume < 100) {
        turns++;
        if (turns % 20 == 0) {
          volume += 5;
          currentSound.setVolume(volume);  
        }
    } else if (volume > 0) {
      turns--;
      if (turns % 20 == 0) {
        volume -= 5;
        currentSound.setVolume(volume);  
      }
    }
  };
  var swipe = 0;
  var onSwipe = function(gesture) {
    var isLeftDir = gesture.direction[0] < 0;
    // out of bounds
    if ((isLeftDir && selectedSongIndex == 0) ||
      (!isLeftDir && selectedSongIndex == totalSongCount - 1)) {
      return;
    }
    if (isLeftDir) {
      swipe -= 5;
    } else {
      swipe += 5;
    }
    if (swipe % 500 == 0) {
      swipe = 0;
      selectedSongIndex = selectedSongIndex + (isLeftDir ? -1 : 1);
      $scope.$apply(function() {
        var r = parseInt(selectedSongIndex / 4, 10);
        var c = selectedSongIndex % 4;
        $scope.selectedSong = $scope.user.songs[r][c];
      });
    }
  };
  ctrl.on('frame', function(frame) {
    frame.gestures.forEach(function(gesture) {
      if (gesture.type == 'screenTap') {
        var r = parseInt(selectedSongIndex / 4, 10);
        var c = selectedSongIndex % 4;
        play($scope.user.songs[r][c]);
      }
      else if (gesture.type == 'circle') {
        onCircle(gesture);
      } else if (gesture.type == 'swipe') {
        onSwipe(gesture);
      } 
      
    });
  });
  ctrl.connect();
}]);

// config app
tunes.config(['$locationProvider', function(lp) {
  lp.html5Mode(true);
}]);
tunes.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'home.ng',
    controller: 'HomeCtrl'
  }).otherwise({
    redirectTo: '/'
  });
}]);