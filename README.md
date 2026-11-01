# MapTool Area Screenshot

A Chromium Manifest V3 extension that captures a configured rectangle from the
currently visible webpage when you press **P**. It saves PNG screenshots
without opening a save dialog, under the browser's Downloads folder in
`Maptool/`.

## Install

1. Open `chrome://extensions` (or the equivalent page in another Chromium browser).
2. Enable **Developer mode** and choose **Load unpacked**.
3. Select this project folder.
4. Click the extension's toolbar button and choose **Select area on page**.
   Drag over the webpage to set the screenshot area; press Esc to cancel. You
   can also enter the area's X, Y, width, and height in CSS pixels manually.
5. Press **P** while viewing a webpage to save a screenshot.

The default area is 800 × 600 pixels at the webpage's top-left corner. Pressing
P while an input, text area, select, or editable region has focus will not take
a screenshot. Screenshots are limited to the visible webpage (not browser
toolbars or other applications); browser-internal pages cannot be captured.
The extension requests access to all webpages so its P key handler can work
across sites.
