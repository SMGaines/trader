NewsPaperChart = function()
{
    var rotationAngle = 0;
    var animationScale = 0;
    var newsObject;

    this.initNewsStory = function(monthEvent)
    {
        console.log("newsStory: "+monthEvent.type);
        rotating=false;
        rotationAngle=0;
        animationScale=.01;
        createNewsPaper(monthEvent);
        newsObject = document.getElementById("newsDisplay");
        newsObject.style.display="block"; //visibility='visible';
        if (monthEvent.isFinalEvent)
        {
            document.getElementById("newsGameOver").play();
        }
        else if (monthEvent.isTaxReturn)
        {   
            document.getElementById("taxReturn").play();
        }
        else if (monthEvent.goodNews)
        {   
            document.getElementById("goodNews").play();
        }
        else
        {
            document.getElementById("badNews").play();
        }
        animateNewsStory(monthEvent.isFinalEvent);
    }

    animateNewsStory = function(isFinalEvent)
    {
        if (rotationAngle < 1060)
        {
            spinIn(animationScale,rotationAngle);
            rotationAngle+=30;
            animationScale+=.015;
            setTimeout(animateNewsStory,50);
        }
        else
        {
            setTimeout(hideNews,isFinalEvent?10000:5000);
        }
    }

    function hideNews()
    {
        newsObject.style.display="none"; //visibility='hidden';
        rotationAngle=0;
        animationScale=.01;
    }

    function createNewsPaper(event)
    {
        document.getElementById("newsDate").innerHTML=getLongDate(new Date(event.date));
        document.getElementById("newsHeadline").innerHTML=event.headLine;
        document.getElementById("newsTagline").innerHTML=event.tagLine;
    }

    function spinIn(scale,deg)
    {
        newsObject.style.transform = "scale("+scale+","+scale+")";  
        newsObject.style.transform += "rotate("+deg+"deg)";
    }
}