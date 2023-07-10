## Display CLEAR/OUR permitted uses in Primo - EXPERIMENTAL

This is an **experimental** module to dynamically replace hyperlinks to permitted uses records managed by
the OCUL Usage Rights (OUR) service (rebranded as CLEAR for Ontario colleges) with a visual summary.

Once enabled, electronic resources in your catalog should look like this:

![Screenshot of the permitted uses module enabled on the Primo interface](clear-display-screenshot.png)

### How to enable the module

To enable this module, download this repository inside the `js` folder at the root of your view directory
and add something like this to your `custom.js` (or `main.js`) file:

```JavaScript
import './ocls-clear-display';

var app = angular.module('viewCustom', ['angularLoad', 'oclsClearDisplay']);
```

You will also need to add the CSS snippet included to your `custom.css` file.