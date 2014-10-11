$(function() {

    //{
    //  lowColor:
    //  midColor:
    //  highColor:
    //  hangingMaxColor:
    //  hangTime:
    //  el: 
    //
    //}

    // should be given el; nbins; margin; colors
    // such that nbins divides fftSize/2
    var Canvas = this.Canvas = function(opts) {

        this.MAX_AMP = 300;
        this.nLevels = 12;

        _.extend(this, opts);

        if (!this.el) {
            console.log('Specify canvas element.');
            return;
        }

        this.$el = $(this.el);

        this.ctx = this.$el[0].getContext('2d');

        this.$el[0].width = this.width;
        this.$el[0].height = this.height;

        // one level is block in the spctrogramme
        this.levelHeight = (this.height - (this.nLevels-1) * this.hMargin) / this.nLevels;

        this.levelWidth = (this.width - (this.nBins-1) * this.wMargin) / this.nBins;

        // save previous bin max levels with timestamps
        // for soft hang effect
        this.previousMaxes = [];

        // populate
        for (var i = 0; i < this.nBins; i++) {
            this.previousMaxes.push([0, Date.now()]);
        }

    };

    Canvas.prototype.clear = function() { this.ctx.width = this.width; };

    Canvas.prototype.render = function(data) {

        var binSize = data.length / this.nBins;

        this.clear();

        var sum = data[0];
        for (var n = 1; n < data.length; n++) {
            if (n % binSize === 0) {
                this.drawLevels(n / binSize, -sum / binSize);
                sum = data[n];
            }

            sum += data[n];
        }

        this.drawLevels( binSize, -sum / binSize);

    };

    Canvas.prototype.drawLevels = function(n, amp) {
        // how many heights
        if (amp > this.MAX_AMP) amp = this.MAX_AMP;

        var nLevels = Math.floor(this.nLevels * amp / this.MAX_AMP);

        for (var i = 0; i < nLevels; i++) {
            if (i < this.nLevels/3) this.ctx.fillStyle = this.lowColor;
            else if (i < 2*this.nLevels/3) this.ctx.fillStyle = this.midColor;
            else this.ctx.fillStyle = this.highColor;
            this.drawLevel(n, i);
        }

        var now = Date.now();

        if (this.previousMaxes[n-1][0] > nLevels && now - this.previousMaxes[n-1][1] < this.hangTime) {
            this.ctx.fillStyle = this.hangingMaxColor;
            this.drawLevel(n-1, this.previousMaxes[n-1][0]);
        }
        else {
            this.previousMaxes[n-1] = [nLevels, now];
        }
    };

    // supposes you've set the right color already!
    Canvas.prototype.drawLevel = function(bin, level) {
        var y = this.height - this.levelHeight - level * ( this.levelHeight + this.hMargin);
        this.ctx.fillRect( bin * (this.levelWidth + this.wMargin),
                           y,
                           this.levelWidth,
                           this.levelHeight);
    };

    // for testing
    Canvas.prototype.fill = function() {
        for (var bin = 0; bin < this.nBins; bin++) {
            for (var level = 0; level < this.nLevels; level++) {
                if (level < this.nLevels/3) this.ctx.fillStyle = this.lowColor;
                else if (level < 2*this.nLevels/3) this.ctx.fillStyle = this.midColor;
                else this.ctx.fillStyle = this.highColor;

                this.drawLevel(bin, level);
            }
        }
    };


}.call(this));
