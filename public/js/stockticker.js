StockTicker = function()
{
    const TICKER_DIV_PREFIX="TICKER_";
    const TICKER_SPACING=550;
    const TICKER_TIMER=10;
    const TICKER_FONT_SIZE = 60;
    const TICKER_FONT_NAME = "courier";

    var divPos = [];
    var stocks;
    var tickerTimer;

    this.initTickers= function(aTickerElem,stocks)
    {
        if (tickerTimer !=null)
            clearInterval(tickerTimer);
        var html="";
        for (var i=0;i<stocks.length;i++)
        {
            html+="<div id='"+TICKER_DIV_PREFIX+stocks[i].name+"' style='position:absolute;'"+"></div>";
        }
        document.getElementById(aTickerElem).innerHTML=html;
        for (var i=0;i<stocks.length;i++)
        {
            divPos[i]=window.innerWidth+i*TICKER_SPACING;
            document.getElementById(TICKER_DIV_PREFIX+stocks[i].name).style.left = divPos[i] + 'px';
            document.getElementById(TICKER_DIV_PREFIX+stocks[i].name).style.top = document.getElementById(aTickerElem).style.top/2;
        }
        tickerTimer=setInterval(this.animateTickers,TICKER_TIMER);
    }
    
    this.loadTickers=function(aStocks)
    {
        stocks=aStocks;
        for (var i=0;i<stocks.length;i++)
        {
            var priceDisplay = addText(stocks[i].price.toFixed(2),stocks[i].trend >=0?"#00FF00":"#FF0000");
            var stockNameDisplay = addText(stocks[i].name,stocks[i].colour);
            var tickerHTML=(stockNameDisplay+addText("&colon;","black")+priceDisplay)+addText("&nbsp;&nbsp;","black");
            document.getElementById(TICKER_DIV_PREFIX+stocks[i].name).innerHTML=tickerHTML;
        };
    }

    this.animateTickers=function()
    {
        for (var i=0;i<stocks.length;i++)
        {
            document.getElementById(TICKER_DIV_PREFIX+stocks[i].name).style.left = divPos[i] + 'px';

            divPos[i]--;
            if (divPos[i] < -TICKER_SPACING)
            {
                var newPos=(stocks.length+1)*TICKER_SPACING;
                if (newPos < window.innerWidth)
                    newPos=window.innerWidth;
                divPos[i]=newPos;
            }
        }
    }
     
    function addText(text,fontColour)
    {
        return "<font style='font-size:"+TICKER_FONT_SIZE+"px' color='"+fontColour+"' face='"+TICKER_FONT_NAME+"'>"+text+"</font>";
    }
}