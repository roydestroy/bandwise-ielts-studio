// pdf.js 6 calls Map/WeakMap getOrInsert/getOrInsertComputed and Math.sumPrecise, which
// Safari and older Chromium lack. Loaded before pdf.js on the page and in its worker.
for(const Type of [Map,WeakMap]){
  const proto=Type.prototype;
  if(typeof proto.getOrInsert!=='function')Object.defineProperty(proto,'getOrInsert',{configurable:true,writable:true,
    value(key,value){if(!this.has(key))this.set(key,value);return this.get(key);}});
  if(typeof proto.getOrInsertComputed!=='function')Object.defineProperty(proto,'getOrInsertComputed',{configurable:true,writable:true,
    value(key,callback){if(typeof callback!=='function')throw new TypeError('callback is not a function');
      if(!this.has(key))this.set(key,callback(key));return this.get(key);}});
}
// Neumaier-compensated sum; pdf.js only sums byte lengths and widths, so this is exact enough.
if(typeof Math.sumPrecise!=='function')Object.defineProperty(Math,'sumPrecise',{configurable:true,writable:true,
  value(items){
    let sum=-0,compensation=0,count=0;
    for(const x of items){
      if(typeof x!=='number')throw new TypeError('Math.sumPrecise expects numbers');
      count++;
      const next=sum+x;
      compensation+=Math.abs(sum)>=Math.abs(x)?(sum-next)+x:(x-next)+sum;
      sum=next;
    }
    return count&&Number.isFinite(sum)?sum+compensation:sum;
  }});
