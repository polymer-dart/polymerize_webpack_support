'use strict';
var transform = require('babel-core').transform;
var traverse = require('babel-core').traverse;
var getOptions = require('loader-utils').getOptions;
var template = require('babel-core').template;
var t = require('babel-core').types;
var transformFromAst = require('babel-core').transformFromAst;
var path = require('path');

var DEFINE_MATCH = /define\(\[([^\]]*)\],(.*)/g;

var TEMPLATE = template(
  `define(DEPS,function(ARGS){
  let factory = BODY;
  var exports = CALL_FACTORY;
  INIT
  // Execute after code
  return exports;
})`
);

module.exports = function(res, sourceMap) {
  //this.exec('console.log("hi");');
  var opt = this.options;
  var relPath = this.resourcePath;
  relPath = path.resolve(path.dirname(relPath), path.basename(relPath, '.js'));
  relPath = path.relative(opt.context, relPath);
  var ast = transform(res, {
    babelrc: false,
    code: false,
    compact: false,
    filename: this.resourcePath,
  }).ast;

  //console.log("AST : " + ast);

  var dependencies = [];
  var factory;
  traverse(ast, {
    CallExpression: function(path) {
      if (t.isIdentifier(path.node.callee, {
          name: 'define'
        })) {
        //console.log(path.node.arguments[0]);
        dependencies = path.node.arguments[0].elements.map(function(x) {
          return x.value;
        });
        factory = path.node.arguments[1];
        path.skip();
      }
    }
  });

  //console.log("DEPS: " + dependencies);
  var loaderOptions = getOptions(this);

  var toAdd;
  if ((toAdd = loaderOptions.polymerize_loader[relPath])) {
    Array.prototype.push.apply(dependencies, toAdd.map(function(dep) {
      //return dep;

      // Use html loader instead of html import
      return dep.replace('polymerize_require/htmlimport!',
        'null-loader!');
    }));
    //console.log('ADDING DEPS FOR ' + relPath + " => " + dependencies);
    //dependencies.push('packages/html5/src/js/defs');
  }

  var init = t.noop();
  var initCalls = loaderOptions.polymerize_init[relPath];
  if (initCalls) {
    init = t.callExpression(
      t.memberExpression(
        t.memberExpression(t.identifier('exports'), t.identifier(initCalls[
          0])),
        t.identifier(initCalls[1])), []);
    //init = "exports." + initCalls[0] + "." + initCalls[1] + "();";
  }


  //dependencies.push('cicciolo');

  var dependenciesAst = t.arrayExpression(
    dependencies.map(function(s) {
      return t.stringLiteral(s);
    })
  );

  var newAst = t.file(
    t.program([
      TEMPLATE({
        DEPS: dependenciesAst,
        BODY: factory,
        ARGS: factory.params,
        INIT: init,
        CALL_FACTORY: t.callExpression(t.identifier('factory'), factory
          .params
          .map(function(p) {
            return t.identifier(p.name);
          })),
      })
    ]));
  //console.log(factory);
  //console.log('NEW AST DONE');

  //console.log("DEPS AFTER AST : " + dependenciesAst);

  var result = transformFromAst(newAst, res, {
    sourceMaps: this.sourceMap,
    sourceFileName: this.resourcePath,
    sourceMap,
    babelrc: false,
    compact: false,
    filename: this.resourcePath,
  });

  //console.log("new File : " + result.code);
  // result.map is the sourcemap data
  return result.code;
}
