StockChart = function(canvas,stocks)
{
    var stockHistory = [];
    initStockHistory(stocks);
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    var self=this;
    var xAxisIndent=35; // Allows for axis labelling
    var yAxisIndent=15;
    var axisMargin=5;
    fixDPI(this.canvas);
    this.ctx.fillStyle = "#003200";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    drawStockGrid(self.ctx,canvas.width,canvas.height);
    
    this.draw=function(stocks)
    {  
        updateStockHistory(stocks);
        self.ctx.clearRect(xAxisIndent+axisMargin, yAxisIndent+axisMargin, this.canvas.width-2*(xAxisIndent+axisMargin), this.canvas.height-2*(yAxisIndent+axisMargin));
        for (var i=0;i<stocks.length;i++)
        {
            self.ctx.strokeStyle = stocks[i].colour;
            self.ctx.lineWidth = 4;
            self.ctx.beginPath();
            self.ctx.moveTo(axisMargin+1+xAxisIndent,canvas.height*(1-stockHistory[i*HISTORY_SIZE]/STOCK_MAX_VALUE)-yAxisIndent-axisMargin);
              
            for (var j=0;j<HISTORY_SIZE;j++)
            {
                var stkValue = stockHistory[i*HISTORY_SIZE+j];
                stkValue=Math.max(stkValue,STOCK_MIN_VALUE);
                stkValue=Math.min(stkValue,STOCK_MAX_VALUE);
                self.ctx.lineTo(axisMargin+1+xAxisIndent+j*(canvas.width-xAxisIndent-axisMargin)/HISTORY_SIZE,canvas.height*(1-stkValue/STOCK_MAX_VALUE)-yAxisIndent-axisMargin);
                self.ctx.stroke();
            }
        };
    }

    function drawStockGrid(ctx,width,height)
    {
        ctx.strokeStyle = "#4CAF50";
        ctx.lineWidth = .5;
        ctx.beginPath();
        ctx.moveTo(width-xAxisIndent,yAxisIndent);
        ctx.lineTo(width-xAxisIndent,height-yAxisIndent);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(xAxisIndent,yAxisIndent);
        ctx.lineTo(xAxisIndent,height-yAxisIndent);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(xAxisIndent,height-yAxisIndent);
        ctx.lineTo(width-xAxisIndent,height-yAxisIndent);
        ctx.stroke();

        for (var i=0;i<=STOCK_MAX_VALUE;i+=50) // y-axis shows increments of 50
        {
            ctx.beginPath();
            ctx.moveTo(width-xAxisIndent+5,Math.floor(height*(i/STOCK_MAX_VALUE)));
            ctx.strokeText(STOCK_MAX_VALUE-i,width-25,Math.floor(height*(i/STOCK_MAX_VALUE))-yAxisIndent);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xAxisIndent-20,height*(i/STOCK_MAX_VALUE));
            ctx.strokeText(STOCK_MAX_VALUE-i,15,height*(i/STOCK_MAX_VALUE)-yAxisIndent);
            ctx.stroke();
        }
    }

    function initStockHistory(stocks)
    {
        for (var i=0;i<stocks.length;i++)
        {
            for (var j=0;j<HISTORY_SIZE;j++)
            {
                stockHistory.push(stocks[i].price);
            }
        }
    }
    
    function updateStockHistory(stocks)
    {
        for (var i=0;i<stocks.length;i++)
        {
            for (var j=0;j<HISTORY_SIZE-1;j++)
            {
                stockHistory[i*HISTORY_SIZE+j]=stockHistory[i*HISTORY_SIZE+j+1];
            }
            stockHistory[i*HISTORY_SIZE+HISTORY_SIZE-1]=stocks[i].price;
         }
    }

    function fixDPI(canvas)
    {
        var dpi = window.devicePixelRatio;
        var style_height = +getComputedStyle(canvas).getPropertyValue("height").slice(0, -2);
        var style_width = +getComputedStyle(canvas).getPropertyValue("width").slice(0, -2);
        canvas.setAttribute('height', style_height * dpi);
        canvas.setAttribute('width', style_width * dpi);
    }
}