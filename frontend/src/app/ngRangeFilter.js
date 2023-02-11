// Copied from MIT lib `https://github.com/Zertz/ng-range-filter`.
// We added a `;` at the end so our appended libraries aren't broke

function range () {
  return function (input) {
    var lowBound, highBound

    if (!input) {
      return null
    }

    switch (input.length) {
      case 1:
        lowBound = 0
        highBound = parseInt(input[0], 10) - 1
        break
      case 2:
        lowBound = parseInt(input[0], 10)
        highBound = parseInt(input[1], 10)
        break
      default:
        return input
    }

    var result = []

    if (lowBound < highBound) {
      for (var i = lowBound; i <= highBound; i++) {
        result.push(i)
      }
    } else {
      for (var j = lowBound; j >= highBound; j--) {
        result.push(j)
      }
    }

    return result
  }
}

angular.module('ngRangeFilter', []).filter('range', range);
