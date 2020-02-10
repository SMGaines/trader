StockChart = function(canvas)
{
    console.log("Canvas: W:"+canvas.width+" / Height: "+canvas.height);
    var stockHistory = [];
    //initStocksHistory(stocks);
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    var self=this;
    var xAxisIndent=90; // Allows for axis labelling
    var yAxisIndent=15;
    var axisMargin=5;
    fixDPI(this.canvas);
    this.ctx.fillStyle = "#003200";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    drawStockGrid(self.ctx,canvas.width,canvas.height);
    
    this.draw=function(stocks)
    {  
        updateStockHistory(stocks);
        var tickStart=axisMargin+xAxisIndent;
        var tickWidth=(this.canvas.width-2*tickStart)/HISTORY_SIZE;
        self.ctx.clearRect(tickStart-2, 0, this.canvas.width+4-2*tickStart, this.canvas.height-yAxisIndent-5);
        for (var i=0;i<stocks.length;i++)
        {
            self.ctx.beginPath();
            self.ctx.strokeStyle = stocks[i].colour;
            self.ctx.lineWidth = 2;
            self.ctx.moveTo(tickStart,this.canvas.height*(1-stockHistory[i*HISTORY_SIZE]/STOCK_MAX_VALUE)-yAxisIndent-axisMargin);
            
            for (var j=0;j<HISTORY_SIZE;j++)
            {
                var stkValue = stockHistory[i*HISTORY_SIZE+j];
                stkValue=Math.max(stkValue,STOCK_MIN_VALUE);
                stkValue=Math.min(stkValue,STOCK_MAX_VALUE);
                self.ctx.lineTo(tickStart+(j+1)*tickWidth,
                                this.canvas.height*(1-stkValue/STOCK_MAX_VALUE)-yAxisIndent-axisMargin);
            }
            self.ctx.stroke();
        };
    }

    this.updateStocks=function(stocks)
    {
        var expectedStocksinStockHistory = stocks.length;
        var actualStocksinStockHistory = stockHistory.length/HISTORY_SIZE;
        for (var i=actualStocksinStockHistory;i<expectedStocksinStockHistory;i++)
        {
            initStockHistory(stocks[i]);
        }
    }

    function drawStockGrid(ctx,width,height)
    {
        ctx.strokeStyle = "#4CAF50";
        ctx.font="30px Courier";
        ctx.lineWidth = 2;
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

        ctx.strokeStyle="#FFFFFF";
    
        for (var i=0;i<=STOCK_MAX_VALUE;i+=100) // y-axis shows increments of 100
        {
            ctx.strokeText(STOCK_MAX_VALUE-i,width-xAxisIndent+10,Math.floor(height*(i/STOCK_MAX_VALUE))-yAxisIndent);
            ctx.strokeText(STOCK_MAX_VALUE-i,15,height*(i/STOCK_MAX_VALUE)-yAxisIndent);
        }
    }

    function initStocksHistory(stocks)
    {
        for (var i=0;i<stocks.length;i++)
        {
            initStockHistory(stocks[i]);   
        }     
    }
    
    function initStockHistory(stock)
    {
        for (var j=0;j<HISTORY_SIZE;j++)
        {
            stockHistory.push(stock.price);
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