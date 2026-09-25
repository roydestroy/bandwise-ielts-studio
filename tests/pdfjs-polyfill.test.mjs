import {test} from 'node:test';
import assert from 'node:assert/strict';
test('pdf.js polyfills match the proposals',async()=>{
  const saved=[Map,WeakMap].map(Type=>[Type,Type.prototype.getOrInsert,Type.prototype.getOrInsertComputed]);
  const sumPrecise=Math.sumPrecise;
  for(const [Type] of saved){delete Type.prototype.getOrInsert;delete Type.prototype.getOrInsertComputed;}
  delete Math.sumPrecise;
  try{
    await import('../lib/pdfjs-polyfill.mjs?fresh');
    const map=new Map([['a',1]]);
    assert.equal(map.getOrInsert('a',2),1);
    assert.equal(map.getOrInsert('b',3),3);
    let calls=0;
    assert.equal(map.getOrInsertComputed('c',key=>{calls++;return key+'!';}),'c!');
    assert.equal(map.getOrInsertComputed('c',()=>{calls++;return 0;}),'c!');
    assert.equal(calls,1);
    assert.throws(()=>map.getOrInsertComputed('d',null),TypeError);
    const key={},weak=new WeakMap();
    assert.deepEqual(weak.getOrInsertComputed(key,()=>[]),[]);
    assert.equal(weak.getOrInsertComputed(key,()=>0),weak.get(key));
    assert.equal(weak.getOrInsert(key,5),weak.get(key));
    assert.equal(Math.sumPrecise([1,2,3].values()),6);
    assert.equal(Math.sumPrecise([1e20,0.1,-1e20]),0.1);
    assert.ok(Object.is(Math.sumPrecise([]),-0));
    assert.equal(Math.sumPrecise([1,Infinity]),Infinity);
    assert.throws(()=>Math.sumPrecise(['1']),TypeError);
  }finally{
    if(sumPrecise)Object.defineProperty(Math,'sumPrecise',{configurable:true,writable:true,value:sumPrecise});
    for(const [Type,a,b] of saved){
      if(a)Object.defineProperty(Type.prototype,'getOrInsert',{configurable:true,writable:true,value:a});
      if(b)Object.defineProperty(Type.prototype,'getOrInsertComputed',{configurable:true,writable:true,value:b});
    }
  }
});
