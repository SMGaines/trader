NewsPaperChart = function()
{
    var rotationAngle = 0;
    var animationScale = 0;

    this.initNewsStory = function(monthEvent)
    {
        console.log("newsStory: "+monthEvent.stockName+" = "+monthEvent.type);
        rotating=false;
        rotationAngle=0;
        animationScale=.01;
        document.getElementById("newsDisplay").style.visibility='visible';
        createNewsPaper(monthEvent);
        if (monthEvent.isFinalEvent)
        {
            document.getElementById("newsGameOver").play();
        }
        else
        {   
            document.getElementById("newsIntro").play();
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
        document.getElementById("newsDisplay").style.visibility='hidden';
        rotationAngle=0;
        animationScale=.01;
    }

    function getFillerText()
    {
        return  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin nibh augue, suscipit a, scelerisque sed, lacinia in, mi."+
                "Cras vel lorem. Etiam pellentesque aliquet tellus. Phasellus pharetra nulla ac diam. Quisque semper justo at risus."+
                "Donec venenatis, turpis vel hendrerit interdum, dui ligula ultricies purus, sed posuere libero dui id orci."+
                "Nam congue, pede vitae dapibus aliquet, elit magna vulputate arcu, vel tempus metus leo non est."+
                "Etiam sit amet lectus quis est congue mollis. Phasellus congue lacus eget neque."+
                "Phasellus ornare, ante vitae consectetuer consequat, purus sapien ultricies dolor, et mollis pede metus eget nisi."+
                " Praesent sodales velit quis augue. Cras suscipit, urna at aliquam rhoncus, urna quam viverra nisi, in interdum massa nibh nec erat";
    }

    function createNewsPaper(event)
    {
        newspaperObject=document.getElementById("newsDisplay");

        var html="<div class='head'>";
        html+="<header>Daily Planet</header>";
        html+="<div class='subhead'>Kraków, Poland - "+getLongDate(new Date(event.date)) +" - Seven Pages</div>";
        html+="</div>";
        html+="<div class='content'><div class='collumns'>";
        html+="<div class='collumn'><div class='head'><span class='headline hl1'>"+event.headLine+"</span><p><span class='headline hl2'>"+event.tagLine+"</span>";
        html+="</p></div>";
        html+="<div class='subcollumn'>"+getFillerText()+"</div>";    
        html+="<div class='subcollumn'><img src='images/nyse.jpg'></div>";    
        html+="<div class='subcollumn'>"+getFillerText()+"</div>";    
        html+="</div></div>";
        newspaperObject.innerHTML=html;
    }

    function spinIn(scale,deg)
    {
        newspaperObject.style.transform = "scale("+scale+","+scale+")";  
        newspaperObject.style.transform += "rotate("+deg+"deg)";
    }
}