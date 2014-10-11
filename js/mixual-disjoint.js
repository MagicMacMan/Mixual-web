$(function() {

    var Canvas = this.Canvas;

    var DiffSpect = this.DiffSpect = function(opts) {
        Canvas.call(this, opts);

        this.MAX_AMP = 100;
    }

    DiffSpect.prototype = Object.create(this.Canvas.prototype);

    DiffSpect.prototype.render = function(data1, data2) {

        var data = [];

        for (var i = 0; i < _.min([data1.length, data2.length]); i++) {
            data.push(data1[i] - data2[i]);
        }

        Canvas.prototype.render.call(this, data);

    };

    DiffSpect.prototype.drawLevels = function(bin, amp) {

        if (Math.abs(amp) > this.MAX_AMP) {
            if (amp > 0) amp = this.MAX_AMP;
            else amp = -this.MAX_AMP;
        }
        var nLevels = Math.floor((this.nLevels/2) * Math.abs(amp) / this.MAX_AMP);

        var sign = amp > 0 ? 1 : -1;

        for (var level = 0; level < Math.abs(nLevels); level++) {
            this.setLevelColor(level);
            this.drawLevel(bin, sign*level);
        }

        if (amp < 0) nLevels *= -1;

        var now = Date.now();

        if ( ( (this.previousMaxes[bin][0] * nLevels > 0 && this.previousMaxes[bin][0] >= nLevels) 
                    || (this.previousMaxes[bin][0] * nLevels < 0 && this.previousMaxes[bin][0] <= nLevels) )
            && now - this.previousMaxes[bin][0] < this.hangTime ) {
            this.ctx.fillStyle = this.hangingMaxColor;
            this.drawLevel(bin, this.previousMaxes[bin][0]);
        }
        else {
            if (amp > 0) this.previousMaxes[bin] = [nLevels-1, now];
            else this.previousMaxes[bin] = [nLevels+1, now];
        }

    };

    DiffSpect.prototype.drawLevel = function(bin, level) {
        var yBaseline = this.height/2;
        var y = yBaseline - this.levelHeight - level * ( this.levelHeight + this.hMargin )

        this.ctx.fillRect( bin * (this.levelWidth + this.wMargin),
                           y,
                           this.levelWidth,
                           this.levelHeight);

    };

}.call(this));