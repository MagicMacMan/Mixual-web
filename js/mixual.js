$(function() {

    var Spectrum = this.Canvas;
    var DiffSpect = this.DiffSpect;

    var Mix = this.Mix = function Mix(opts, canvasopts) {

        _.extend(this, opts);

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // create canvases
        this.leftcanvas = new Spectrum(_.extend(canvasopts, { el : '#canvas1' }));
        this.rightcanvas = new Spectrum(_.extend(canvasopts, { el : '#canvas2' }));

        // create mix canvases
        this.mixone = new Spectrum(_.extend(canvasopts, { el : '#canvas3' }));
        this.mixtwo = new DiffSpect(_.extend(canvasopts, { el : '#canvas4' }));

        this.bindCanvasEvents();

        this.fftBuffers = [];
        this.sources = [];
        this.analysers = [];

        this.snapshots = [ [], [] ]; // two bins of snapshots
        this.recording = false;

        this.fftSize = 2048;

        this.ready = false;

        this.load( function(self) {
            self.leftcanvas.renderPlayButton();
            self.rightcanvas.renderPlayButton();

            self.mixone.renderPlayButton();
            self.mixtwo.renderPlayButton();
        });

        this.connections = [];
        this.playing = [false, false];

    };

    Mix.prototype.load = function(callback) {
        var self = this;

        _.each(this.songs , function(file) {
            var request = new XMLHttpRequest();

            request.open('get', file, true);
            request.responseType = 'arraybuffer';

            request.onload = function () {
                self.ctx.decodeAudioData(request.response, function(buffer) {
                    console.log('success.');

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

    Mix.prototype.refreshBuffers = function () {
        this.analysers[0].getByteFrequencyData(this.fftBuffers[0]);
        this.analysers[1].getByteFrequencyData(this.fftBuffers[1]);
        this.analysers[2].getByteFrequencyData(this.fftBuffers[2]);
    };

    Mix.prototype.play = function() {
        _.each(this.sources, function(src) { src.start(); });
    };

    Mix.prototype.play_and_plot = function() {
        this.play();
        this.plot(Date.now());
    };

    // publish data to connections
    Mix.prototype.publish = function() {

        if (!this.fps && this.connections.length > 0) requestAnimationFrame(this.publish.bind(this));

        this.refreshBuffers();

        for (var i = 0; i < this.connections.length; i++) {
            if (typeof this.connections[i][0] === 'number') {
                this.connections[i][1].render(this.fftBuffers[this.connections[i][0]]);
            } // its an array
            else {
                this.connections[i][1].render(this.fftBuffers[this.connections[i][0][0]], this.fftBuffers[this.connections[i][0][1]]); // i know it's two
            }
        }
    };

    // connect a canvas that is given bufferdata on each iteration
    Mix.prototype.connect = function(idx, canvas) {
        this.connections.push([idx, canvas]);
        if (this.connections.length === 1) this.publish();

    };

    Mix.prototype.getFrequencyFromBin = function(n) {
        return n * this.ctx.sampleRate / this.fftSize;
    };

    Mix.prototype.stop = function(idx, stopped) {

        if (!stopped) this.sources[idx].stop();

        this.playing[idx] = false;

        // create a new sourcebuffernode to replace the old
        var source = this.ctx.createBufferSource();
        source.buffer = this.sources[idx].buffer;
        this.sources[idx] = source;

        source.connect(this.analysers[idx]);
        source.connect(this.ctx.destination);

        var connection = _.find(this.connections, function(connection) {
            return connection[0] === idx;
        });

        // remove connection
        this.connections[this.connections.indexOf(connection)] = _.last(this.connections);
        this.connections.pop();

        this.bindCanvasEvents(idx);

        if (idx === 0) this.leftcanvas.renderPlayButton();
        else if (idx === 1) this.rightcanvas.renderPlayButton();
        else if (idx === 2) this.mixone.renderPlayButton();
        else if (idx === 3) this.mixtwo.renderPlayButton();
    };


    Mix.prototype.bindCanvasEvents = function(idx) {

        var self = this;

        if (!idx || idx === 0) {

            this.leftcanvas.$el.on('click', function() {
                if (!self.playing[0]) {
                    self.sources[0].start();
                    self.playing[0] = true;
                    self.connect(0, self.leftcanvas);
                }
                else {
                    self.stop(0);
                }
            });

        }

        if (!idx || idx === 1) {

            this.rightcanvas.$el.on('click', function() {
                if (!self.playing[1]) {
                    self.sources[1].start();
                    self.playing[1] = true;
                    self.connect(1, self.rightcanvas);
                }
                else {
                    self.stop(1);
                }
            });

        }

        if (!idx || idx === 2) {

            this.mixone.$el.on('click', function() {
                if (!self.playing[2]) {
                    self.sources[2].start();
                    self.playing[2] = true;
                    self.connect(2, self.mixone);
                }
                else {
                    self.stop(2);
                }
            });

        }

        if (!idx || idx === 3) {

            this.mixtwo.$el.on('click', function() {
                if (!self.playing[3]) {
                    self.sources[0].start();
                    self.sources[1].start();

                    self.playing[0] = true;
                    self.playing[1] = true;

                    self.connect([0, 1], self.mixtwo);
                }
                else {
                    self.stop(0);
                    self.stop(1);
                }
            });

        }
    };


}.call(this));
