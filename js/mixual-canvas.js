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

        this.MAX_AMP = 200;
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

    Canvas.prototype.clear = function() { this.$el[0].width = this.width; };

    Canvas.prototype.render = function(data) {

        var binSize = data.length / this.nBins;

        this.clear();

        // we will call drawLevels for every 
        // n = 1, ..., binSize
        // since previousMaxes.length = binSize - 1, we need to 
        // remember to n-1 later on

        var sum = data[0];
        for (var n = 1; n < data.length; n++) {
            if (n % binSize === 0) {
                this.drawLevels((n / binSize) - 1, sum / binSize);
                sum = data[n];
            }

            sum += data[n];
        }

        this.drawLevels( this.nBins - 1, -sum / binSize);

    };

    Canvas.prototype.drawLevels = function(bin, amp) {
        // how many heights
        if (amp > this.MAX_AMP) amp = this.MAX_AMP;

        var nLevels = Math.floor(this.nLevels * amp / this.MAX_AMP);

        for (var level = 0; level < nLevels; level++) {
            this.setLevelColor(level);
            this.drawLevel(bin, level);
        }

        var now = Date.now();

        if (this.previousMaxes[bin][0] >= nLevels && now - this.previousMaxes[bin][1] < this.hangTime) {
            this.ctx.fillStyle = this.hangingMaxColor;
            this.drawLevel(bin, this.previousMaxes[bin][0]);
        }
        else { 
            this.previousMaxes[bin] = [nLevels-1, now];
        }
    };

    // supposes you've set the right color already!
    Canvas.prototype.drawLevel = function(bin, level) {
        var y = this.height - this.levelHeight - level * ( this.levelHeight + this.hMargin );
        this.ctx.fillRect( bin * (this.levelWidth + this.wMargin),
                           y,
                           this.levelWidth,
                           this.levelHeight);
    };

    Canvas.prototype.setLevelColor = function(level) {
        if (Math.abs(level) < this.nLevels/3) this.ctx.fillStyle = this.lowColor;
        else if (Math.abs(level) < 2*this.nLevels/3) this.ctx.fillStyle = this.midColor;
        else this.ctx.fillStyle = this.highColor;
    };

    // for testing
    Canvas.prototype.fill = function() {
        for (var bin = 0; bin < this.nBins; bin++) {
            for (var level = 0; level < this.nLevels; level++) {
                this.setLevelColor(level);
                this.drawLevel(bin, level);
            }
        }
    };

    Canvas.prototype.renderPlayButton = function() {

        var height = 40, width = 33;

        this.clear();

        this.ctx.fillStyle = this.lowColor;

        this.ctx.beginPath();
        // top left
        this.ctx.moveTo( this.width/2 - width/2,
                         this.height/2 - height/2 );

        this.ctx.lineTo( this.width/2 - width/2,
                         this.height/2 + height/2 );

        this.ctx.lineTo( this.width/2 + width/2,
                         this.height/2 );

        this.ctx.closePath();
        this.ctx.fill();
    };


}.call(this));
