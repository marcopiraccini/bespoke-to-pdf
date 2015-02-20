var fs = require('fs');
var screenshot = require('nw-shot');
var es = require('event-stream');
var line = require('line-stream');
var PDF = require('pdfkit');

function changeSlideMacro() { 
  location.hash = '#N'; 
}

function noTransitionsMacro() {
  var s  = document.createElement('style');
  s.innerHTML = ' * { -webkit-transition:none!important } ';
  document.body.appendChild(s);
}

function macro(fn) {
  return ';( ' + fn + ')();'
}

module.exports = function (url, slides, opts) {
  var doc = new PDF({
    size: opts.paperSize || opts.papersize || 'A4',
    layout: opts.orientation || 'landscape'
  });

  opts = opts || {};
  opts.slide = opts.slide || {};
  slides = slides || 1;

  var slideOpts = {width: opts.slide.width ||  1024-211};
  if (opts.slide.height) { slideOpts.height = opts.slide.height; }
  if (opts.slide.fit) { slideOpts = {fit: opts.slide.fit}; }
  if (opts.slide.scale) { slideOpts.scale = opts.slide.scale; }
  
  var slideLeft = 14.5 || opts.slide.left;
  var slideTop = 22 || opts.slide.top;
  var count = 0;
  var inject = macro(changeSlideMacro);

  inject = Array.apply(null, {length:slides+1})
    .map(Function.prototype.call, Number).slice(1)
    .map(function(n) { return inject.replace(/N/g, n); })

  inject[0] = macro(noTransitionsMacro) + inject[0];

  screenshot({
    url : url || 'http://localhost:8080/',
    width : opts.width || 1024 * 1.5,
    height : opts.height || 682 * 1.5,
    eval: inject,
    delay: opts.delay || 5,
    evalDelay: opts.slide.delay || 1,
    encoding: 'base64'
  })
  .pipe(line())
  .pipe(es.through(function(buffer) {
    count += 1;
    doc.image(buffer, slideLeft, slideTop, slideOpts);
    if (count < slides) doc.addPage()
  }, function end() {
    this.emit('end');
    doc.end()
  }));

  return doc;
}