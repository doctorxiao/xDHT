var http=require('http');
var bencode=require("bencode");
var dgram=require('dgram');
var ids=new Array();
var nodes=new Array();
var finders=new Array();
var nodenum=0;

function listen4msg(port)
{
    var s = dgram.createSocket('udp4');
	s.bind(port, function() {
    });
	s.on('message', function(msg, rinfo) {
        try
        {
		    handelmsg(msg,rinfo,s);
        }
        catch (error)
        {
            //console.log("1:"+error);
            error=null;
        }
        msg=null;
        rinfo=null;	
    });
	for(var i=0;i<256;i++)
	{
	    nodes[port-6000][i]=new Array();
	}
	var tobesend={};
    tobesend.t=randomString(10);
    tobesend.y="q";
    tobesend.q="find_node";
    tobesend.a={};
    tobesend.a.id=ids[port-6000];
    tobesend.a.target=randomBuffer();
    var sendbuffer=new Buffer(bencode.encode(tobesend));
    finders[port-6000].push(DHTfinder(tobesend.a.target,tobesend.t));
	s.send(sendbuffer,0,sendbuffer.length,6881,'dht.transmissionbt.com');
	s.send(sendbuffer,0,sendbuffer.length,6881,'router.bittorrent.com');
	i=null;
	tobesend=null;
}

function handelmsg(msg,rinfo,s)
{
    //console.log(msg);
	//var buf=tool.randomBuffer(10);
	//s.send(buf,0,10,rinfo.port,rinfo.address);
	//console.log(rinfo);
	msgobj=bencode.decode(msg);
	if (typeof(msgobj.y)!="undefined" && msgobj.y=="q")
    {
    	handelquery(msgobj,rinfo,s);
    }
    if (typeof(msgobj.y)!="undefined" && msgobj.y=="r")
    {
    	handelresponse(msgobj,rinfo,s);
    }
    if (typeof(msgobj.y)!="undefined" && msgobj.y=="c")
    {
        handelcheck();
    }
	msg=null;
    msgobj=null;
	rinfo=null;
	s=null;
}


function handelquery(msgobj,rinfo,s)
{
    if (typeof(msgobj.q)!="undefined" && msgobj.q=="ping")
    {
        handelqueryping(msgobj,rinfo,s);
    }
    if (typeof(msgobj.q)!="undefined" && msgobj.q=="find_node")
    {
        handelqueryfind(msgobj,rinfo,s);
    }
    if (typeof(msgobj.q)!="undefined" && msgobj.q=="get_peers")
    {
        handelqueryget(msgobj,rinfo,s);
    }
    if (typeof(msgobj.q)!="undefined" && msgobj.q=="announce_peer")
    {
        handelqueryanno(msgobj,rinfo,s);
    }
	msgobj=null;
	rinfo=null;
	s=null;
}

function handelresponse(msgobj,rinfo,s)
{
    if (typeof(msgobj.r.nodes)!="undefined")
    {
        handelresponsefind(msgobj,s);
    }
	msgobj=null;
	rinfo=null;
	s=null;
}

function handelqueryping(msgobj,rinfo,s)
{
    var sendobj={t:msgobj.t,y:"r",r:{id:ids[s.address().port-6000]}};
    var b=new Buffer(bencode.encode(sendobj));
	s.send(b,0,b.length,rinfo.port,rinfo.address);
    sendobj=null;
    b=null;
    msgobj=null;
    rinfo=null;
	s=null;
}

function handelqueryfind(msgobj,rinfo,s)
{
    //console.log(s.address().port+":find");
    var target=msgobj.a.target;
    var head=target[0];
    var re={};
	var xh=s.address().port-6000;
    re.t=msgobj.t;
    re.y="r";
    re.r={};
    re.r.id=ids[xh];
	re.r.nodes=Buffer.concat(nodes[xh][head]);
    var b=new Buffer(bencode.encode(re));
	s.send(b,0,b.length,rinfo.port,rinfo.address);
    target=null;
	head=null;
	re=null;
	xh=null;
	b=null;
	i=null;
	msgobj=null;
	rinfo=null;
	s=null;
}

function handelqueryget(msgobj,rinfo,s)
{
    var target=msgobj.a.info_hash;
	//recordhash("get:",target);
    var head=target[0];
    var re={};
	var xh=s.address().port-6000;
    re.t=msgobj.t;
    re.y="r";
    re.r={};
    re.r.id=ids[xh];
	re.r.token=randomString(8);
	re.r.nodes=Buffer.concat(nodes[xh][head]);
    var b=new Buffer(bencode.encode(re));
	s.send(b,0,b.length,rinfo.port,rinfo.address);
    target=null;
	head=null;
	re=null;
	xh=null;
	b=null;
	i=null;
	msgobj=null;
	rinfo=null;
	s=null;
}

function handelqueryanno(msgobj,rinfo,s)
{
    var target=msgobj.a.info_hash;
	recordhash(s.address().port+":anno:",target);
    var sendobj={t:msgobj.t,y:"r",r:{id:ids[s.address().port-6000]}};
    var b=new Buffer(bencode.encode(sendobj));
    s.send(b,0,b.length,rinfo.port,rinfo.address);
	target=null;
	sendobj=null;
	b=null;
	msgobj=null;
	rinfo=null;
	s=null;
}

function handelresponsefind(msgobj,s)
{
    var transactID=msgobj.t;
	var xh=s.address().port-6000;
    for (var j in finders[xh])
    {
        if (finders[xh][j].transactID==transactID)
        {
            var nodesstr=msgobj.r.nodes;
            var i=1;
            while (i*26<=nodesstr.length)
            {   
                var nodenowstr=new Buffer(26);
                nodesstr.copy(nodenowstr,0,(i-1)*26,i*26);
                var nodenow=DHTnode(nodenowstr);
                var head=nodenowstr.readUInt8(0);
                var flag=false;
                if (nodenow.ip=="107.170.214.39")
                {
                    flag=true;
                }
                for (var t in nodes[xh][head])
                {
                    if (DHTnode(nodes[xh][head][t]).ip==nodenow.ip && DHTnode(nodes[xh][head][t]).port==nodenow.port)
                    {
                        flag=true;
                        break;
                    }
                }
                if (!flag)
                {
				    if (nodes[xh][head].length>=8)
					{
					    nodes[xh][head].shift();
					}  else
					{
					    nodenum++;
						console.log(nodenum);
					}
					nodes[xh][head].push(nodenowstr);
                    var tobesend={};
                    tobesend.t=transactID;
                    tobesend.y="q";
                    tobesend.q="find_node";
                    tobesend.a={};
                    tobesend.a.id=ids[xh];
                    tobesend.a.target=finders[xh][j].targetID;
                    var sendbuffer=new Buffer(bencode.encode(tobesend));
                    s.send(sendbuffer,0,sendbuffer.length,nodenow.port,nodenow.ip);
                    tobesend=null;
                    sendbuffer=null;
					t=null;
                }
                nodenowstr=null;
                nodenow=null;
                head=null;
                flag=null;
                i++;
            } 
            i=null;
            nodesstr=null; 
        }
    }
    j=null; 
    transactID=null;
	xh=null;
	msgobj=null;
	s=null;
}

function DHTnode(str){
	var n = new Object();
	n.ip="";
	n.port=0;
	n.ip=str.readUInt8(20)+".";
	n.ip+=str.readUInt8(21)+".";
	n.ip+=str.readUInt8(22)+".";
	n.ip+=str.readUInt8(23);
	n.port=256*str.readUInt8(24)+str.readUInt8(25);
	return n;
}

function recordhash(source,hash)
{
    var hashhex=buffer2hex(hash);
	console.log(source+hashhex);
	hashhex=null;
	hash=null;
	source=null;
}

function randomString(len) {
　　len = len || 32;
　　var xchars = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijklmnoprstuvwxyz1234567890';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
　　var maxPos = xchars.length;
　　var pwd = '';
　　for (var i = 0; i < len; i++) {
　　　　pwd += xchars.charAt(Math.floor(Math.random() * maxPos));
　　}
    len=null;
    xchars=null;
    maxPos=null;
	i=null;
　　return pwd;
}

function randomBuffer(len) {
　　len = len || 20;
    var buf=new Buffer(len);
　　for (var i = 0; i < len; i++) {
　　　　buf.writeUInt8(Math.round(Math.random()*255),i);
　　}
    len=null;
	i=null;
　　return buf;
}

function buffer2hex(buf)
{
	var s="";
	for(var i=0;i<buf.length;i++)
	{
		var j=buf.readUInt8(i);
		if (j<16)
		{
			s+="0"+j.toString(16);
		} else
		{
			s+=j.toString(16);
		}
	}
	i=null;
	j=null;
	return s;
}

function hex2buffer (hex) {
	var i=0;
	var buf=new Buffer(Math.round(hex.length/2));
	while (i<hex.length)
	{
		var numberi=parseInt(hex[i],16)*16;
		if ((i+1)<hex.length)
		{
			numberi+=parseInt(hex[i+1],16);
		}
		console.log(numberi);
		buf.writeUInt8(numberi,i/2);
		i=i+2;
	}
	i=null;
	hex=null;
	return buf;
}


function DHTfinder(target,transactID){
	var f = new Object();
	f.scaned=new Array();
	f.transactID=transactID;
	f.targetID=target;
	f.lastAdd=Date.parse(new Date());
	target=null;
	transactID=null;
	return f;
}

for(var i=0;i<200;i++)
{
    ids.push(randomBuffer(20));
	finders.push(new Array());
	nodes.push(new Array(256));
    listen4msg(6000+i);
}

