module.exports = function(config) {
  config.set({
    mutator: "javascript",
    packageManager: "yarn",
    reporters: ["html", "progress"],
    testRunner: "jest",
    transpilers: ["babel"],
    coverageAnalysis: "off",
    mutate: ["src/**/*.js"],
    babelrcFile: ".babelrc"
  });
};
