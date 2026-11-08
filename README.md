# Flow Studio

A dependency-free browser diagram editor. Open `index.html`, or serve the repository root with `python3 -m http.server 8080`.

Run `npm run build` to copy the app into `dist/` for static hosting. The Sites hosting configuration uses that output directory.

Drag shapes onto the canvas, connect them with the Connect tool, edit labels and appearance in the Design panel, and drag the lower-right handle to resize. Double-click a connection to label it. Supports undo/redo, editable JSON save/open, browser autosave, and PNG, PDF, and SVG export. PDF exports embed a high-resolution raster image.

Diagrams are saved locally in the current browser; use Save file to transfer an editable copy between devices.
