$(function() {

    var Spectrum = this.Canvas;

    var Mix = this.Mix = function Mix(opts, canvasopts) {

        _.extend(this, opts);

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // create one canvas
        this.canvas = new Spectrum(_.extend(canvasopts, { el : '#canvas1' }));

        this.fftBuffers = [];
        this.sources = [];
        this.analysers = [];

        this.snapshots = [ [], [] ]; // two bins of snapshots
        this.recording = false;

        this.fftSize = 2048;

        this.ready = false;

        this.load();

        this.connections = [];

    };

    Mix.prototype.load = function(callback) {
        var self = this;

        _.each(this.songs, function(file) {
            var request = new XMLHttpRequest();

            request.open('get', file, true);
            request.responseType = 'arraybuffer';

            request.onload = function () {
                self.ctx.decodeAudioData(request.response, function(buffer) {
                    console.log('success.');

                    var source = self.ctx.createBufferSource();
                    source.buffer = buffer;
                    self.sources.push(source);

                    var analyser = self.ctx.createAnalyser();
                    analyser.fftSize = self.fftSize;

                    self.analysers.push(analyser);

                    source.connect(analyser);
                    source.connect(self.ctx.destination);

                    self.fftBuffers.push(new Float32Array(analyser.frequencyBinCount));

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
        this.snapshots[0].push(this.analyser[0].getFloatFrequencyData(new Float32Array(this.fftSize)));
        this.snapshots[1].push(this.analyser[1].getFloatFrequencyData(new Float32Array(this.fftSize)));
    };

    Mix.prototype.refreshBuffers = function () {
        this.analysers[0].getFloatFrequencyData(this.fftBuffers[0]);
        //this.analysers[1].getFloatFrequencyData(this.fftBuffers[1]);
    };

    Mix.prototype.play = function() {
        //_.each(this.sources, function(src) { src.start(); });
        this.sources[0].start();
    };

    Mix.prototype.play_and_plot = function() {
        this.play();
        this.plot(Date.now());
    };

    // publish data to connections
    Mix.prototype.publish = function() {

        if (!this.fps) requestAnimationFrame(this.publish.bind(this));

        this.refreshBuffers();

        for (var i = 0; i < this.connections.length; i++) {
            this.connections[i].render(this.fftBuffers[i]);
        }
    };

    // connect a canvas that is given bufferdata on each iteration
    Mix.prototype.connect = function(canvas) {
        this.connections.push(canvas);
        if (this.connections.length === 1) this.publish();

        console.log('connected.');
    };

    Mix.prototype.getFrequencyFromBin = function(n) {
        return n * this.ctx.sampleRate / this.fftSize;
    };


}.call(this));
