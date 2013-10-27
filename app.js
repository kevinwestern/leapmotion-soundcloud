var tunes = angular.module('tunes', ['ngRoute']);

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

  scloud.then(function(me) {
    $scope.user.username = me.username;
    $scope.user.avatarUrl = me.avatar_url;
    SC.get('/playlists', {user_id: me.id}, function(playlists) {
      $scope.$apply(function() {
        var songs = [];
        playlists.forEach(function(playlist) {
          playlist.tracks.forEach(function(track) {
            songs.push(track);
          });
        })
        $scope.user.songs = songs;
        $scope.selectedSong = songs[0];
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
      (!isLeftDir && selectedSongIndex == $scope.user.songs.length - 1)) {
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
        $scope.selectedSong = $scope.user.songs[selectedSongIndex];
      });
    }
  };
  ctrl.on('frame', function(frame) {
    frame.gestures.forEach(function(gesture) {
      if (gesture.type == 'screenTap') {
        play($scope.user.songs[selectedSongIndex]);
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