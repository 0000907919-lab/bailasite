// QR Code puro JS — Reed-Solomon + módulos — versão compacta funcional
// Baseado no padrão ISO/IEC 18004, mode Byte, ECC Level M, versão auto

(function(root){
'use strict';

// ---- Galois Field GF(256) ----
var GF_EXP=new Uint8Array(512),GF_LOG=new Uint8Array(256);
(function(){var x=1;for(var i=0;i<255;i++){GF_EXP[i]=x;GF_LOG[x]=i;x<<=1;if(x&256)x^=285;}for(var i=255;i<512;i++)GF_EXP[i]=GF_EXP[i-255];})();
function gfMul(a,b){if(a===0||b===0)return 0;return GF_EXP[(GF_LOG[a]+GF_LOG[b])%255];}
function gfPoly(n){var p=[1];for(var i=0;i<n;i++){var q=[1,GF_EXP[i]];var r=new Uint8Array(p.length+q.length-1);for(var j=0;j<p.length;j++)for(var k=0;k<q.length;k++)r[j+k]^=gfMul(p[j],q[k]);p=Array.from(r);}return p;}
function rsEncode(data,eclen){var gen=gfPoly(eclen);var out=new Uint8Array(data.length+eclen);for(var i=0;i<data.length;i++)out[i]=data[i];for(var i=0;i<data.length;i++){var c=out[i];if(c!==0)for(var j=0;j<gen.length;j++)out[i+j]^=gfMul(gen[j],c);}return out.slice(data.length);}

// ---- Version/capacity tables (byte mode, ECC M) ----
// [version, total_codewords, data_codewords, ec_per_block, blocks]
var VERSIONS=[
  null,
  [1,26,16,10,1],[2,44,28,16,1],[3,70,44,26,1],[4,100,64,18,2],
  [5,134,86,24,2],[6,172,108,16,4],[7,196,124,18,4],[8,242,154,22,4],
  [9,292,182,22,5],[10,346,216,26,5],[11,404,254,30,5],[12,466,290,22,8],
  [13,532,334,22,8],[14,581,365,24,8],[15,655,415,24,8],[16,733,453,28,8],
  [17,815,507,28,8],[18,901,563,26,10],[19,991,627,26,10],[20,1085,669,34,10],
  [21,1156,714,34,10],[22,1258,782,26,12],[23,1364,860,26,12],[24,1474,914,30,12],
  [25,1588,1000,30,12],[26,1706,1062,28,14],[27,1828,1128,28,14],[28,1921,1193,30,14],
  [29,2051,1267,24,18],[30,2185,1373,24,18],[31,2323,1455,30,18],[32,2465,1541,24,20],
  [33,2611,1631,30,20],[34,2761,1725,24,22],[35,2876,1812,30,22],[36,3034,1914,24,24],
  [37,3196,1992,30,24],[38,3362,2102,26,26],[39,3532,2216,28,26],[40,3706,2334,28,26]
];

function getVersion(len){
  // len = bytes de dados (UTF-8)
  for(var v=1;v<=40;v++){
    var bits=4+8+8*len; // mode indicator + char count (byte mode v1-9: 8bits, v10-40: 16bits)
    if(v>=10) bits=4+16+8*len;
    var cap=VERSIONS[v][2]*8;
    if(bits+4<=cap) return v;
  }
  return 40;
}

// ---- Encode data codewords ----
function encodeData(text,version){
  var bytes=[];
  for(var i=0;i<text.length;i++){
    var c=text.charCodeAt(i);
    if(c<128){bytes.push(c);}
    else if(c<2048){bytes.push(0xC0|(c>>6));bytes.push(0x80|(c&63));}
    else{bytes.push(0xE0|(c>>12));bytes.push(0x80|((c>>6)&63));bytes.push(0x80|(c&63));}
  }
  var n=bytes.length;
  var ccBits=version<10?8:16;
  var bits=[];
  // mode = byte = 0100
  bits.push(0,1,0,0);
  for(var i=ccBits-1;i>=0;i--) bits.push((n>>i)&1);
  for(var i=0;i<n;i++) for(var j=7;j>=0;j--) bits.push((bytes[i]>>j)&1);
  var totalBits=VERSIONS[version][2]*8;
  // terminator
  for(var i=0;i<4&&bits.length<totalBits;i++) bits.push(0);
  while(bits.length%8) bits.push(0);
  // pad bytes
  var pads=[0xEC,0x11],pi=0;
  while(bits.length<totalBits){for(var j=7;j>=0;j--) bits.push((pads[pi]>>j)&1);pi^=1;}
  // bits to codewords
  var cw=[];
  for(var i=0;i<bits.length;i+=8){var b=0;for(var j=0;j<8;j++)b=(b<<1)|bits[i+j];cw.push(b);}
  return cw;
}

// ---- Interleave + EC ----
function buildFinal(cw,version){
  var vt=VERSIONS[version];
  var dcw=vt[2],ecpb=vt[3],blocks=vt[4];
  var blockSize=Math.floor(dcw/blocks);
  var extra=dcw%blocks;
  var dataBlocks=[],ecBlocks=[];
  var pos=0;
  for(var b=0;b<blocks;b++){
    var len=blockSize+(b>=blocks-extra?1:0);
    dataBlocks.push(cw.slice(pos,pos+len));
    ecBlocks.push(Array.from(rsEncode(new Uint8Array(cw.slice(pos,pos+len)),ecpb)));
    pos+=len;
  }
  var result=[];
  var maxLen=dataBlocks[dataBlocks.length-1].length;
  for(var i=0;i<maxLen;i++) for(var b=0;b<blocks;b++) if(i<dataBlocks[b].length) result.push(dataBlocks[b][i]);
  for(var i=0;i<ecpb;i++) for(var b=0;b<blocks;b++) result.push(ecBlocks[b][i]);
  return result;
}

// ---- Matrix ----
function makeMatrix(version){
  var size=version*4+17;
  var m=[];
  for(var i=0;i<size;i++){m.push(new Uint8Array(size));} // 0=light,1=dark,2=reserved
  return m;
}

function setFinder(m,r,c){
  for(var i=-1;i<=7;i++) for(var j=-1;j<=7;j++){
    var x=r+i,y=c+j;
    if(x<0||x>=m.length||y<0||y>=m.length) continue;
    var inSq=(i>=0&&i<=6&&j>=0&&j<=6);
    var onBorder=(i===0||i===6||j===0||j===6);
    var inner=(i>=2&&i<=4&&j>=2&&j<=4);
    m[x][y]=(inSq&&(onBorder||inner))?1:0;
    m[x][y]+=4; // mark reserved
  }
}

function setTiming(m){
  var size=m.length;
  for(var i=8;i<size-8;i++){
    m[6][i]=(i%2===0?5:4);
    m[i][6]=(i%2===0?5:4);
  }
}

function setAlignment(m,version){
  if(version<2) return;
  var pos=[
    [],[],[6,18],[6,22],[6,26],[6,30],[6,34],
    [6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],
    [6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],
    [6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],
    [6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],
    [6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]
  ];
  var ps=pos[version];
  for(var a=0;a<ps.length;a++) for(var b=0;b<ps.length;b++){
    var r=ps[a],c=ps[b];
    if(m[r][c]>=4) continue; // skip finder overlap
    for(var i=-2;i<=2;i++) for(var j=-2;j<=2;j++){
      var v=(i===-2||i===2||j===-2||j===2||( i===0&&j===0))?5:4;
      m[r+i][c+j]=v;
    }
  }
}

function setFormatReserved(m){
  var size=m.length;
  // horizontal strip row 8
  for(var i=0;i<=8;i++){if(m[8][i]<4) m[8][i]=4;}
  for(var i=size-8;i<size;i++){if(m[8][i]<4) m[8][i]=4;}
  // vertical strip col 8
  for(var i=0;i<=8;i++){if(m[i][8]<4) m[i][8]=4;}
  for(var i=size-7;i<size;i++){if(m[i][8]<4) m[i][8]=4;}
  // dark module
  m[size-8][8]=5;
}

function placeData(m,data){
  var size=m.length;
  var bits=[];
  for(var i=0;i<data.length;i++) for(var j=7;j>=0;j--) bits.push((data[i]>>j)&1);
  var bi=0,up=true;
  for(var c=size-1;c>=1;c-=2){
    if(c===6) c=5;
    for(var rr=0;rr<size;rr++){
      var r=up?size-1-rr:rr;
      for(var d=0;d<2;d++){
        var col=c-d;
        if(m[r][col]<4){
          m[r][col]=bi<bits.length?bits[bi++]:0;
        }
      }
    }
    up=!up;
  }
}

var MASK_FN=[
  function(r,c){return (r+c)%2===0;},
  function(r){return r%2===0;},
  function(r,c){return c%3===0;},
  function(r,c){return (r+c)%3===0;},
  function(r,c){return (Math.floor(r/2)+Math.floor(c/3))%2===0;},
  function(r,c){return (r*c)%2+(r*c)%3===0;},
  function(r,c){return ((r*c)%2+(r*c)%3)%2===0;},
  function(r,c){return ((r+c)%2+(r*c)%3)%2===0;}
];

function applyMask(m,mask){
  var size=m.length;
  for(var r=0;r<size;r++) for(var c=0;c<size;c++){
    if(m[r][c]<2 && MASK_FN[mask](r,c)) m[r][c]^=1;
  }
}

function writeFormat(m,version,mask){
  // ECC level M = 00, mask = mask (3 bits), format info
  var ecc=0; // M=00 in format string
  var data=(ecc<<3)|mask;
  var g=0b10100110111;
  var d=data<<10;
  for(var i=14;i>=10;i--) if(d&(1<<i)) d^=(g<<(i-10));
  var fmt=((data<<10)|d)^0b101010000010010;

  var size=m.length;
  var seq=[0,1,2,3,4,5,7,8];
  for(var i=0;i<8;i++){
    var bit=(fmt>>(14-i))&1;
    // row 8
    m[8][seq[i]]=(bit?5:4);
    // col 8
    m[seq[i]][8]=(bit?5:4);
  }
  // second copy
  for(var i=0;i<7;i++){
    var bit=(fmt>>i)&1;
    m[size-1-i][8]=(bit?5:4);
  }
  for(var i=0;i<8;i++){
    var bit=(fmt>>(7+i))&1;
    m[8][size-8+i]=(bit?5:4);
  }
}

function penalty(m){
  var size=m.length,score=0;
  // Rule 1: 5+ in row/col
  for(var r=0;r<size;r++){
    var run=1,last=m[r][0]&1;
    for(var c=1;c<size;c++){var v=m[r][c]&1;if(v===last){run++;}else{if(run>=5)score+=run-2;run=1;last=v;}}
    if(run>=5)score+=run-2;
  }
  for(var c=0;c<size;c++){
    var run=1,last=m[0][c]&1;
    for(var r=1;r<size;r++){var v=m[r][c]&1;if(v===last){run++;}else{if(run>=5)score+=run-2;run=1;last=v;}}
    if(run>=5)score+=run-2;
  }
  // Rule 2: 2x2
  for(var r=0;r<size-1;r++) for(var c=0;c<size-1;c++){
    var v=m[r][c]&1;
    if(v===(m[r][c+1]&1)&&v===(m[r+1][c]&1)&&v===(m[r+1][c+1]&1)) score+=3;
  }
  return score;
}

function encode(text){
  var version=getVersion(text.length);
  var cw=encodeData(text,version);
  var final=buildFinal(cw,version);
  var size=version*4+17;

  var bestMask=0,bestScore=Infinity,bestMatrix=null;

  for(var mask=0;mask<8;mask++){
    var m=makeMatrix(version);
    setFinder(m,0,0);setFinder(m,0,size-7);setFinder(m,size-7,0);
    setAlignment(m,version);setTiming(m);setFormatReserved(m);
    placeData(m,final);
    // Aplica máscara APENAS em células de dados (valor < 4 = não reservado)
    // Não normaliza antes — mantém >=4 como flag de reservado
    applyMask(m,mask);
    writeFormat(m,version,mask);
    // Normaliza tudo no final (reservado: >=4 -> -4; mascarado: pode ser 0,1,4,5)
    for(var r=0;r<size;r++) for(var c=0;c<size;c++){
      if(m[r][c]>=4) m[r][c]=m[r][c]-4;
    }
    var p=penalty(m);
    if(p<bestScore){bestScore=p;bestMask=mask;bestMatrix=m;}
  }
  return {matrix:bestMatrix,size:size,version:version};
}

function toSVG(text,px){
  var qr=encode(text);
  var size=qr.size;
  var quiet=4;
  var mod=Math.floor(px/(size+quiet*2));
  var total=mod*(size+quiet*2);
  var off=quiet*mod;
  var parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ',total,' ',total,'" width="',total,'" height="',total,'"><rect width="',total,'" height="',total,'" fill="#fff"/>'];
  for(var r=0;r<size;r++) for(var c=0;c<size;c++){
    if((qr.matrix[r][c]&1)===1){
      parts.push('<rect x="',(off+c*mod),'" y="',(off+r*mod),'" width="',mod,'" height="',mod,'" fill="#000"/>');
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

root.BaillaQR={toSVG:toSVG};
})(window);
