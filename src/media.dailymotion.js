/**
 * @fileoverview Dailymotion Media Controller - Wrapper for Dailymotion Media API
 */

/**
 * Dailymotion Media Controller - Wrapper for Dailymotion Media API
 * @param {vjs.Player|Object} player
 * @param {Object=} options
 * @param {Function=} ready
 * @constructor
 */
vjs.Dailymotion = vjs.MediaTechController.extend({
    init: function (player, options, ready) {
        vjs.MediaTechController.call(this, player, options, ready);

        this.features.fullscreenResize = true;

        this.player_ = player;
        this.player_el_ = document.getElementById(this.player_.id());

        // Copy the Javascript options if they exist
        if (typeof options.source != 'undefined') {
            for (var key in options.source) {
                this.player_.options()[key] = options.source[key];
            }
        }

        this.videoId = vjs.Dailymotion.parseVideoId(this.player_.options().src);

        /*if (typeof this.videoId != 'undefined') {
         // Show the Dailymotion poster only if we don't use Dailymotion poster (otherwise the controls pop, it's not nice)
         if (!this.player_.options().dmcontrols){
         // Set the Dailymotion poster only if none is specified
         if (typeof this.player_.poster() == 'undefined') {
         this.player_.poster('http://img.Dailymotion.com/vi/' + this.videoId + '/0.jpg');
         }

         // Cover the entire iframe to have the same poster than Dailymotion
         // Doesn't exist right away because the DOM hasn't created it
         var self = this;
         setTimeout(function(){ self.player_.posterImage.el().style.backgroundSize = 'cover'; }, 50);
         }
         } */

        this.id_ = this.player_.id() + '_dailymotion_api';

        this.el_ = vjs.Component.prototype.createEl('iframe', {
            id: this.id_,
            className: 'vjs-tech',
            scrolling: 'no',
            marginWidth: 0,
            marginHeight: 0,
            frameBorder: 0,
            webkitAllowFullScreen: '',
            mozallowfullscreen: '',
            allowFullScreen: ''
        });

        this.player_el_.insertBefore(this.el_, this.player_el_.firstChild);

        this.params = {
            id: this.id_,
            autoplay: (this.player_.options().autoplay) ? 1 : 0,
            chromeless: 1,
            html: 1,
            info: 1,
            logo: 1,
            controls: (this.player_.options().dmControls) ? 1 : 0,
            wmode: 'opaque',
            format: 'json',
            url: this.player_.options().src
        };

        if (typeof this.params.list == 'undefined') {
            delete this.params.list;
        }

        // Make autoplay work for iOS
        if (this.player_.options().autoplay) {
            this.player_.bigPlayButton.hide();
            this.playOnReady = true;
        }

        // If we are not on a server, don't specify the origin (it will crash)
        if (window.location.protocol != 'file:') {
            this.params.origin = window.location.protocol + '//' + window.location.hostname;
        }


        this.el_.src = 'http://www.dailymotion.com/services/oembed?' + vjs.Dailymotion.makeQueryString(this.params);


        if (vjs.Dailymotion.apiReady) {
            this.loadApi();
        } else {
            // Add to the queue because the Dailymotion API is not ready
            vjs.Dailymotion.loadingQueue.push(this);

            // Load the Dailymotion API if it is the first Dailymotion video
            if (!vjs.Dailymotion.apiLoading) {
                var tag = document.createElement('script');
                tag.src = 'http://api.dmcdn.net/all.js';
                var firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                vjs.Dailymotion.apiLoading = true;
            }
        }
    }
});

vjs.Dailymotion.prototype.params = [];

vjs.Dailymotion.prototype.dispose = function () {
    if (this.el_) {
        this.el_.parentNode.removeChild(this.el_);
    }

    /*if (this.dmPlayer) {
     this.dmPlayer.destroy();
     }*/

    vjs.MediaTechController.prototype.dispose.call(this);
};

vjs.Dailymotion.prototype.src = function (src) {
    this.dmPlayer.load(vjs.Dailymotion.parseVideoId(src));
};

vjs.Dailymotion.prototype.currentSrc = function () {
    if (this.isReady_) {
        return this.params.url;
    }
    else {
        return null;
    }
};

vjs.Dailymotion.prototype.play = function () {
    if (this.isReady_) {
        this.dmPlayer.play();
    } else {
        // We will play it when the API will be ready
        this.playOnReady = true;

        if (!this.player_.options.dmControls) {
            // Keep the big play button until it plays for real
            this.player_.bigPlayButton.show();
        }
    }
};

vjs.Dailymotion.prototype.ended = function () {

    if (this.isReady_) {
        var stateId = this.dmPlayer.getPlayerState();
        return stateId == 0;
    } else {
        // We will play it when the API will be ready
        return false;
    }
};

vjs.Dailymotion.prototype.pause = function () {
    this.dmPlayer.pause(!this.dmPlayer.paused);
};

vjs.Dailymotion.prototype.paused = function () {
    return this.dmPlayer.paused;
};

vjs.Dailymotion.prototype.currentTime = function () {
    return this.dmPlayer.currentTime;
};

vjs.Dailymotion.prototype.setCurrentTime = function (seconds) {
    this.dmPlayer.seek(seconds, true);
    this.player_.trigger('timeupdate');
};

vjs.Dailymotion.prototype._duration;
vjs.Dailymotion.prototype.duration = function () {
    return this.dmPlayer.duration;
};
vjs.Dailymotion.prototype.buffered = function () {
    /*var loadedBytes = this.dmPlayer.getVideoBytesLoaded();
     var totalBytes = this.dmPlayer.getVideoBytesTotal();
     if (!loadedBytes || !totalBytes) return 0;

     var duration = this.dmPlayer.getDuration();
     var secondsBuffered = (loadedBytes / totalBytes) * duration;
     var secondsOffset = (this.dmPlayer.getVideoStartBytes() / totalBytes) * duration;
     return vjs.createTimeRange(secondsOffset, secondsOffset + secondsBuffered);  */
};

vjs.Dailymotion.prototype.volume = function () {
    if (isNaN(this.volumeVal)) {
        this.volumeVal = this.dmPlayer.volume;
    }

    return this.volumeVal;
};

vjs.Dailymotion.prototype.setVolume = function (percentAsDecimal) {
    if (percentAsDecimal && percentAsDecimal != this.volumeVal) {
        this.dmPlayer.volume = percentAsDecimal;
        this.volumeVal = percentAsDecimal;
        this.player_.trigger('volumechange');
    }
};

vjs.Dailymotion.prototype.muted = function () {
    return this.dmPlayer.muted;
};
vjs.Dailymotion.prototype.setMuted = function (muted) {
    this.dmPlayer.muted = muted;

    var self = this;
    setTimeout(function () {
        self.player_.trigger('volumechange');
    }, 50);
};

vjs.Dailymotion.prototype.onReady = function () {
    this.isReady_ = true;
    this.player_.trigger('techready');

    // Hide the poster when ready because Dailymotion has it's own
    this.triggerReady();
    this.player_.trigger('durationchange');

    // Play right away if we clicked before ready
    if (this.playOnReady) {
        this.dmPlayer.play();
    }
};


vjs.Dailymotion.isSupported = function () {
    return true;
};

vjs.Dailymotion.prototype.supportsFullScreen = function () {
    return false;
};

vjs.Dailymotion.canPlaySource = function (srcObj) {
    return (srcObj.type == 'video/dailymotion');
};

// All videos created before Dailymotion API is loaded
vjs.Dailymotion.loadingQueue = [];

// Create the Dailymotion player
vjs.Dailymotion.prototype.loadApi = function () {
    this.dmPlayer = new DM.player(this.id_, {
        video: this.videoId,
        width: this.options.width,
        height: this.options.height,
        params: this.params
    });


    this.setupTriggers();

    this.dmPlayer.vjsTech = this;
};


videojs.Dailymotion.prototype.onStateChange = function (event) {
    var state = event.type;
    if (state != this.lastState) {
        switch (state) {
            case -1:
                this.player_.trigger('durationchange');
                break;

            case 'apiready':
                this.onReady();
                break;

            case 'ended':

                if (!this.player_.options().dmControls) {
                    this.player_.bigPlayButton.show();
                }
                break;

            case 'play':
            case 'playing':
                break;

            case 'pause':
                break;
            case 'durationchange':
                break;

            case 'timeupdate':
                // Hide the waiting spinner since YouTube has its own
                this.player_.loadingSpinner.hide();
                break;
            case 'progress':
                break;

        }

        this.lastState = state;
    }
};

vjs.Dailymotion.makeQueryString = function (args) {
    var array = [];
    for (var key in args) {
        if (args.hasOwnProperty(key)) {
            array.push(encodeURIComponent(key) + '=' + encodeURIComponent(args[key]));
        }
    }

    return array.join('&');
};

vjs.Dailymotion.parseVideoId = function (src) {
// Regex that parse the video ID for any Dailymotion URL
    var regExp = /^.+dailymotion.com\/((video|hub)\/([^_]+))?[^#]*(#video=([^_&]+))?/;
    var match = src.match(regExp);

    return match ? match[5] || match[3] : null;
};

vjs.Dailymotion.parsePlaylist = function (src) {
    // Check if we have a playlist
    var regExp = /[?&]list=([^#\&\?]+)/;
    var match = src.match(regExp);

    if (match != null && match.length > 1) {
        return match[1];
    }
};

// Make video events trigger player events
// May seem verbose here, but makes other APIs possible.
vjs.Dailymotion.prototype.setupTriggers = function () {
    for (var i = vjs.Dailymotion.Events.length - 1; i >= 0; i--) {
        //vjs.on(this.dmPlayer, vjs.Dailymotion.Events[i], vjs.bind(this, this.eventHandler));
        this.dmPlayer.addEventListener(vjs.Dailymotion.Events[i],vjs.bind(this, this.eventHandler));
    }
};
// Triggers removed using this.off when disposed

vjs.Dailymotion.prototype.eventHandler = function (e) {
    this.onStateChange(e);
    this.trigger(e);
};

// List of all HTML5 events (various uses).
vjs.Dailymotion.Events = 'apiready,play,playing,pause,ended,canplay,canplaythrough,timeupdate,progress,seeking,seeked,volumechange,durationchange,fullscreenchange,error'.split(',');


// Called when Dailymotion API is ready to be used
window.dmAsyncInit = function () {

    var dm;
    while ((dm = vjs.Dailymotion.loadingQueue.shift())) {
        dm.loadApi();
    }
    vjs.Dailymotion.loadingQueue = [];
    vjs.Dailymotion.apiReady = true;
}

