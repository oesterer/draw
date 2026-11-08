# Flow Studio

A dependency-free browser diagram editor. Open `index.html`, or serve the repository root with `python3 -m http.server 8080`.

Run `npm run build` to copy the app into `dist/` for static hosting. The Sites hosting configuration uses that output directory.

Drag shapes onto the canvas, connect them with the Connect tool, double-click shapes or connections to edit text directly on the canvas, and edit appearance in the Design panel, and drag the lower-right handle to resize. Double-click a connection to label it. Supports undo/redo, editable JSON save/open, browser autosave, and PNG, PDF, and SVG export. PDF exports embed a high-resolution raster image.

Diagrams are saved locally in the current browser; use Save file to transfer an editable copy between devices.

Inline text editing: Enter saves, Shift+Enter adds a new line, Escape cancels, and clicking outside saves.

Lucidchart JSON imports: use **Open** and select a Lucidchart JSON export (such as `ScurryUserFlows.json`). Shapes, text, and connections become editable. These data exports do not contain original coordinates or styling, so the importer generates a new layout. Multiple pages are combined on one canvas. Connections without matching shapes are skipped and reported. Use the mouse wheel to pan, Shift+wheel to pan horizontally, Ctrl/Cmd+wheel to zoom, and Fit to show the entire diagram.
