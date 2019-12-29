StockTicker = function()
{
    var tickerElem;
    var tickerHTML;
    var left;
    var htmlLength;

    this.initTicker= function(aTickerElem)
    {
        tickerElem=aTickerElem;
        left=window.innerWidth;
        timer=setInterval(this.animateTicker,10);
    }

    this.createTicker=function(aTickerElem,stocks)
    {
        tickerHTML="<span id='ticker'>";
        for (var i=0;i<stocks.length;i++)
        {
            var priceDisplay,stockNameDisplay;
            if (stocks[i].suspensionDays > 0)
            {
                priceDisplay = addText(stocks[i].price.toFixed(2),"courier",7,"black");
                stockNameDisplay = addText(stocks[i].name,"courier",7,"black");
            }
            else
            {
                priceDisplay = addStockText(stocks[i].price.toFixed(2),stocks[i].trend >=0);
                stockNameDisplay = addText(stocks[i].name,"courier",7,"black");
            }
            tickerHTML+=(stockNameDisplay+addText("&colon;","courier",7,"black")+priceDisplay)+addText("&nbsp;&nbsp;","courier",7,"black");
        };
        tickerHTML+="</span>";
        document.getElementById(aTickerElem).innerHTML=tickerHTML;
        htmlLength=document.getElementById("ticker").clientWidth;
        console.log(htmlLength);
    }
     this.animateTicker=function()
     {
        document.getElementById(tickerElem).style.left = left + 'px';
        left--;
        if (left < -window.innerWidth)
        {
            left=window.innerWidth;
        }
     }
     
    function addText(text,fontName,fontSize,fontColour)
    {
        return "<font color='"+fontColour+"' size='"+fontSize+"' face='"+fontName+"'>"+text+"</font>";
    }

    function addStockText(text,risingPrice)
    {
        return addText(text,"courier",FONT_SIZE,risingPrice?"#00FF00":"#FF0000");
    }
}