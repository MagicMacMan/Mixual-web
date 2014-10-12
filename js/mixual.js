$(function() {

    var Spectrum = this.Canvas;
    var DiffSpect = this.DiffSpect;

    var Media = this.Media = function() {};


    Media.prototype.update = function() {
        this.analyser.getByteFrequencyData(this.buffer);
    };

    var Mix = this.Mix = function Mix(opts, canvasopts) {

        _.extend(this, opts);

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // create mix canvases
        this.mixone = new Spectrum(_.extend(canvasopts, { el : '#canvas1' }));
        this.mixtwo = new DiffSpect(_.extend(canvasopts, { el : '#canvas2' }));

        this.medias = [];

        this.snapshots = [ [], [] ]; // two bins of snapshots
        this.recording = false;

        this.fftSize = 2048;

    };

    Mix.prototype.load = function(callback) {
        var self = this;

        if (!this.songs) return;

        _.each(this.songs , function(file) {
            var request = new XMLHttpRequest();

            request.open('get', file, true);
            request.responseType = 'arraybuffer';

            request.onload = function () {
                self.ctx.decodeAudioData(request.response, function(buffer) {
                    console.log('success.');

                    // needs a rewrite to work with this.medias object
                    var source = self.ctx.createBufferSource();
                    source.buffer = buffer;
                    self.sources.push(source);

                    var idx = self.sources.length;

                    var analyser = self.ctx.createAnalyser();
                    analyser.fftSize = self.fftSize;

                    self.analysers.push(analyser);

                    source.connect(analyser);
                    source.connect(self.ctx.destination);

                    self.fftBuffers.push(new Uint8Array(analyser.frequencyBinCount));

                    if (self.sources.length === self.songs.length) {
                        self.ready = true;
                        if (callback) callback(self);
                    }

                }, function(error) {
                    console.log('failed to decode audio stream : %s', file);
                    console.log(error);
                });
            };

            request.send();
        });
    };

    Mix.prototype.streamIn = function(canvas, stream) {
        var media = new Media();

        media.canvas = canvas;
        media.stream = stream;

        media.source = this.ctx.createMediaElementSource(stream);
        media.analyser = this.ctx.createAnalyser();

        media.source.connect(media.analyser);
        media.analyser.connect(this.ctx.destination);

        media.buffer = new Uint8Array(media.analyser.frequencyBinCount);

        media.stream.addEventListener('play', _.partial(this.feed, canvas).bind(this));

        this.medias.push(media);

    };

    Mix.prototype.plotFrequencies = function(time) {

        requestAnimationFrame(_.partial(this.plot, Date.now()).bind(this));

        this.refreshBuffers();

        var data = [];

        for (var i = 0; i < this.fftBuffers[0].length; i++) {
            
            // get the difference; relative frequency amplitudes
            // to easier see disjoints
            //
            // and associate the frequencies
            
            data.push([this.getFrequencyFromBin(i), this.fftBuffers[0][i] - this.fftBuffers[1][i]]);
        }

        $.plot(this.el, [ data ]);

    };

    Mix.prototype.drawSnapshots = function() {



    };

    Mix.prototype.beginRecording = function() {
        this.recording = true;

        var bound = this.recordSnapshots.bind(this);

        if (!this.fps) requestAnimationFrame(_.partial(bound, true));
        else setInterval(bound, this.fps);
    };

    Mix.prototype.recordSnapshots = function(animframe) {

        if (animframe) {
            var bound = _.partial(this.recordSnapshots, true).bind(this);
            requestAnimationFrame(bound);
        }

        this.recordOneSnapshot();
        
        // only keep ~ 2 seconds
        if (this.snapshots[0].length > 40) {
            this.snapshots[0].pop();
            this.snapshots[1].pop();
        }

    };

    // a frequency is (relatively) characteristic if it is
    // prominent in the disjoint of the two frequency spectrums
    Mix.prototype.getMostCharacteristicFrequencies = function() {

        var snapshot1 = [],
            snapshot2 = [];

        var snapshotLength = this.snapshots[0].length;

        for (var i = 0; i < this.fftSize/2; i++) {
            snapshot1.push(0);
            snapshot2.push(0);

            // sum over frequencies of all snapshots 
            for (var j = 0; j < snapshotLength; i++) {
                snapshot1[i] += this.snapshots[1][j];
                shapshot2[i] += this.snapshots[2][j];
            }

            // normalize
            snapshot1[i] /= snapshotLength;
            snapshot2[i] /= snapshotLength;

        }

        // now we search for the frequency bins with the biggest difference


    };

    Mix.prototype.estimateBPM = function(idx) {

        // look within characteristic frequencies to find a loud, recurring one

    };

    Mix.prototype.estimatePhaseDelta = function() {
        
        // when characteristic frequencies are found, find delta in time

    };

    Mix.prototype.recordOneSnapshot = function() {
        this.snapshots[0].push(this.analyser[0].getByteFrequencyData(new Uint8Array(this.fftSize)));
        this.snapshots[1].push(this.analyser[1].getByteFrequencyData(new Uint8Array(this.fftSize)));
    };

    Mix.prototype.getFrequencyFromBin = function(n) {
        return n * this.ctx.sampleRate / this.fftSize;
    };

    // feed analyser nodes to canvas
    Mix.prototype.feed = function(canvas) {

        if (!this.fps) requestAnimationFrame(_.partial(this.feed, canvas).bind(this));

        var data = [];

        var plucked = _.where(this.medias, { canvas : canvas });

        _.each(plucked, function(media) {
            media.update();
            data.push(media.buffer);
        });

        if (canvas === 0) this.mixone.render(data[0]);
        else if (canvas === 1) this.mixtwo.render(data);

    };

}.call(this));
